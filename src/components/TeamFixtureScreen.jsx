import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

const STRING_COUNT = 5;

function buildInitialStrings(fixture, teamA, teamB) {
  // For a completed fixture being edited, seed from official result
  const source = fixture.status === 'completed'
    ? fixture.result?.string_results
    : fixture.draft_string_results;

  return Array.from({ length: STRING_COUNT }, (_, i) => {
    const sn = i + 1;
    const aPlayer = teamA?.roster?.find((r) => r.string_number === sn)?.player_name || '';
    const bPlayer = teamB?.roster?.find((r) => r.string_number === sn)?.player_name || '';
    const saved = source?.find((s) => s.string_number === sn);

    if (saved) {
      return {
        string_number: sn,
        team_a_games: saved.team_a_games?.toString() ?? '',
        team_b_games: saved.team_b_games?.toString() ?? '',
        team_a_player: saved.team_a_player || aPlayer,
        team_b_player: saved.team_b_player || bPlayer,
        persisted: true,
      };
    }

    return {
      string_number: sn,
      team_a_games: '',
      team_b_games: '',
      team_a_player: aPlayer,
      team_b_player: bPlayer,
      persisted: false,
    };
  });
}

export default function TeamFixtureScreen({ fixture, teamA, teamB, tournamentId, passphrase, onBack, onResultSaved }) {
  const isEdit = fixture.status === 'completed' || fixture.status === 'walkover';

  const [strings, setStrings] = useState(() => buildInitialStrings(fixture, teamA, teamB));
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingString, setSavingString] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const totals = useMemo(() => {
    let a = 0, b = 0;
    strings.forEach((s) => {
      const av = parseInt(s.team_a_games, 10);
      const bv = parseInt(s.team_b_games, 10);
      if (!isNaN(av)) a += av;
      if (!isNaN(bv)) b += bv;
    });
    return { a, b };
  }, [strings]);

  const winner = totals.a > totals.b ? 'a' : totals.b > totals.a ? 'b' : null;
  const persistedStrings = strings.filter((s) => s.persisted);
  const allPersisted = persistedStrings.length === STRING_COUNT;
  const canComplete = allPersisted && winner !== null;

  const openRow = (idx) => {
    setExpandedIdx(idx);
    setDraft({
      team_a_games: strings[idx].team_a_games,
      team_b_games: strings[idx].team_b_games,
      team_a_player: strings[idx].team_a_player,
      team_b_player: strings[idx].team_b_player,
    });
    setError(null);
  };

  const saveRow = async (idx) => {
    if (draft.team_a_games === '' || draft.team_b_games === '') return;
    setSavingString(true);
    setError(null);

    // Merge draft into strings optimistically
    const newStrings = strings.map((s, i) =>
      i === idx ? { ...s, ...draft, persisted: true } : s
    );
    setStrings(newStrings);
    setExpandedIdx(null);
    setDraft(null);

    // Persist only scored strings to the backend
    const toSave = newStrings
      .filter((s) => s.team_a_games !== '' && s.team_b_games !== '')
      .map((s) => ({
        string_number: s.string_number,
        team_a_games: parseInt(s.team_a_games, 10),
        team_b_games: parseInt(s.team_b_games, 10),
        team_a_player: s.team_a_player || undefined,
        team_b_player: s.team_b_player || undefined,
      }));

    try {
      await api.saveDraftFixtureStrings(tournamentId, fixture._id, toSave);
    } catch (err) {
      // Roll back the persisted flag so the user knows it didn't save
      setStrings((prev) =>
        prev.map((s, i) => i === idx ? { ...s, persisted: false } : s)
      );
      setError(`Failed to save string ${idx + 1}: ${err.message}`);
    } finally {
      setSavingString(false);
    }
  };

  const handleComplete = async () => {
    if (!canComplete) return;
    setSubmitting(true);
    setError(null);

    const stringResults = strings.map((s) => ({
      string_number: s.string_number,
      team_a_games: parseInt(s.team_a_games, 10),
      team_b_games: parseInt(s.team_b_games, 10),
      team_a_player: s.team_a_player || undefined,
      team_b_player: s.team_b_player || undefined,
    }));

    const winnerTeam = winner === 'a' ? teamA : teamB;
    const loserTeam = winner === 'a' ? teamB : teamA;

    const result = {
      winner_id: winnerTeam._id,
      loser_id: loserTeam._id,
      winner_name: winnerTeam.name,
      loser_name: loserTeam.name,
      team_a_games_total: totals.a,
      team_b_games_total: totals.b,
      string_results: stringResults,
    };

    try {
      if (isEdit) {
        await api.editTeamFixtureResult(tournamentId, fixture._id, result, passphrase);
      } else {
        await api.submitTeamFixtureResult(tournamentId, fixture._id, result);
      }
      onResultSaved();
    } catch (err) {
      setError(err.message || 'Failed to complete fixture');
      setSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      {/* Header */}
      <div className='bg-white shadow-sm shrink-0'>
        <div className='px-4 lg:px-8 py-4 flex items-center gap-3'>
          <button onClick={onBack} className='p-1.5 text-gray-500 hover:text-gray-700 shrink-0'>
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
          </button>
          <div className='min-w-0'>
            <p className='text-xs text-gray-500 uppercase tracking-wide mb-0.5'>
              {isEdit ? 'Edit Fixture' : 'Fixture'}
            </p>
            <h1 className='text-base lg:text-xl font-bold text-gray-900 truncate'>
              {teamA?.name} <span className='text-gray-400 font-normal'>vs</span> {teamB?.name}
            </h1>
          </div>
          {/* Progress indicator */}
          <div className='ml-auto shrink-0 text-sm font-medium text-gray-500'>
            {persistedStrings.length}/{STRING_COUNT}
          </div>
        </div>
      </div>

      {/* String list */}
      <div className='flex-1 px-4 lg:px-8 py-6 space-y-3 max-w-2xl mx-auto w-full'>
        {/* Column labels */}
        <div className='grid grid-cols-[2rem_1fr_auto_1fr_1.5rem] gap-2 px-1 text-xs font-semibold text-gray-400 uppercase tracking-wide'>
          <span></span>
          <span>{teamA?.name}</span>
          <span className='text-center px-6'>Score</span>
          <span className='text-right'>{teamB?.name}</span>
          <span></span>
        </div>

        {strings.map((row, idx) => {
          const aVal = parseInt(row.team_a_games, 10);
          const bVal = parseInt(row.team_b_games, 10);
          const hasResult = !isNaN(aVal) && !isNaN(bVal);
          const isOpen = expandedIdx === idx;

          return (
            <div
              key={row.string_number}
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${isOpen ? 'ring-2 ring-blue-300' : ''}`}
            >
              {/* Summary row */}
              <button
                onClick={() => {
                  if (isOpen) {
                    setExpandedIdx(null);
                    setDraft(null);
                  } else {
                    openRow(idx);
                  }
                }}
                className={`w-full grid grid-cols-[2rem_1fr_auto_1fr_1.5rem] gap-2 items-center px-4 py-3 text-left transition-colors ${
                  hasResult ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className='text-xs font-bold text-gray-400'>S{row.string_number}</span>

                <span className='text-sm truncate text-gray-600'>
                  {row.team_a_player || <span className='italic text-gray-300'>Player</span>}
                </span>

                <span className='flex items-center gap-1 px-2'>
                  {hasResult ? (
                    <>
                      <span className='text-base font-bold tabular-nums w-5 text-center text-gray-700'>{aVal}</span>
                      <span className='text-gray-300 text-xs'>–</span>
                      <span className='text-base font-bold tabular-nums w-5 text-center text-gray-700'>{bVal}</span>
                    </>
                  ) : (
                    <span className='text-xs text-blue-500 font-medium whitespace-nowrap'>Enter →</span>
                  )}
                </span>

                <span className='text-sm truncate text-right text-gray-600'>
                  {row.team_b_player || <span className='italic text-gray-300'>Player</span>}
                </span>

                {/* Saved / chevron indicator */}
                <span className='flex justify-end'>
                  {row.persisted ? (
                    <svg className='w-4 h-4 text-green-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M5 13l4 4L19 7' />
                    </svg>
                  ) : (
                    <svg className={`w-4 h-4 text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                    </svg>
                  )}
                </span>
              </button>

              {/* Expanded editor */}
              {isOpen && draft && (
                <div className='border-t bg-white px-4 py-4 space-y-4'>
                  {/* Player names */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs text-gray-500 mb-1'>{teamA?.name} Player</label>
                      <input
                        type='text'
                        value={draft.team_a_player}
                        onChange={(e) => setDraft((d) => ({ ...d, team_a_player: e.target.value }))}
                        placeholder='Player name'
                        className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                      />
                    </div>
                    <div>
                      <label className='block text-xs text-gray-500 mb-1 text-right'>{teamB?.name} Player</label>
                      <input
                        type='text'
                        value={draft.team_b_player}
                        onChange={(e) => setDraft((d) => ({ ...d, team_b_player: e.target.value }))}
                        placeholder='Player name'
                        className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 text-right'
                      />
                    </div>
                  </div>

                  {/* Score inputs */}
                  <div className='flex items-end justify-center gap-4'>
                    <div className='flex flex-col items-center gap-1'>
                      <span className='text-xs text-gray-500 truncate max-w-24'>{teamA?.name}</span>
                      <input
                        type='number'
                        min='0'
                        max='9'
                        value={draft.team_a_games}
                        onChange={(e) => setDraft((d) => ({ ...d, team_a_games: e.target.value }))}
                        className='w-20 text-center text-3xl font-bold border-2 border-gray-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400'
                      />
                    </div>
                    <span className='text-2xl text-gray-300 pb-3'>–</span>
                    <div className='flex flex-col items-center gap-1'>
                      <span className='text-xs text-gray-500 truncate max-w-24'>{teamB?.name}</span>
                      <input
                        type='number'
                        min='0'
                        max='9'
                        value={draft.team_b_games}
                        onChange={(e) => setDraft((d) => ({ ...d, team_b_games: e.target.value }))}
                        className='w-20 text-center text-3xl font-bold border-2 border-gray-200 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400'
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => saveRow(idx)}
                    disabled={draft.team_a_games === '' || draft.team_b_games === '' || savingString}
                    className='w-full py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                  >
                    {savingString ? 'Saving…' : `Save String ${row.string_number}`}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!allPersisted && persistedStrings.length > 0 && (
          <p className='text-center text-xs text-gray-400 pt-1'>
            {STRING_COUNT - persistedStrings.length} string{STRING_COUNT - persistedStrings.length !== 1 ? 's' : ''} still to enter
          </p>
        )}
        {persistedStrings.length === 0 && (
          <p className='text-center text-xs text-gray-400 pt-1'>Tap any string above to enter its result</p>
        )}
      </div>

      {/* Footer */}
      <div className='bg-white border-t px-4 lg:px-8 py-4 shrink-0'>
        <div className='max-w-2xl mx-auto space-y-3'>
          {/* Running total */}
          <div className='flex items-center justify-between'>
            <span className={`font-bold text-lg truncate flex-1 ${winner === 'a' ? 'text-green-600' : 'text-gray-700'}`}>
              {teamA?.name}
            </span>
            <span className='text-2xl font-bold tabular-nums tracking-tight mx-4 shrink-0'>
              <span className={winner === 'a' ? 'text-green-600' : ''}>{totals.a}</span>
              <span className='text-gray-300 mx-2'>–</span>
              <span className={winner === 'b' ? 'text-green-600' : ''}>{totals.b}</span>
            </span>
            <span className={`font-bold text-lg truncate flex-1 text-right ${winner === 'b' ? 'text-green-600' : 'text-gray-700'}`}>
              {teamB?.name}
            </span>
          </div>

          {winner && allPersisted && (
            <p className='text-center text-sm text-green-700 font-medium'>
              {winner === 'a' ? teamA?.name : teamB?.name} win
            </p>
          )}

          {error && <p className='text-center text-sm text-red-600'>{error}</p>}

          <button
            onClick={handleComplete}
            disabled={!canComplete || submitting}
            className='w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
          >
            {submitting ? 'Saving…' : isEdit ? 'Update Fixture' : 'Complete Fixture'}
          </button>

          {!allPersisted && (
            <p className='text-center text-xs text-gray-400'>
              Save all {STRING_COUNT} strings to complete the fixture
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

TeamFixtureScreen.propTypes = {
  fixture: PropTypes.object.isRequired,
  teamA: PropTypes.object.isRequired,
  teamB: PropTypes.object.isRequired,
  tournamentId: PropTypes.string.isRequired,
  passphrase: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  onResultSaved: PropTypes.func.isRequired,
};
