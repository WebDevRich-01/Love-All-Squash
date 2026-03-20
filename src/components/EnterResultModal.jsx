import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

const HandicapRow = ({ name, score, onIncrement, onDecrement }) => (
  <div className='flex items-center justify-between'>
    <span className='text-sm text-gray-600 flex-1'>{name}</span>
    <div className='flex items-center gap-2'>
      <button type='button' onClick={onDecrement}
        className='w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors flex items-center justify-center'>−</button>
      <div className={`w-12 h-8 flex items-center justify-center rounded-lg text-sm font-bold border ${
        score > 0 ? 'border-green-400 text-green-600 bg-green-50' :
        score < 0 ? 'border-red-400 text-red-600 bg-red-50' :
        'border-gray-200 text-gray-500 bg-white'
      }`}>
        {score > 0 ? `+${score}` : score}
      </div>
      <button type='button' onClick={onIncrement}
        className='w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold transition-colors flex items-center justify-center'>+</button>
    </div>
  </div>
);

HandicapRow.propTypes = {
  name: PropTypes.string.isRequired,
  score: PropTypes.number.isRequired,
  onIncrement: PropTypes.func.isRequired,
  onDecrement: PropTypes.func.isRequired,
};

const EnterResultModal = ({ match, tournamentId, matchConfig = {}, isHandicap = false, onSave, onCancel }) => {
  const bestOf = matchConfig.best_of || 5;
  const player1Name = match.participant_a?.name || 'Player 1';
  const player2Name = match.participant_b?.name || 'Player 2';
  const player1Id = match.participant_a?.participant_id;
  const player2Id = match.participant_b?.participant_id;

  const [games, setGames] = useState(Array.from({ length: bestOf }, () => ({ p1: '', p2: '' })));
  const [p1Start, setP1Start] = useState(0);
  const [p2Start, setP2Start] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const addGame = () => {
    if (games.length < bestOf) setGames([...games, { p1: '', p2: '' }]);
  };

  const removeGame = (index) => {
    if (games.length > 1) setGames(games.filter((_, i) => i !== index));
  };

  const updateScore = (index, player, value) => {
    const updated = [...games];
    updated[index] = { ...updated[index], [player]: value };
    setGames(updated);
  };

  // Derive winner from entered scores — null if incomplete or tied
  const getResult = () => {
    // Only include rows where both scores have been filled in
    const validGames = games.filter((g) => g.p1 !== '' && g.p2 !== '');
    if (validGames.length === 0) return null;

    let p1Wins = 0;
    let p2Wins = 0;
    for (const g of validGames) {
      const s1 = parseInt(g.p1, 10);
      const s2 = parseInt(g.p2, 10);
      if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) return null;
      if (s1 === s2) return null; // no draw in squash
      if (s1 > s2) p1Wins++;
      else p2Wins++;
    }
    if (p1Wins === p2Wins) return null;

    return {
      winnerId: p1Wins > p2Wins ? player1Id : player2Id,
      winnerName: p1Wins > p2Wins ? player1Name : player2Name,
      loserId: p1Wins > p2Wins ? player2Id : player1Id,
      loserName: p1Wins > p2Wins ? player2Name : player1Name,
      p1Wins,
      p2Wins,
      // Always store final scoreboard values — consistent with live scoring
      gameScores: validGames.map((g) => ({
        player1: parseInt(g.p1, 10),
        player2: parseInt(g.p2, 10),
      })),
    };
  };

  const result = getResult();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!result) {
      setError('Please enter valid scores with a clear winner (no tied games).');
      return;
    }

    setSaving(true);
    try {
      await api.submitTournamentMatchResult(tournamentId, match._id, {
        winner_id: result.winnerId,
        winner_name: result.winnerName,
        loser_id: result.loserId,
        loser_name: result.loserName,
        game_scores: result.gameScores,
        walkover: false,
        retired: false,
        ...(isHandicap && (p1Start !== 0 || p2Start !== 0) && {
          handicap_starts: { player1: p1Start, player2: p2Start },
        }),
      });
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save result');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-md'>

        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>Enter Match Result</h2>
            <p className='text-sm text-gray-500 mt-0.5'>{player1Name} vs {player2Name}</p>
          </div>
          <button onClick={onCancel} className='text-gray-400 hover:text-gray-600'>
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='p-6 space-y-4'>
            {error && (
              <div className='bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm'>
                {error}
              </div>
            )}

            {/* Handicap starting scores */}
            {isHandicap && (
              <div className='bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2'>
                <p className='text-xs font-semibold text-orange-700 uppercase tracking-wide'>Starting Scores (Handicap)</p>
                <HandicapRow name={player1Name} score={p1Start}
                  onIncrement={() => setP1Start((s) => s + 1)}
                  onDecrement={() => setP1Start((s) => s - 1)} />
                <HandicapRow name={player2Name} score={p2Start}
                  onIncrement={() => setP2Start((s) => s + 1)}
                  onDecrement={() => setP2Start((s) => s - 1)} />
              </div>
            )}

            {/* Score table */}
            <table className='w-full text-sm'>
              <thead>
                <tr className='text-gray-500 text-xs uppercase tracking-wide'>
                  <th className='pb-3 text-left w-12'>Game</th>
                  <th className='pb-3 text-center'>{player1Name}</th>
                  <th className='pb-3 w-6'></th>
                  <th className='pb-3 text-center'>{player2Name}</th>
                  <th className='pb-3 w-8'></th>
                </tr>
              </thead>
              <tbody>
                {games.map((game, i) => (
                  <tr key={i}>
                    <td className='py-1.5 text-gray-500 font-medium text-center'>{i + 1}</td>
                    <td className='py-1.5 px-2'>
                      <input
                        type='number'
                        min='0'
                        value={game.p1}
                        onChange={(e) => updateScore(i, 'p1', e.target.value)}
                        className='w-full text-center border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base'
                        placeholder='0'
                      />
                    </td>
                    <td className='py-1.5 text-center text-gray-400'>–</td>
                    <td className='py-1.5 px-2'>
                      <input
                        type='number'
                        min='0'
                        value={game.p2}
                        onChange={(e) => updateScore(i, 'p2', e.target.value)}
                        className='w-full text-center border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base'
                        placeholder='0'
                      />
                    </td>
                    <td className='py-1.5 pl-2'>
                      {games.length > 1 && (
                        <button
                          type='button'
                          onClick={() => removeGame(i)}
                          className='text-gray-300 hover:text-red-500 transition-colors'
                          aria-label='Remove game'
                        >
                          <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add game */}
            {games.length < bestOf && (
              <button
                type='button'
                onClick={addGame}
                className='w-full border-2 border-dashed border-gray-300 text-gray-500 py-2 rounded-lg text-sm hover:border-blue-400 hover:text-blue-500 transition-colors'
              >
                + Add Game
              </button>
            )}

            {/* Winner preview */}
            {result && (
              <div className='bg-green-50 border border-green-200 rounded-lg px-4 py-3'>
                <div className='text-sm font-semibold text-green-800'>
                  Winner: {result.winnerName}
                </div>
                <div className='text-xs text-green-600 mt-0.5'>
                  {result.p1Wins}–{result.p2Wins} games
                </div>
              </div>
            )}
          </div>

          <div className='flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg'>
            <button
              type='button'
              onClick={onCancel}
              className='flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={saving || !result}
              className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {saving ? 'Saving...' : 'Save Result'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EnterResultModal.propTypes = {
  match: PropTypes.object.isRequired,
  tournamentId: PropTypes.string.isRequired,
  matchConfig: PropTypes.object,
  isHandicap: PropTypes.bool,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default EnterResultModal;
