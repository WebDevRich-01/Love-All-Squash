import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

const STRING_COUNT = 5;

function buildInitialStrings(fixture, teamA, teamB) {
  const source =
    fixture.status === 'completed'
      ? fixture.result?.string_results
      : fixture.draft_string_results;

  return Array.from({ length: STRING_COUNT }, (_, i) => {
    const sn = i + 1;
    const aPlayer = teamA?.roster?.find((r) => r.string_number === sn)?.player_name || '';
    const bPlayer = teamB?.roster?.find((r) => r.string_number === sn)?.player_name || '';
    const saved = source?.find((s) => s.string_number === sn);

    if (saved) {
      const games = saved.game_scores?.length
        ? saved.game_scores.map((g) => ({ a: String(g.team_a ?? ''), b: String(g.team_b ?? '') }))
        : null; // null = legacy record with counts but no per-game breakdown

      return {
        string_number: sn,
        team_a_player: saved.team_a_player || aPlayer,
        team_b_player: saved.team_b_player || bPlayer,
        games,
        team_a_games: saved.team_a_games ?? 0,
        team_b_games: saved.team_b_games ?? 0,
        persisted: true,
      };
    }

    return {
      string_number: sn,
      team_a_player: aPlayer,
      team_b_player: bPlayer,
      games: [],
      team_a_games: 0,
      team_b_games: 0,
      persisted: false,
    };
  });
}

function computeFromGames(games) {
  let a = 0, b = 0;
  (games || []).forEach(({ a: av, b: bv }) => {
    const ai = parseInt(av, 10);
    const bi = parseInt(bv, 10);
    if (!isNaN(ai) && !isNaN(bi)) {
      if (ai > bi) a++;
      else if (bi > ai) b++;
    }
  });
  return { a, b };
}

