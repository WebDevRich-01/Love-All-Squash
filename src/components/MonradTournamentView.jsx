import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const MonradTournamentView = ({
  tournament,
  participants,
  matches,
  onScoreMatch,
  onEnterResult,
  onBack,
  onEdit,
  isHandicap,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const state = tournament.state_blob || {};
  const totalRounds = state.totalRounds || Math.ceil(Math.log2(participants.length));
  const activeRound = state.currentRound || 1;
  const isComplete = state.completed === true;

  // Only show rounds that have been generated (have at least one match)
  const generatedRounds = new Set(matches.map((m) => m.round));

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {});

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'border-green-500 bg-green-50';
      case 'live': return 'border-yellow-500 bg-yellow-50';
      case 'completed': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'ready': return 'Ready';
      case 'live': return 'In Progress';
      case 'completed': return 'Completed';
      default: return 'Pending';
    }
  };

  // Resolve participant display name for a match slot
  const getParticipantInfo = (participantRef) => {
    if (!participantRef) return { name: 'TBD', isPlaceholder: true };

    if (participantRef.type === 'bye') {
      return { name: 'BYE', isBye: true };
    }

    if (participantRef.type === 'participant') {
      // Look up original seed from participants array to display alongside name
      const original = participants.find(
        (p) => p._id === participantRef.participant_id
      );
      const seed = original?.seed;
      const displayName = seed && !isHandicap
        ? `${participantRef.name} (${seed})`
        : participantRef.name || 'TBD';
      return { name: displayName };
    }

    return { name: participantRef.name || 'TBD', isPlaceholder: true };
  };

  // Get current standings from state_blob.players (works during and after tournament)
  const getStandings = () => {
    if (!state.players) return [];
    return [...state.players]
      .sort((a, b) => {
        const winDiff = b.wins - a.wins;
        if (winDiff !== 0) return winDiff;
        const diffA = a.gamePointsFor - a.gamePointsAgainst;
        const diffB = b.gamePointsFor - b.gamePointsAgainst;
        const gpDiff = diffB - diffA;
        if (gpDiff !== 0) return gpDiff;
        const ptsForDiff = b.gamePointsFor - a.gamePointsFor;
        if (ptsForDiff !== 0) return ptsForDiff;
        return a.seed - b.seed;
      })
      .map((p, i) => ({ ...p, rank: i + 1 }));
  };

  const standings = getStandings();

  // Match tile component
  const MatchTile = ({ match }) => {
    const statusColor = getStatusColor(match.status);
    const playerA = getParticipantInfo(match.participant_a);
    const playerB = getParticipantInfo(match.participant_b);
    const canScore = match.status === 'ready' && !playerA.isBye && !playerB.isBye;
    const isByeMatch = playerA.isBye || playerB.isBye;

    return (
      <div className={`border-2 rounded-lg p-4 ${statusColor} transition-all hover:shadow-md`}>
        {/* Match header */}
        <div className='flex justify-between items-center mb-3'>
          <span className='text-sm font-medium text-gray-600'>
            {match.match_number || `R${match.round}M${matchesByRound[match.round]?.indexOf(match) + 1}`}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            match.status === 'ready' ? 'bg-green-100 text-green-800'
            : match.status === 'live' ? 'bg-yellow-100 text-yellow-800'
            : match.status === 'completed' ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-600'
          }`}>
            {isByeMatch && match.status === 'completed' ? 'Bye' : getStatusText(match.status)}
          </span>
        </div>

        {/* Players */}
        <div className='space-y-2 mb-4'>
          <div className='flex items-center justify-between'>
            <span className={`font-medium ${
              playerA.isBye ? 'text-orange-400 italic'
              : playerA.isPlaceholder ? 'text-gray-400 italic' : ''
            }`}>
              {playerA.name}
              {match.result?.handicap_starts != null && (
                <span className='ml-1 text-xs text-gray-400 font-normal'>
                  ({match.result.handicap_starts.player1 >= 0 ? '+' : ''}{match.result.handicap_starts.player1})
                </span>
              )}
            </span>
            {match.status === 'completed' &&
              match.result?.winner_participant_id &&
              match.result.winner_participant_id === match.participant_a?.participant_id && (
                <span className='text-green-600 font-bold'>W</span>
              )}
          </div>

          <div className='text-center text-gray-400 text-sm'>vs</div>

          <div className='flex items-center justify-between'>
            <span className={`font-medium ${
              playerB.isBye ? 'text-orange-400 italic'
              : playerB.isPlaceholder ? 'text-gray-400 italic' : ''
            }`}>
              {playerB.name}
              {match.result?.handicap_starts != null && (
                <span className='ml-1 text-xs text-gray-400 font-normal'>
                  ({match.result.handicap_starts.player2 >= 0 ? '+' : ''}{match.result.handicap_starts.player2})
                </span>
              )}
            </span>
            {match.status === 'completed' &&
              match.result?.winner_participant_id &&
              match.result.winner_participant_id === match.participant_b?.participant_id && (
                <span className='text-green-600 font-bold'>W</span>
              )}
          </div>
        </div>

        {/* Game scores */}
        {match.status === 'completed' && match.result?.game_scores?.length > 0 && (
          <div className='mb-3'>
            <div className='text-xs text-gray-600 mb-1'>Game Scores:</div>
            <div className='flex space-x-1 text-sm'>
              {match.result.game_scores.map((score, idx) => (
                <span key={idx} className='bg-white px-2 py-1 rounded border text-xs'>
                  {score.player1}-{score.player2}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        {canScore && (
          <div className='space-y-2'>
            <button
              onClick={() => onScoreMatch({
                matchId: match._id,
                tournamentId: tournament._id,
                player1Name: playerA.name,
                player2Name: playerB.name,
                player1Id: match.participant_a?.participant_id,
                player2Id: match.participant_b?.participant_id,
              })}
              className='w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium'
            >
              Score Match
            </button>
            {onEnterResult && (
              <button
                onClick={() => onEnterResult(match)}
                className='w-full bg-white text-gray-700 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm'
              >
                Enter Result
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Round column (desktop)
  const RoundColumn = ({ round }) => {
    const roundMatches = matchesByRound[round] || [];
    const isGenerated = generatedRounds.has(round);
    const isCurrentRound = round === activeRound;

    return (
      <div className='flex-shrink-0 w-80 space-y-4'>
        <h3 className='text-xl font-bold text-center py-3 bg-gray-100 rounded-lg'>
          Round {round}
          {isCurrentRound && !isComplete && (
            <span className='ml-2 text-sm font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full'>
              Current
            </span>
          )}
        </h3>
        {isGenerated ? (
          <div className='space-y-3'>
            {roundMatches.map((match, idx) => (
              <MatchTile key={match._id || `${round}-${idx}`} match={match} />
            ))}
          </div>
        ) : (
          <div className='text-center py-12 text-gray-400'>
            <div className='text-4xl mb-2'>⏳</div>
            <div className='text-sm'>
              Awaiting Round {round - 1} draw...
            </div>
            <div className='text-xs mt-1 text-gray-300'>
              Pairings generated after Round {round - 1} completes
            </div>
          </div>
        )}
      </div>
    );
  };

  // Standings sidebar/panel
  const StandingsPanel = () => (
    <div className='space-y-2'>
      {standings.length > 0 ? (
        standings.map((player) => (
          <div key={player.id} className='flex items-center justify-between p-3 bg-white rounded-lg shadow-sm'>
            <div className='flex items-center space-x-3'>
              <span className='text-lg font-bold text-gray-600 w-6'>#{player.rank}</span>
              <div>
                <div className='font-medium text-sm'>{player.name}</div>
                <div className='text-xs text-gray-500'>
                  {player.wins}W – {player.losses}L
                  {player.byes > 0 && ` (${player.byes} bye)`}
                </div>
                {isHandicap && (
                  <div className='text-xs font-medium mt-0.5 space-x-2'>
                    <span className={
                      (player.gamePointsFor - player.gamePointsAgainst) > 0
                        ? 'text-green-600'
                        : (player.gamePointsFor - player.gamePointsAgainst) < 0
                          ? 'text-red-500'
                          : 'text-gray-400'
                    }>
                      {(player.gamePointsFor - player.gamePointsAgainst) > 0 ? '+' : ''}
                      {player.gamePointsFor - player.gamePointsAgainst} pts diff
                    </span>
                    <span className='text-gray-400'>
                      ({player.gamePointsFor} for)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className='text-center py-8 text-gray-500'>
          <div className='text-4xl mb-2'>🏆</div>
          <div>Standings update</div>
          <div>as matches complete</div>
        </div>
      )}
    </div>
  );

  // ─── Mobile layout ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className='h-full flex flex-col bg-white'>
        <div className='flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10'>
          <button
            onClick={onBack}
            className='flex items-center space-x-2 text-gray-600 hover:text-gray-800'
          >
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
            <span>Back</span>
          </button>
          <h1 className='text-lg font-bold truncate mx-4'>{tournament.name}</h1>
          {onEdit ? (
            <button
              onClick={onEdit}
              className='text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-1'
            >
              Edit
            </button>
          ) : (
            <div className='w-16' />
          )}
        </div>

        {/* Round + Standings tabs */}
        <div className='flex overflow-x-auto p-2 border-b bg-gray-50'>
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
            <button
              key={round}
              onClick={() => setCurrentRound(round)}
              className={`flex-shrink-0 px-4 py-2 mx-1 rounded-lg font-medium ${
                currentRound === round ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              R{round}
              {round === activeRound && !isComplete && (
                <span className='ml-1 w-2 h-2 bg-blue-300 rounded-full inline-block' />
              )}
            </button>
          ))}
          <button
            onClick={() => setCurrentRound('standings')}
            className={`flex-shrink-0 px-4 py-2 mx-1 rounded-lg font-medium ${
              currentRound === 'standings' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isComplete ? 'Results' : 'Standings'}
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-4'>
          {currentRound === 'standings' ? (
            <div>
              <h2 className='text-xl font-bold text-center mb-4'>
                {isComplete ? 'Final Rankings' : 'Current Standings'}
              </h2>
              <StandingsPanel />
            </div>
          ) : (
            <div className='space-y-3'>
              {generatedRounds.has(currentRound) ? (
                (matchesByRound[currentRound] || []).map((match, idx) => (
                  <MatchTile key={match._id || `${currentRound}-${idx}`} match={match} />
                ))
              ) : (
                <div className='text-center py-12 text-gray-400'>
                  <div className='text-4xl mb-2'>⏳</div>
                  <div>Awaiting Round {currentRound - 1} draw...</div>
                  <div className='text-sm mt-1'>Pairings generated after Round {currentRound - 1} completes</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Desktop layout ───────────────────────────────────────────────────────
  return (
    <div className='h-full flex flex-col bg-white'>
      <div className='flex items-center justify-between p-6 border-b bg-white'>
        <button
          onClick={onBack}
          className='flex items-center space-x-2 text-gray-600 hover:text-gray-800'
        >
          <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
          </svg>
          <span>Back to Tournaments</span>
        </button>
        <h1 className='text-2xl font-bold'>{tournament.name}</h1>
        <div className='flex items-center gap-4'>
          <div className='text-sm text-gray-600'>
            {tournament.venue && <span>{tournament.venue} • </span>}
            Monrad (Swiss) • {participants.length} Players • {totalRounds} Rounds
          </div>
          {onEdit && (
            <button
              onClick={onEdit}
              className='text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg px-3 py-1.5'
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className='flex-1 flex overflow-hidden'>
        {/* Rounds */}
        <div className='flex-1 overflow-x-auto p-6'>
          <div className='flex space-x-6 min-w-max'>
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
              <RoundColumn key={round} round={round} />
            ))}
          </div>
        </div>

        {/* Standings sidebar */}
        <div className='w-72 border-l bg-gray-50 flex flex-col'>
          <div className='p-4 border-b bg-white'>
            <h2 className='text-lg font-bold'>
              {isComplete ? 'Final Rankings' : 'Standings'}
            </h2>
            {!isComplete && (
              <p className='text-xs text-gray-500 mt-1'>
                Round {activeRound} of {totalRounds}
              </p>
            )}
          </div>
          <div className='flex-1 overflow-y-auto p-4'>
            <StandingsPanel />
          </div>
        </div>
      </div>
    </div>
  );
};

MonradTournamentView.propTypes = {
  tournament: PropTypes.object.isRequired,
  participants: PropTypes.array.isRequired,
  matches: PropTypes.array.isRequired,
  onScoreMatch: PropTypes.func.isRequired,
  onEnterResult: PropTypes.func,
  onBack: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
};

export default MonradTournamentView;
