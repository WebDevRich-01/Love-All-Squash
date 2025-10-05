import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const MonradTournamentView = ({
  tournament,
  participants,
  matches,
  onScoreMatch,
  onBack,
}) => {
  const [currentRound, setCurrentRound] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate total rounds for Monrad tournament
  const getTotalRounds = (participantCount) => {
    // Monrad typically runs for log2(n) rounds, minimum 3 rounds
    return Math.max(3, Math.ceil(Math.log2(participantCount)));
  };

  const totalRounds = getTotalRounds(participants.length);

  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {});

  // Get match status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
        return 'border-green-500 bg-green-50';
      case 'live':
        return 'border-yellow-500 bg-yellow-50';
      case 'completed':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  // Get match status text
  const getStatusText = (status) => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'live':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return 'Pending';
    }
  };

  // Get the source match for a seed position in a given round
  const getSourceMatch = (seedPosition, round, participantCount) => {
    // This maps seed positions to their source matches based on Monrad logic
    // For 8-player tournament structure
    if (participantCount === 8) {
      if (round === 2) {
        const seedToMatch = {
          1: { match: 'R1M1', result: 'Winner' }, // Winner of 1v8
          4: { match: 'R1M4', result: 'Winner' }, // Winner of 4v5
          2: { match: 'R1M2', result: 'Winner' }, // Winner of 2v7
          3: { match: 'R1M3', result: 'Winner' }, // Winner of 3v6
          5: { match: 'R1M4', result: 'Loser' }, // Loser of 4v5
          8: { match: 'R1M1', result: 'Loser' }, // Loser of 1v8
          6: { match: 'R1M3', result: 'Loser' }, // Loser of 3v6
          7: { match: 'R1M2', result: 'Loser' }, // Loser of 2v7
        };
        return seedToMatch[seedPosition];
      }
      if (round === 3) {
        const seedToMatch = {
          1: { match: 'R2M1', result: 'Winner' }, // Winner of R2M1
          2: { match: 'R2M2', result: 'Winner' }, // Winner of R2M2
          3: { match: 'R2M1', result: 'Loser' }, // Loser of R2M1
          4: { match: 'R2M2', result: 'Loser' }, // Loser of R2M2
          5: { match: 'R2M3', result: 'Winner' }, // Winner of R2M3
          6: { match: 'R2M4', result: 'Winner' }, // Winner of R2M4
          7: { match: 'R2M3', result: 'Loser' }, // Loser of R2M3
          8: { match: 'R2M4', result: 'Loser' }, // Loser of R2M4
        };
        return seedToMatch[seedPosition];
      }
    }

    // For 16-player tournament structure
    if (participantCount === 16) {
      if (round === 2) {
        const seedToMatch = {
          1: { match: 'R1M1', result: 'Winner' }, // Winner of 1v16
          8: { match: 'R1M8', result: 'Winner' }, // Winner of 8v9
          2: { match: 'R1M2', result: 'Winner' }, // Winner of 2v15
          7: { match: 'R1M7', result: 'Winner' }, // Winner of 7v10
          3: { match: 'R1M3', result: 'Winner' }, // Winner of 3v14
          6: { match: 'R1M6', result: 'Winner' }, // Winner of 6v11
          4: { match: 'R1M4', result: 'Winner' }, // Winner of 4v13
          5: { match: 'R1M5', result: 'Winner' }, // Winner of 5v12
          9: { match: 'R1M8', result: 'Loser' }, // Loser of 8v9
          16: { match: 'R1M1', result: 'Loser' }, // Loser of 1v16
          10: { match: 'R1M7', result: 'Loser' }, // Loser of 7v10
          15: { match: 'R1M2', result: 'Loser' }, // Loser of 2v15
          11: { match: 'R1M6', result: 'Loser' }, // Loser of 6v11
          14: { match: 'R1M3', result: 'Loser' }, // Loser of 3v14
          12: { match: 'R1M5', result: 'Loser' }, // Loser of 5v12
          13: { match: 'R1M4', result: 'Loser' }, // Loser of 4v13
        };
        return seedToMatch[seedPosition];
      }
      if (round === 3) {
        const seedToMatch = {
          1: { match: 'R2M1', result: 'Winner' }, // Winner of R2M1
          4: { match: 'R2M4', result: 'Winner' }, // Winner of R2M4
          2: { match: 'R2M2', result: 'Winner' }, // Winner of R2M2
          3: { match: 'R2M3', result: 'Winner' }, // Winner of R2M3
          5: { match: 'R2M5', result: 'Winner' }, // Winner of R2M5
          8: { match: 'R2M8', result: 'Winner' }, // Winner of R2M8
          6: { match: 'R2M6', result: 'Winner' }, // Winner of R2M6
          7: { match: 'R2M7', result: 'Winner' }, // Winner of R2M7
          9: { match: 'R2M5', result: 'Loser' }, // Loser of R2M5
          16: { match: 'R2M1', result: 'Loser' }, // Loser of R2M1
          10: { match: 'R2M6', result: 'Loser' }, // Loser of R2M6
          15: { match: 'R2M2', result: 'Loser' }, // Loser of R2M2
          11: { match: 'R2M7', result: 'Loser' }, // Loser of R2M7
          14: { match: 'R2M3', result: 'Loser' }, // Loser of R2M3
          12: { match: 'R2M8', result: 'Loser' }, // Loser of R2M8
          13: { match: 'R2M4', result: 'Loser' }, // Loser of R2M4
        };
        return seedToMatch[seedPosition];
      }
      if (round === 4) {
        const seedToMatch = {
          1: { match: 'R3M1', result: 'Winner' }, // Winner of R3M1
          2: { match: 'R3M2', result: 'Winner' }, // Winner of R3M2
          3: { match: 'R3M1', result: 'Loser' }, // Loser of R3M1
          4: { match: 'R3M2', result: 'Loser' }, // Loser of R3M2
          5: { match: 'R3M3', result: 'Winner' }, // Winner of R3M3
          6: { match: 'R3M4', result: 'Winner' }, // Winner of R3M4
          7: { match: 'R3M3', result: 'Loser' }, // Loser of R3M3
          8: { match: 'R3M4', result: 'Loser' }, // Loser of R3M4
          9: { match: 'R3M5', result: 'Winner' }, // Winner of R3M5
          10: { match: 'R3M6', result: 'Winner' }, // Winner of R3M6
          11: { match: 'R3M5', result: 'Loser' }, // Loser of R3M5
          12: { match: 'R3M6', result: 'Loser' }, // Loser of R3M6
          13: { match: 'R3M7', result: 'Winner' }, // Winner of R3M7
          14: { match: 'R3M8', result: 'Winner' }, // Winner of R3M8
          15: { match: 'R3M7', result: 'Loser' }, // Loser of R3M7
          16: { match: 'R3M8', result: 'Loser' }, // Loser of R3M8
        };
        return seedToMatch[seedPosition];
      }
    }

    // For 32-player tournament structure
    if (participantCount === 32) {
      if (round === 2) {
        const seedToMatch = {
          1: { match: 'R1M1', result: 'Winner' }, // Winner of 1v32
          16: { match: 'R1M16', result: 'Winner' }, // Winner of 16v17
          2: { match: 'R1M2', result: 'Winner' }, // Winner of 2v31
          15: { match: 'R1M15', result: 'Winner' }, // Winner of 15v18
          3: { match: 'R1M3', result: 'Winner' }, // Winner of 3v30
          14: { match: 'R1M14', result: 'Winner' }, // Winner of 14v19
          4: { match: 'R1M4', result: 'Winner' }, // Winner of 4v29
          13: { match: 'R1M13', result: 'Winner' }, // Winner of 13v20
          5: { match: 'R1M5', result: 'Winner' }, // Winner of 5v28
          12: { match: 'R1M12', result: 'Winner' }, // Winner of 12v21
          6: { match: 'R1M6', result: 'Winner' }, // Winner of 6v27
          11: { match: 'R1M11', result: 'Winner' }, // Winner of 11v22
          7: { match: 'R1M7', result: 'Winner' }, // Winner of 7v26
          10: { match: 'R1M10', result: 'Winner' }, // Winner of 10v23
          8: { match: 'R1M8', result: 'Winner' }, // Winner of 8v25
          9: { match: 'R1M9', result: 'Winner' }, // Winner of 9v24
          17: { match: 'R1M16', result: 'Loser' }, // Loser of 16v17
          32: { match: 'R1M1', result: 'Loser' }, // Loser of 1v32
          18: { match: 'R1M15', result: 'Loser' }, // Loser of 15v18
          31: { match: 'R1M2', result: 'Loser' }, // Loser of 2v31
          19: { match: 'R1M14', result: 'Loser' }, // Loser of 14v19
          30: { match: 'R1M3', result: 'Loser' }, // Loser of 3v30
          20: { match: 'R1M13', result: 'Loser' }, // Loser of 13v20
          29: { match: 'R1M4', result: 'Loser' }, // Loser of 4v29
          21: { match: 'R1M12', result: 'Loser' }, // Loser of 12v21
          28: { match: 'R1M5', result: 'Loser' }, // Loser of 5v28
          22: { match: 'R1M11', result: 'Loser' }, // Loser of 11v22
          27: { match: 'R1M6', result: 'Loser' }, // Loser of 6v27
          23: { match: 'R1M10', result: 'Loser' }, // Loser of 10v23
          26: { match: 'R1M7', result: 'Loser' }, // Loser of 7v26
          24: { match: 'R1M9', result: 'Loser' }, // Loser of 9v24
          25: { match: 'R1M8', result: 'Loser' }, // Loser of 8v25
        };
        return seedToMatch[seedPosition];
      }
      if (round === 3) {
        const seedToMatch = {
          1: { match: 'R2M1', result: 'Winner' }, // Winner of R2M1
          8: { match: 'R2M8', result: 'Winner' }, // Winner of R2M8
          2: { match: 'R2M2', result: 'Winner' }, // Winner of R2M2
          7: { match: 'R2M7', result: 'Winner' }, // Winner of R2M7
          3: { match: 'R2M3', result: 'Winner' }, // Winner of R2M3
          6: { match: 'R2M6', result: 'Winner' }, // Winner of R2M6
          4: { match: 'R2M4', result: 'Winner' }, // Winner of R2M4
          5: { match: 'R2M5', result: 'Winner' }, // Winner of R2M5
          9: { match: 'R2M9', result: 'Winner' }, // Winner of R2M9
          16: { match: 'R2M16', result: 'Winner' }, // Winner of R2M16
          10: { match: 'R2M10', result: 'Winner' }, // Winner of R2M10
          15: { match: 'R2M15', result: 'Winner' }, // Winner of R2M15
          11: { match: 'R2M11', result: 'Winner' }, // Winner of R2M11
          14: { match: 'R2M14', result: 'Winner' }, // Winner of R2M14
          12: { match: 'R2M12', result: 'Winner' }, // Winner of R2M12
          13: { match: 'R2M13', result: 'Winner' }, // Winner of R2M13
          17: { match: 'R2M9', result: 'Loser' }, // Loser of R2M9
          32: { match: 'R2M1', result: 'Loser' }, // Loser of R2M1
          18: { match: 'R2M10', result: 'Loser' }, // Loser of R2M10
          31: { match: 'R2M2', result: 'Loser' }, // Loser of R2M2
          19: { match: 'R2M11', result: 'Loser' }, // Loser of R2M11
          30: { match: 'R2M3', result: 'Loser' }, // Loser of R2M3
          20: { match: 'R2M12', result: 'Loser' }, // Loser of R2M12
          29: { match: 'R2M4', result: 'Loser' }, // Loser of R2M4
          21: { match: 'R2M13', result: 'Loser' }, // Loser of R2M13
          28: { match: 'R2M5', result: 'Loser' }, // Loser of R2M5
          22: { match: 'R2M14', result: 'Loser' }, // Loser of R2M14
          27: { match: 'R2M6', result: 'Loser' }, // Loser of R2M6
          23: { match: 'R2M15', result: 'Loser' }, // Loser of R2M15
          26: { match: 'R2M7', result: 'Loser' }, // Loser of R2M7
          24: { match: 'R2M16', result: 'Loser' }, // Loser of R2M16
          25: { match: 'R2M8', result: 'Loser' }, // Loser of R2M8
        };
        return seedToMatch[seedPosition];
      }
      // Add more rounds for 32-player as needed (Round 4, 5)
    }

    return null;
  };

  // Get participant info including original seed in name
  const getParticipantInfo = (participantRef, matchRound) => {
    if (!participantRef) return { name: 'TBD', isPlaceholder: true };

    // Handle bye players
    if (participantRef.type === 'bye') {
      return {
        name: participantRef.name || 'BYE',
        isPlaceholder: false,
        isBye: true,
      };
    }

    // Handle seed position placeholders
    if (participantRef.type === 'seed_position') {
      const sourceMatch = getSourceMatch(
        participantRef.seed,
        matchRound,
        participants.length
      );

      if (sourceMatch) {
        return {
          name: `${sourceMatch.result} ${sourceMatch.match}`,
          isPlaceholder: true,
        };
      }

      // Fallback to seed display if no mapping found
      return {
        name: `Seed ${participantRef.seed}`,
        isPlaceholder: true,
      };
    }

    // Handle actual participants
    if (participantRef.type === 'participant') {
      if (participantRef.participant_id) {
        const participant = participants.find(
          (p) => p._id === participantRef.participant_id
        );
        if (participant) {
          // Format name with original seed: "Rich Morris (1)"
          const nameWithSeed = participant.seed
            ? `${participant.name} (${participant.seed})`
            : participant.name;

          return {
            name: nameWithSeed,
            originalSeed: participant.seed,
            isPlaceholder: false,
          };
        }
      }

      // For resolved participants in later rounds, try to get original seed
      if (participantRef.name && participantRef.name !== 'TBD') {
        // Find original participant by name to get their original seed
        const originalParticipant = participants.find(
          (p) => p.name === participantRef.name
        );

        if (originalParticipant && originalParticipant.seed) {
          const nameWithSeed = `${participantRef.name} (${originalParticipant.seed})`;
          return {
            name: nameWithSeed,
            originalSeed: originalParticipant.seed,
            isPlaceholder: false,
          };
        }

        return {
          name: participantRef.name,
          isPlaceholder: false,
        };
      }
    }

    // Fallback for legacy format or missing data
    return {
      name: participantRef.name || 'TBD',
      isPlaceholder: !participantRef.participant_id,
    };
  };

  // Render a single match tile
  const MatchTile = ({ match }) => {
    const statusColor = getStatusColor(match.status);
    const playerA = getParticipantInfo(match.participant_a, match.round);
    const playerB = getParticipantInfo(match.participant_b, match.round);

    // Can only score if match is ready and both players are actual participants (not placeholders or byes)
    const canScore =
      match.status === 'ready' &&
      !playerA.isPlaceholder &&
      !playerB.isPlaceholder &&
      !playerA.isBye &&
      !playerB.isBye;

    return (
      <div
        className={`border-2 rounded-lg p-4 ${statusColor} transition-all hover:shadow-md`}
      >
        {/* Match header */}
        <div className='flex justify-between items-center mb-3'>
          <span className='text-sm font-medium text-gray-600'>
            Match{' '}
            {match.match_number ||
              `R${match.round}M${
                matchesByRound[match.round]?.indexOf(match) + 1
              }`}
          </span>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              match.status === 'ready'
                ? 'bg-green-100 text-green-800'
                : match.status === 'live'
                ? 'bg-yellow-100 text-yellow-800'
                : match.status === 'completed'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {getStatusText(match.status)}
          </span>
        </div>

        {/* Players */}
        <div className='space-y-2 mb-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <span
                className={`font-medium ${
                  playerA.isPlaceholder
                    ? 'text-gray-400 italic'
                    : playerA.isBye
                    ? 'text-orange-600 font-semibold'
                    : ''
                }`}
              >
                {playerA.name}
              </span>
            </div>
            {match.status === 'completed' &&
              match.result?.winner_participant_id ===
                match.participant_a?.participant_id && (
                <span className='text-green-600 font-bold'>W</span>
              )}
          </div>

          <div className='text-center text-gray-400 text-sm'>vs</div>

          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <span
                className={`font-medium ${
                  playerB.isPlaceholder
                    ? 'text-gray-400 italic'
                    : playerB.isBye
                    ? 'text-orange-600 font-semibold'
                    : ''
                }`}
              >
                {playerB.name}
              </span>
            </div>
            {match.status === 'completed' &&
              match.result?.winner_participant_id ===
                match.participant_b?.participant_id && (
                <span className='text-green-600 font-bold'>W</span>
              )}
          </div>
        </div>

        {/* Game scores if completed */}
        {match.status === 'completed' &&
          match.result?.game_scores?.length > 0 && (
            <div className='mb-3'>
              <div className='text-xs text-gray-600 mb-1'>Game Scores:</div>
              <div className='flex space-x-1 text-sm'>
                {match.result.game_scores.map((score, idx) => (
                  <span
                    key={idx}
                    className='bg-white px-2 py-1 rounded border text-xs'
                  >
                    {score.player1}-{score.player2}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Score button */}
        {canScore && (
          <button
            onClick={() =>
              onScoreMatch({
                matchId: match._id,
                tournamentId: tournament._id,
                player1Name: playerA.name,
                player2Name: playerB.name,
                player1Id: match.participant_a?.participant_id,
                player2Id: match.participant_b?.participant_id,
              })
            }
            className='w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium'
          >
            Score Match
          </button>
        )}
      </div>
    );
  };

  // Render round column
  const RoundColumn = ({ round }) => {
    const roundMatches = matchesByRound[round] || [];

    return (
      <div className='flex-shrink-0 w-80 space-y-4'>
        <h3 className='text-xl font-bold text-center py-3 bg-gray-100 rounded-lg'>
          Round {round}
        </h3>
        <div className='space-y-3'>
          {roundMatches.map((match, idx) => (
            <MatchTile key={match._id || `${round}-${idx}`} match={match} />
          ))}
        </div>
      </div>
    );
  };

  // Get final rankings from completed tournament
  const getFinalRankings = () => {
    // Check if tournament is complete (all matches in final round are completed)
    const maxRound = Math.max(...matches.map((m) => m.round));
    const finalRoundMatches = matches.filter((m) => m.round === maxRound);
    const allFinalRoundComplete =
      finalRoundMatches.length > 0 &&
      finalRoundMatches.every((m) => m.status === 'completed');

    if (!allFinalRoundComplete) return [];

    // Get final standings from tournament state
    if (tournament.state_blob && tournament.state_blob.seedPositions) {
      const seedPositions = tournament.state_blob.seedPositions;

      // Convert seed positions to final rankings (seed 1 = 1st place, etc.)
      const rankings = [];
      const participantCount = participants.length;

      for (let seed = 1; seed <= participantCount; seed++) {
        const seedInfo = seedPositions[seed.toString()];
        if (seedInfo) {
          const participant = participants.find(
            (p) => p._id === seedInfo.participant_id
          );
          if (participant) {
            rankings.push({
              ...participant,
              finalPosition: seed,
              current_seed: seed,
            });
          }
        }
      }

      return rankings.sort((a, b) => a.finalPosition - b.finalPosition);
    }

    // Fallback: return empty array if no state available
    return [];
  };

  const finalRankings = getFinalRankings();

  // Mobile view with swipeable rounds
  if (isMobile) {
    return (
      <div className='h-full flex flex-col bg-white'>
        {/* Header */}
        <div className='flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10'>
          <button
            onClick={onBack}
            className='flex items-center space-x-2 text-gray-600 hover:text-gray-800'
          >
            <svg
              className='w-5 h-5'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
            <span>Back</span>
          </button>
          <h1 className='text-lg font-bold truncate mx-4'>{tournament.name}</h1>
          <div className='w-16' /> {/* Spacer for centering */}
        </div>

        {/* Round selector */}
        <div className='flex overflow-x-auto p-2 border-b bg-gray-50'>
          {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
            <button
              key={round}
              onClick={() => setCurrentRound(round)}
              className={`flex-shrink-0 px-4 py-2 mx-1 rounded-lg font-medium ${
                currentRound === round
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Round {round}
            </button>
          ))}
          <button
            onClick={() => setCurrentRound('final')}
            className={`flex-shrink-0 px-4 py-2 mx-1 rounded-lg font-medium ${
              currentRound === 'final'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Final Rankings
          </button>
        </div>

        {/* Content */}
        <div className='flex-1 overflow-y-auto p-4'>
          {currentRound === 'final' ? (
            <div className='space-y-3'>
              <h2 className='text-xl font-bold text-center mb-4'>
                Final Rankings
              </h2>
              {finalRankings.length > 0 ? (
                finalRankings.map((participant, idx) => (
                  <div
                    key={participant._id}
                    className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                  >
                    <div className='flex items-center space-x-3'>
                      <span className='text-lg font-bold text-gray-600'>
                        #{idx + 1}
                      </span>
                      <span className='font-medium'>{participant.name}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className='text-center py-8 text-gray-500'>
                  Tournament not yet completed
                </div>
              )}
            </div>
          ) : (
            <div className='space-y-3'>
              {(matchesByRound[currentRound] || []).map((match, idx) => (
                <MatchTile
                  key={match._id || `${currentRound}-${idx}`}
                  match={match}
                />
              ))}
              {(!matchesByRound[currentRound] ||
                matchesByRound[currentRound].length === 0) && (
                <div className='text-center py-8 text-gray-500'>
                  No matches in this round yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop view with side-by-side rounds
  return (
    <div className='h-full flex flex-col bg-white'>
      {/* Header */}
      <div className='flex items-center justify-between p-6 border-b bg-white'>
        <button
          onClick={onBack}
          className='flex items-center space-x-2 text-gray-600 hover:text-gray-800'
        >
          <svg
            className='w-5 h-5'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M15 19l-7-7 7-7'
            />
          </svg>
          <span>Back to Tournaments</span>
        </button>
        <h1 className='text-2xl font-bold'>{tournament.name}</h1>
        <div className='text-sm text-gray-600'>
          {tournament.venue && <span>{tournament.venue} • </span>}
          Monrad Format • {participants.length} Players
        </div>
      </div>

      {/* Main content */}
      <div className='flex-1 flex overflow-hidden'>
        {/* Rounds container */}
        <div className='flex-1 overflow-x-auto p-6'>
          <div className='flex space-x-6 min-w-max'>
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map(
              (round) => (
                <RoundColumn key={round} round={round} />
              )
            )}
          </div>
        </div>

        {/* Final rankings sidebar */}
        <div className='w-80 border-l bg-gray-50 flex flex-col'>
          <div className='p-4 border-b bg-white'>
            <h2 className='text-lg font-bold'>Final Rankings</h2>
          </div>
          <div className='flex-1 overflow-y-auto p-4'>
            {finalRankings.length > 0 ? (
              <div className='space-y-2'>
                {finalRankings.map((participant, idx) => (
                  <div
                    key={participant._id}
                    className='flex items-center justify-between p-3 bg-white rounded-lg shadow-sm'
                  >
                    <div className='flex items-center space-x-3'>
                      <span className='text-lg font-bold text-gray-600'>
                        #{idx + 1}
                      </span>
                      <span className='font-medium'>{participant.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-gray-500'>
                <div className='text-4xl mb-2'>🏆</div>
                <div>Rankings will appear</div>
                <div>when tournament completes</div>
              </div>
            )}
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
  onBack: PropTypes.func.isRequired,
};

export default MonradTournamentView;
