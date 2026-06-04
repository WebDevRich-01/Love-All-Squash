import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

const STRING_COUNT = 5;

function initialStrings(fixture, teamA, teamB, isEdit) {
  return Array.from({ length: STRING_COUNT }, (_, i) => {
    const sn = i + 1;
    const aPlayer = teamA?.roster?.find((r) => r.string_number === sn)?.player_name || '';
    const bPlayer = teamB?.roster?.find((r) => r.string_number === sn)?.player_name || '';

    if (isEdit && fixture.result?.string_results) {
      const existing = fixture.result.string_results.find((s) => s.string_number === sn);
      if (existing) {
        return {
          string_number: sn,
          team_a_games: existing.team_a_games?.toString() ?? '',
          team_b_games: existing.team_b_games?.toString() ?? '',
          team_a_player: existing.team_a_player || aPlayer,
          team_b_player: existing.team_b_player || bPlayer,
        };
      }
    }

    return { string_number: sn, team_a_games: '', team_b_games: '', team_a_player: aPlayer, team_b_player: bPlayer };
  });
}

export default function TeamFixtureModal({ fixture, teamA, teamB, tournamentId, passphrase, isEdit, onClose, onResultSaved }) {
  const [strings, setStrings] = useState(() => initialStrings(fixture, teamA, teamB, isEdit));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Running totals
  const totals = useMemo(() => {
    let aTotal = 0, bTotal = 0;
    strings.forEach(({ team_a_games, team_b_games }) => {
      const a = parseInt(team_a_games, 10);
      const b = parseInt(team_b_games, 10);
      if (!isNaN(a)) aTotal += a;
      if (!isNaN(b)) bTotal += b;
    });
    return { a: aTotal, b: bTotal };
  }, [strings]);

  const winner = totals.a > totals.b ? 'a' : totals.b > totals.a ? 'b' : null;

  const filledStrings = strings.filter(
    (s) => s.team_a_games !== '' && s.team_b_games !== ''
  );
  const canSubmit = filledStrings.length > 0 && winner !== null;

  const updateString = (idx, field, value) => {
    setStrings((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const validStrings = filledStrings.map((s) => ({
      string_number: s.string_number,
      team_a_games: parseInt(s.team_a_games, 10),
      team_b_games: parseInt(s.team_b_games, 10),
      team_a_player: s.team_a_player || undefined,
      team_b_player: s.team_b_player || undefined,
    }));

    const winnerParticipant = winner === 'a' ? teamA : teamB;
    const loserParticipant = winner === 'a' ? teamB : teamA;

    const result = {
      winner_id: winnerParticipant._id,
      loser_id: loserParticipant._id,
      winner_name: winnerParticipant.name,
      loser_name: loserParticipant.name,
      team_a_games_total: totals.a,
      team_b_games_total: totals.b,
      string_results: validStrings,
    };

    try {
      if (isEdit) {
        await api.editTeamFixtureResult(tournamentId, fixture._id, result);
      } else {
        await api.submitTeamFixtureResult(tournamentId, fixture._id, result);
      }
      onResultSaved();
    } catch (err) {
      setError(err.message || 'Failed to save result');
      setSubmitting(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
      <div className='bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg flex flex-col max-h-[92vh] overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b shrink-0'>
          <div className='flex-1 min-w-0'>
            <p className='text-xs text-gray-500 uppercase tracking-wide mb-0.5'>{isEdit ? 'Edit Result' : 'Team Fixture'}</p>
            <h2 className='font-bold text-gray-900 text-base truncate'>
              {teamA?.name} <span className='text-gray-400 font-normal'>vs</span> {teamB?.name}
            </h2>
          </div>
          <button onClick={onClose} className='ml-3 text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0'>
            ×
          </button>
        </div>

        {/* Score grid */}
        <div className='overflow-y-auto flex-1 p-4'>
          {/* Column headers */}
          <div className='grid grid-cols-[2rem_1fr_2.5rem_0.5rem_2.5rem_1fr] gap-x-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide'>
            <span></span>
            <span className='truncate'>{teamA?.name}</span>
            <span className='text-center'>Gms</span>
            <span></span>
            <span className='text-center'>Gms</span>
            <span className='truncate text-right'>{teamB?.name}</span>
          </div>

          <div className='space-y-2'>
            {strings.map((row, idx) => {
              const aVal = parseInt(row.team_a_games, 10);
              const bVal = parseInt(row.team_b_games, 10);
              const hasResult = !isNaN(aVal) && !isNaN(bVal);
              const aWins = hasResult && aVal > bVal;
              const bWins = hasResult && bVal > aVal;

              return (
                <div
                  key={row.string_number}
                  className={`grid grid-cols-[2rem_1fr_2.5rem_0.5rem_2.5rem_1fr] gap-x-2 items-center rounded-lg px-2 py-1.5 transition-colors ${
                    aWins ? 'bg-green-50' : bWins ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <span className='text-xs font-bold text-gray-400 text-center'>S{row.string_number}</span>

                  {/* Team A player name */}
                  <input
                    type='text'
                    value={row.team_a_player}
                    onChange={(e) => updateString(idx, 'team_a_player', e.target.value)}
                    placeholder='Player'
                    className='text-sm border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-full min-w-0'
                  />

                  {/* Team A games */}
                  <input
                    type='number'
                    min='0'
                    max='5'
                    value={row.team_a_games}
                    onChange={(e) => updateString(idx, 'team_a_games', e.target.value)}
                    className={`text-center font-bold text-base border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-full ${
                      aWins ? 'border-green-400 bg-green-100' : 'border-gray-300'
                    }`}
                  />

                  <span className='text-center text-gray-300 text-xs'>–</span>

                  {/* Team B games */}
                  <input
                    type='number'
                    min='0'
                    max='5'
                    value={row.team_b_games}
                    onChange={(e) => updateString(idx, 'team_b_games', e.target.value)}
                    className={`text-center font-bold text-base border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-full ${
                      bWins ? 'border-green-400 bg-green-100' : 'border-gray-300'
                    }`}
                  />

                  {/* Team B player name */}
                  <input
                    type='text'
                    value={row.team_b_player}
                    onChange={(e) => updateString(idx, 'team_b_player', e.target.value)}
                    placeholder='Player'
                    className='text-sm border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 w-full min-w-0 text-right'
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals + result */}
        <div className='border-t p-4 shrink-0 space-y-3'>
          <div className='flex items-center justify-between text-lg font-bold'>
            <span className={`${winner === 'a' ? 'text-green-600' : 'text-gray-700'}`}>
              {teamA?.name}
            </span>
            <span className='text-2xl tabular-nums tracking-tight'>
              <span className={winner === 'a' ? 'text-green-600' : ''}>{totals.a}</span>
              <span className='text-gray-300 mx-1'>–</span>
              <span className={winner === 'b' ? 'text-green-600' : ''}>{totals.b}</span>
            </span>
            <span className={`text-right ${winner === 'b' ? 'text-green-600' : 'text-gray-700'}`}>
              {teamB?.name}
            </span>
          </div>

          {winner && (
            <p className='text-center text-sm text-green-700 font-medium'>
              {winner === 'a' ? teamA?.name : teamB?.name} win
            </p>
          )}

          {error && (
            <p className='text-center text-sm text-red-600'>{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className='w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
          >
            {submitting ? 'Saving…' : isEdit ? 'Update Result' : 'Save Result'}
          </button>
        </div>
      </div>
    </div>
  );
}

TeamFixtureModal.propTypes = {
  fixture: PropTypes.object.isRequired,
  teamA: PropTypes.object.isRequired,
  teamB: PropTypes.object.isRequired,
  tournamentId: PropTypes.string.isRequired,
  passphrase: PropTypes.string,
  isEdit: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onResultSaved: PropTypes.func.isRequired,
};
