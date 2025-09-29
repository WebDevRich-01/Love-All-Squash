import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import TournamentMatchCard from './TournamentMatchCard';
import TournamentStandings from './TournamentStandings';
import MonradTournamentView from './MonradTournamentView';

const TournamentDetailScreen = ({ tournamentId, onBack, onScoreMatch }) => {
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [matches, setMatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [standings, setStandings] = useState(null);
  const [playableMatches, setPlayableMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadTournamentData();
  }, [tournamentId]);

  const loadTournamentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load tournament details
      const tournamentData = await api.getTournament(tournamentId);
      setTournament(tournamentData.tournament);
      setParticipants(tournamentData.participants);
      setMatches(tournamentData.matches);
      setGroups(tournamentData.groups);

      // Load standings
      const standingsData = await api.getTournamentStandings(tournamentId);
      setStandings(standingsData);

      // Load playable matches
      const playableData = await api.getPlayableTournamentMatches(tournamentId);
      setPlayableMatches(playableData);
    } catch (err) {
      console.error('Error loading tournament:', err);
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreMatch = (matchContext) => {
    // Navigate to scoring screen with tournament context
    // Handle both match object (from TournamentMatchCard) and custom object (from MonradTournamentView)
    const contextData = {
      tournamentId: matchContext.tournamentId || tournament._id,
      matchId: matchContext.matchId || matchContext._id,
      player1Name: matchContext.player1Name || matchContext.participant_a?.name,
      player2Name: matchContext.player2Name || matchContext.participant_b?.name,
      player1Id:
        matchContext.player1Id || matchContext.participant_a?.participant_id,
      player2Id:
        matchContext.player2Id || matchContext.participant_b?.participant_id,
      participant_a: matchContext.participant_a,
      participant_b: matchContext.participant_b,
      isTournamentMatch: true,
    };

    onScoreMatch(contextData);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormatDisplayName = (format) => {
    const formatNames = {
      single_elimination: 'Single Elimination',
      round_robin: 'Round Robin',
      monrad: 'Monrad / Progressive Consolation',
      pools_knockout: 'Pools → Knockout',
      double_elimination: 'Double Elimination',
      swiss: 'Swiss System',
    };
    return formatNames[format] || format;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 p-4'>
        <div className='max-w-6xl mx-auto'>
          <div className='flex items-center justify-center py-12'>
            <div className='text-lg text-gray-600'>Loading tournament...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className='min-h-screen bg-gray-50 p-4'>
        <div className='max-w-6xl mx-auto'>
          <div className='flex items-center justify-center py-12'>
            <div className='text-center'>
              <div className='text-lg text-red-600 mb-4'>
                {error || 'Tournament not found'}
              </div>
              <button
                onClick={onBack}
                className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors'
              >
                Back to Tournaments
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use specialized Monrad view for Monrad tournaments
  if (tournament.format === 'monrad') {
    return (
      <MonradTournamentView
        tournament={tournament}
        participants={participants}
        matches={matches}
        onScoreMatch={handleScoreMatch}
        onBack={onBack}
      />
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm'>
        <div className='max-w-6xl mx-auto px-4 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={onBack}
                className='p-2 text-gray-600 hover:text-gray-800 transition-colors'
              >
                <svg
                  className='w-6 h-6'
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
              </button>
              <div>
                <h1 className='text-3xl font-bold text-gray-900'>
                  {tournament.name}
                </h1>
                <div className='flex items-center space-x-4 mt-2'>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      tournament.status
                    )}`}
                  >
                    {tournament.status.charAt(0).toUpperCase() +
                      tournament.status.slice(1)}
                  </span>
                  <span className='text-gray-600'>
                    {getFormatDisplayName(tournament.format)}
                  </span>
                  <span className='text-gray-600'>
                    {participants.length} participants
                  </span>
                </div>
              </div>
            </div>

            <div className='flex items-center space-x-3'>
              {playableMatches.length > 0 && (
                <span className='bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium'>
                  {playableMatches.length} matches ready
                </span>
              )}
              <button
                onClick={loadTournamentData}
                className='p-2 text-gray-600 hover:text-gray-800 transition-colors'
                title='Refresh'
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
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Tournament details */}
          {(tournament.venue ||
            tournament.start_date ||
            tournament.description) && (
            <div className='mt-4 p-4 bg-gray-50 rounded-lg'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-sm'>
                {tournament.venue && (
                  <div className='flex items-center text-gray-600'>
                    <svg
                      className='w-4 h-4 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
                      />
                    </svg>
                    <span>{tournament.venue}</span>
                  </div>
                )}
                {tournament.start_date && (
                  <div className='flex items-center text-gray-600'>
                    <svg
                      className='w-4 h-4 mr-2'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                      />
                    </svg>
                    <span>{formatDate(tournament.start_date)}</span>
                  </div>
                )}
                {tournament.description && (
                  <div className='md:col-span-3 mt-2'>
                    <p className='text-gray-700'>{tournament.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs */}
      <div className='bg-white border-b'>
        <div className='max-w-6xl mx-auto px-4'>
          <nav className='flex space-x-8'>
            {['overview', 'matches', 'standings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className='max-w-6xl mx-auto p-4'>
        {activeTab === 'overview' && (
          <div className='space-y-6'>
            {/* Ready to play matches */}
            {playableMatches.length > 0 && (
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                  Ready to Play
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {playableMatches.slice(0, 6).map((match) => (
                    <TournamentMatchCard
                      key={match._id}
                      match={match}
                      onScore={() => handleScoreMatch(match)}
                      showScoreButton={true}
                    />
                  ))}
                </div>
                {playableMatches.length > 6 && (
                  <div className='text-center mt-4'>
                    <button
                      onClick={() => setActiveTab('matches')}
                      className='text-blue-600 hover:text-blue-800 font-medium'
                    >
                      View all {playableMatches.length} playable matches →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Recent results */}
            {matches.some((m) => m.status === 'completed') && (
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                  Recent Results
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {matches
                    .filter((m) => m.status === 'completed')
                    .sort(
                      (a, b) =>
                        new Date(b.completed_at) - new Date(a.completed_at)
                    )
                    .slice(0, 6)
                    .map((match) => (
                      <TournamentMatchCard
                        key={match._id}
                        match={match}
                        showResult={true}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Participants */}
            <div>
              <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                Participants
              </h2>
              <div className='bg-white rounded-lg shadow-sm p-6'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                  {participants
                    .sort((a, b) => (a.seed || 999) - (b.seed || 999))
                    .map((participant) => (
                      <div
                        key={participant._id}
                        className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'
                      >
                        <div className='flex-shrink-0'>
                          <div
                            className={`w-8 h-8 rounded-full ${participant.color} border-2 flex items-center justify-center`}
                          >
                            <span className='text-xs font-bold text-gray-700'>
                              {participant.seed || '?'}
                            </span>
                          </div>
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm font-medium text-gray-900 truncate'>
                            {participant.name}
                          </p>
                          {participant.club && (
                            <p className='text-xs text-gray-500 truncate'>
                              {participant.club}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'matches' && (
          <div className='space-y-6'>
            {playableMatches.length > 0 && (
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                  Ready to Play ({playableMatches.length})
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {playableMatches.map((match) => (
                    <TournamentMatchCard
                      key={match._id}
                      match={match}
                      onScore={() => handleScoreMatch(match)}
                      showScoreButton={true}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className='text-xl font-semibold text-gray-900 mb-4'>
                All Matches
              </h2>
              <div className='space-y-4'>
                {['completed', 'live', 'ready', 'pending'].map((status) => {
                  const statusMatches = matches.filter(
                    (m) => m.status === status
                  );
                  if (statusMatches.length === 0) return null;

                  return (
                    <div key={status}>
                      <h3 className='text-lg font-medium text-gray-700 mb-3 capitalize'>
                        {status} ({statusMatches.length})
                      </h3>
                      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                        {statusMatches.map((match) => (
                          <TournamentMatchCard
                            key={match._id}
                            match={match}
                            onScore={
                              status === 'ready'
                                ? () => handleScoreMatch(match)
                                : null
                            }
                            showScoreButton={status === 'ready'}
                            showResult={status === 'completed'}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <TournamentStandings
            standings={standings}
            format={tournament.format}
            groups={groups}
          />
        )}
      </div>
    </div>
  );
};

export default TournamentDetailScreen;