export default function TeamFixtureScreen({
  fixture,
  teamA,
  teamB,
  tournamentId,
  passphrase,
  onBack,
  onResultSaved,
}) {
  const isEdit = fixture.status === 'completed' || fixture.status === 'walkover';

  const [strings, setStrings] = useState(() => buildInitialStrings(fixture, teamA, teamB));
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [draft, setDraft] = useState(null); // { team_a_player, team_b_player, games: [{a,b}] }
  const [savingString, setSavingString] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const totals = useMemo(() => {
    let a = 0, b = 0;
    strings.forEach((s) => {
      if (!s.persisted) return;
      if (s.games?.length) {
        const { a: ga, b: gb } = computeFromGames(s.games);
        a += ga;
        b += gb;
      } else {
        a += s.team_a_games || 0;
        b += s.team_b_games || 0;
      }
    });
    return { a, b };
  }, [strings]);

  const winner = totals.a > totals.b ? 'a' : totals.b > totals.a ? 'b' : null;
  const persistedStrings = strings.filter((s) => s.persisted);
  const allPersisted = persistedStrings.length === STRING_COUNT;
  const canComplete = allPersisted && winner !== null;

  const openRow = (idx) => {
    const s = strings[idx];
    const games = s.games?.length ? [...s.games] : [{ a: '', b: '' }];
    setExpandedIdx(idx);
    setDraft({ team_a_player: s.team_a_player, team_b_player: s.team_b_player, games });
    setError(null);
  };

  const addGame = () => setDraft((d) => ({ ...d, games: [...d.games, { a: '', b: '' }] }));

  const removeGame = (gIdx) =>
    setDraft((d) => ({ ...d, games: d.games.filter((_, i) => i !== gIdx) }));

  const updateGame = (gIdx, field, value) =>
    setDraft((d) => ({
      ...d,
      games: d.games.map((g, i) => (i === gIdx ? { ...g, [field]: value } : g)),
    }));

  const saveRow = async (idx) => {
    const filledGames = draft.games.filter(({ a, b }) => a !== '' && b !== '');
    if (filledGames.length === 0) return;

    setSavingString(true);
    setError(null);

    const { a: ta, b: tb } = computeFromGames(filledGames);
    const newString = {
      ...strings[idx],
      ...draft,
      games: filledGames,
      team_a_games: ta,
      team_b_games: tb,
      persisted: true,
    };
    const newStrings = strings.map((s, i) => (i === idx ? newString : s));
    setStrings(newStrings);
    setExpandedIdx(null);
    setDraft(null);

    const toSave = newStrings
      .filter((s) => s.persisted)
      .map((s) => ({
        string_number: s.string_number,
        team_a_games: s.team_a_games,
        team_b_games: s.team_b_games,
        team_a_player: s.team_a_player || undefined,
        team_b_player: s.team_b_player || undefined,
        game_scores: (s.games || []).map((g) => ({
          team_a: parseInt(g.a, 10),
          team_b: parseInt(g.b, 10),
        })),
      }));

    try {
      await api.saveDraftFixtureStrings(tournamentId, fixture._id, toSave);
    } catch (err) {
      setStrings((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, persisted: false } : s))
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
      team_a_games: s.team_a_games,
      team_b_games: s.team_b_games,
      team_a_player: s.team_a_player || undefined,
      team_b_player: s.team_b_player || undefined,
      game_scores: (s.games || []).map((g) => ({
        team_a: parseInt(g.a, 10),
        team_b: parseInt(g.b, 10),
      })),
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
        <div className='max-w-2xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-3'>
          <button onClick={onBack} className='p-1.5 text-gray-500 hover:text-gray-700 shrink-0'>
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
          </button>
          <div className='flex-1 min-w-0'>
            <p className='text-xs text-gray-500 uppercase tracking-wide mb-0.5'>
              {isEdit ? 'Edit Fixture' : 'Fixture'}
            </p>
            <div className='flex items-center gap-2'>
              <span className='font-bold text-base text-gray-900 truncate flex-1'>{teamA?.name}</span>
              <span className='text-gray-400 font-normal shrink-0 text-sm'>vs</span>
              <span className='font-bold text-base text-gray-900 truncate flex-1 text-right'>
                {teamB?.name}
              </span>
            </div>
          </div>
          <div className='shrink-0 text-sm font-medium text-gray-500'>
            {persistedStrings.length}/{STRING_COUNT}
          </div>
        </div>
      </div>

      {/* String list */}
      <div className='flex-1 px-4 lg:px-8 py-6 space-y-3 max-w-2xl mx-auto w-full'>
        {strings.map((row, idx) => {
          const isOpen = expandedIdx === idx;

          // Compute games won from stored data
          const { a: ga, b: gb } =
            row.games?.length
              ? computeFromGames(row.games)
              : { a: row.team_a_games || 0, b: row.team_b_games || 0 };

          // Format individual game scores for display e.g. "15–10, 11–15"
          const gameScoreStr = row.games?.length
            ? row.games.map((g) => `${g.a}–${g.b}`).join(', ')
            : null;

          // Live totals while editor is open
          const draftTotals =
            isOpen && draft
              ? computeFromGames(draft.games.filter((g) => g.a !== '' && g.b !== ''))
              : null;

          return (
            <div
              key={row.string_number}
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${isOpen ? 'ring-2 ring-blue-300' : ''}`}
            >
              {/* Collapsed view */}
              {!isOpen && (
                <div className='px-4 py-4'>
                  {/* String number + player names row */}
                  <div className='flex items-center gap-3 mb-3'>
                    <span className='text-xs font-bold text-gray-400 shrink-0 w-6'>
                      S{row.string_number}
                    </span>
                    <div className='flex-1 flex items-center gap-2 min-w-0'>
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1'>
                        {row.team_a_player || (
                          <span className='text-gray-300 font-normal italic'>Player</span>
                        )}
                      </span>
                      {row.persisted ? (
                        <span className='text-sm font-bold text-gray-700 shrink-0 tabular-nums'>
                          {ga}–{gb}
                        </span>
                      ) : (
                        <span className='text-xs text-gray-300 shrink-0'>vs</span>
                      )}
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1 text-right'>
                        {row.team_b_player || (
                          <span className='text-gray-300 font-normal italic'>Player</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Result summary or action buttons */}
                  {row.persisted ? (
                    <div className='flex items-center justify-between gap-3 pl-9'>
                      <div className='flex-1 min-w-0'>
                        {gameScoreStr ? (
                          <p className='text-xs text-gray-400 leading-relaxed'>{gameScoreStr}</p>
                        ) : (
                          <p className='text-xs text-gray-400'>{ga} games to {gb}</p>
                        )}
                      </div>
                      <button
                        onClick={() => openRow(idx)}
                        className='text-xs font-medium text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 px-3 py-1.5 rounded-lg shrink-0 transition-colors'
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className='flex gap-2 pl-9'>
                      <button
                        className='flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                      >
                        Score match
                      </button>
                      <button
                        onClick={() => openRow(idx)}
                        className='flex-1 py-2.5 text-sm font-semibold border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors'
                      >
                        Enter result
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Expanded editor */}
              {isOpen && draft && (
                <div className='px-4 py-4 space-y-5'>
                  {/* String label + player names (collapsed summary while editing) */}
                  <div className='flex items-center gap-3'>
                    <span className='text-xs font-bold text-gray-400 shrink-0 w-6'>
                      S{row.string_number}
                    </span>
                    <div className='flex-1 flex items-center gap-2 min-w-0'>
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1'>
                        {draft.team_a_player || teamA?.name}
                      </span>
                      <span className='text-gray-300 text-xs shrink-0'>vs</span>
                      <span className='text-sm font-semibold text-gray-800 truncate flex-1 text-right'>
                        {draft.team_b_player || teamB?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => { setExpandedIdx(null); setDraft(null); }}
                      className='text-gray-300 hover:text-gray-500 shrink-0'
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                      </svg>
                    </button>
                  </div>

                  {/* Player name inputs */}
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs text-gray-500 mb-1'>{teamA?.name} player</label>
                      <input
                        type='text'
                        value={draft.team_a_player}
                        onChange={(e) => setDraft((d) => ({ ...d, team_a_player: e.target.value }))}
                        placeholder='Player name'
                        className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                      />
                    </div>
                    <div>
                      <label className='block text-xs text-gray-500 mb-1 text-right'>
                        {teamB?.name} player
                      </label>
                      <input
                        type='text'
                        value={draft.team_b_player}
                        onChange={(e) => setDraft((d) => ({ ...d, team_b_player: e.target.value }))}
                        placeholder='Player name'
                        className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 text-right'
                      />
                    </div>
                  </div>

                  {/* Per-game score inputs */}
                  <div>
                    <div className='flex items-baseline justify-between mb-2'>
                      <span className='text-xs font-semibold text-gray-500 uppercase tracking-wide'>
                        Game scores
                      </span>
                      <span className='text-xs text-gray-400'>highest score wins</span>
                    </div>
                    <div className='space-y-2'>
                      {draft.games.map((g, gIdx) => {
                        const ai = parseInt(g.a, 10);
                        const bi = parseInt(g.b, 10);
                        const gameWinner =
                          g.a !== '' && g.b !== '' && !isNaN(ai) && !isNaN(bi)
                            ? ai > bi
                              ? teamA?.name
                              : bi > ai
                              ? teamB?.name
                              : null
                            : null;

                        return (
                          <div key={gIdx} className='flex items-center gap-3'>
                            <span className='text-xs text-gray-400 w-14 shrink-0'>
                              Game {gIdx + 1}
                            </span>
                            <div className='flex items-center gap-2 flex-1'>
                              <input
                                type='number'
                                min='0'
                                value={g.a}
                                onChange={(e) => updateGame(gIdx, 'a', e.target.value)}
                                className='w-16 text-center text-lg font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                              />
                              <span className='text-gray-300'>–</span>
                              <input
                                type='number'
                                min='0'
                                value={g.b}
                                onChange={(e) => updateGame(gIdx, 'b', e.target.value)}
                                className='w-16 text-center text-lg font-bold border border-gray-200 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                              />
                              {gameWinner && (
                                <span className='text-xs text-gray-500 truncate'>
                                  {gameWinner} wins
                                </span>
                              )}
                            </div>
                            {draft.games.length > 1 && (
                              <button
                                onClick={() => removeGame(gIdx)}
                                className='text-gray-300 hover:text-red-400 transition-colors shrink-0'
                              >
                                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                                </svg>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      onClick={addGame}
                      className='mt-2 text-sm text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1'
                    >
                      <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                      </svg>
                      Add game
                    </button>
                  </div>

                  {/* Live running total */}
                  {draftTotals && (draftTotals.a > 0 || draftTotals.b > 0) && (
                    <div className='flex items-center justify-center gap-3 py-1 bg-gray-50 rounded-lg'>
                      <span className='text-sm text-gray-500 truncate'>{teamA?.name}</span>
                      <span className='text-xl font-bold tabular-nums text-gray-800'>
                        {draftTotals.a}–{draftTotals.b}
                      </span>
                      <span className='text-sm text-gray-500 truncate'>{teamB?.name}</span>
                    </div>
                  )}

                  <button
                    onClick={() => saveRow(idx)}
                    disabled={
                      draft.games.filter((g) => g.a !== '' && g.b !== '').length === 0 ||
                      savingString
                    }
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
            {STRING_COUNT - persistedStrings.length} string
            {STRING_COUNT - persistedStrings.length !== 1 ? 's' : ''} still to enter
          </p>
        )}
        {persistedStrings.length === 0 && (
          <p className='text-center text-xs text-gray-400 pt-1'>
            Tap a string above to score or enter a result
          </p>
        )}
      </div>

      {/* Footer */}
      <div className='bg-white border-t px-4 lg:px-8 py-4 shrink-0'>
        <div className='max-w-2xl mx-auto space-y-3'>
          <div className='flex items-center justify-between'>
            <span
              className={`font-bold text-lg truncate flex-1 ${
                winner === 'a' ? 'text-green-600' : 'text-gray-700'
              }`}
            >
              {teamA?.name}
            </span>
            <span className='text-2xl font-bold tabular-nums tracking-tight mx-4 shrink-0'>
              <span className={winner === 'a' ? 'text-green-600' : ''}>{totals.a}</span>
              <span className='text-gray-300 mx-2'>–</span>
              <span className={winner === 'b' ? 'text-green-600' : ''}>{totals.b}</span>
            </span>
            <span
              className={`font-bold text-lg truncate flex-1 text-right ${
                winner === 'b' ? 'text-green-600' : 'text-gray-700'
              }`}
            >
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
