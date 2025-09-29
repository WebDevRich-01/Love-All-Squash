import React from 'react';

const TournamentMatchCard = ({
  match,
  onScore,
  showScoreButton = false,
  showResult = false,
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'live':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-600';
      case 'walkover':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatMatchNumber = (matchNumber, round, stage) => {
    if (matchNumber) return matchNumber;
    if (stage === 'group') return `Pool R${round}`;
    return `R${round}`;
  };

  const formatGameScore = (gameScores) => {
    if (!gameScores || gameScores.length === 0) return '';
    return gameScores
      .map((game) => `${game.player1}-${game.player2}`)
      .join(', ');
  };

  const getWinnerName = (result) => {
    if (!result) return null;
    return result.winner_name;
  };

  const isParticipantWinner = (participantName, result) => {
    return result && result.winner_name === participantName;
  };

  return (
    <div className='bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow'>
      <div className='p-4'>
        {/* Header */}
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center space-x-2'>
            <span className='text-sm font-medium text-gray-600'>
              {formatMatchNumber(match.match_number, match.round, match.stage)}
            </span>
            {match.court && (
              <span className='text-xs text-gray-500'>Court {match.court}</span>
            )}
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
              match.status
            )}`}
          >
            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
          </span>
        </div>

        {/* Participants */}
        <div className='space-y-2'>
          <div
            className={`flex items-center justify-between p-2 rounded ${
              showResult &&
              isParticipantWinner(match.participant_a.name, match.result)
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50'
            }`}
          >
            <div className='flex items-center space-x-2'>
              <div className='w-2 h-2 bg-red-500 rounded-full'></div>
              <span
                className={`font-medium ${
                  showResult &&
                  isParticipantWinner(match.participant_a.name, match.result)
                    ? 'text-green-800'
                    : 'text-gray-900'
                }`}
              >
                {match.participant_a.name ||
                  match.participant_a.qualifier ||
                  'TBD'}
              </span>
            </div>
            {showResult && match.result && (
              <div className='text-sm font-medium text-gray-700'>
                {isParticipantWinner(match.participant_a.name, match.result)
                  ? '✓'
                  : ''}
              </div>
            )}
          </div>

          <div className='text-center text-xs text-gray-500'>vs</div>

          <div
            className={`flex items-center justify-between p-2 rounded ${
              showResult &&
              isParticipantWinner(match.participant_b.name, match.result)
                ? 'bg-green-50 border border-green-200'
                : 'bg-gray-50'
            }`}
          >
            <div className='flex items-center space-x-2'>
              <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
              <span
                className={`font-medium ${
                  showResult &&
                  isParticipantWinner(match.participant_b.name, match.result)
                    ? 'text-green-800'
                    : 'text-gray-900'
                }`}
              >
                {match.participant_b.name ||
                  match.participant_b.qualifier ||
                  'TBD'}
              </span>
            </div>
            {showResult && match.result && (
              <div className='text-sm font-medium text-gray-700'>
                {isParticipantWinner(match.participant_b.name, match.result)
                  ? '✓'
                  : ''}
              </div>
            )}
          </div>
        </div>

        {/* Result details */}
        {showResult && match.result && (
          <div className='mt-3 pt-3 border-t border-gray-100'>
            <div className='text-sm text-gray-600'>
              <div className='font-medium text-green-700 mb-1'>
                Winner: {getWinnerName(match.result)}
              </div>
              {match.result.game_scores &&
                match.result.game_scores.length > 0 && (
                  <div className='text-xs'>
                    Games: {formatGameScore(match.result.game_scores)}
                  </div>
                )}
              {match.result.walkover && (
                <div className='text-xs text-purple-600 mt-1'>Walkover</div>
              )}
              {match.result.retired && (
                <div className='text-xs text-orange-600 mt-1'>Retired</div>
              )}
            </div>
          </div>
        )}

        {/* Scheduling info */}
        {match.scheduled_at && (
          <div className='mt-3 pt-3 border-t border-gray-100'>
            <div className='text-xs text-gray-500'>
              Scheduled: {new Date(match.scheduled_at).toLocaleString()}
            </div>
          </div>
        )}

        {/* Action button */}
        {showScoreButton && onScore && (
          <div className='mt-4'>
            <button
              onClick={onScore}
              disabled={
                !match.participant_a.name ||
                !match.participant_b.name ||
                match.participant_a.type === 'bye' ||
                match.participant_b.type === 'bye'
              }
              className='w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Score Match
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentMatchCard;
