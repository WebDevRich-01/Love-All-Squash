import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import TournamentMatchCard from './TournamentMatchCard';
import TournamentStandings from './TournamentStandings';
import MonradTournamentView from './MonradTournamentView';
import PassphraseModal, { getCachedPassphrase } from './PassphraseModal';
import EditParticipantsModal from './EditParticipantsModal';
import CreateTournamentModal from './CreateTournamentModal';
import EnterResultModal from './EnterResultModal';
import TournamentEditOptionsModal from './TournamentEditOptionsModal';
import HandicapSetupModal from './HandicapSetupModal';

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

  // Passphrase / edit state
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditOptionsModal, setShowEditOptionsModal] = useState(false);
  const [showEditParticipantsModal, setShowEditParticipantsModal] = useState(false);
  const [enterResultMatch, setEnterResultMatch] = useState(null);
  const [handicapMatch, setHandicapMatch] = useState(null);
  const [actionError, setActionError] = useState(null);
  const pendingAction = useRef(null);

  useEffect(() => {
    loadTournamentData();
  }, [tournamentId]);

  const loadTournamentData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTournament(tournamentId);
      setTournament(data.tournament);
      setParticipants(data.participants);
      setMatches(data.matches);
      setGroups(data.groups);

      if (data.tournament.status !== 'draft') {
        const [standingsData, playableData] = await Promise.all([
          api.getTournamentStandings(tournamentId),
          api.getPlayableTournamentMatches(tournamentId),
        ]);
        setStandings(standingsData);
        setPlayableMatches(playableData);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading tournament:', err);
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  // Ensure we have a passphrase before running an action —
  // if cached in sessionStorage, use it directly; otherwise prompt.
  const withPassphrase = (action) => {
    const cached = getCachedPassphrase(tournamentId);
    if (cached) {
      action(cached);
    } else {
      pendingAction.current = action;
      setShowPassphraseModal(true);
    }
  };

  const handlePassphraseSuccess = (passphrase) => {
    setShowPassphraseModal(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    if (action) action(passphrase);
  };

  const handleStartTournament = () => {
    withPassphrase(async (passphrase) => {
      setActionError(null);
      try {
        await api.startTournament(tournamentId, passphrase);
        await loadTournamentData();
      } catch (err) {
        setActionError(err.message || 'Failed to start tournament');
      }
    });
  };

  const handleEditTournament = () => {
    withPassphrase(() => setShowEditModal(true));
  };

  // Opens the edit options modal (edit players OR reset) — used for active tournaments
  const handleEdit = () => {
    withPassphrase(() => setShowEditOptionsModal(true));
  };

  // Called from within the edit options modal
  const handleEditPlayers = () => {
    setShowEditParticipantsModal(true);
  };

  const handleTournamentUpdate = async (data) => {
    const passphrase = getCachedPassphrase(tournamentId);
    await api.updateTournament(tournamentId, data, passphrase);
    setShowEditModal(false);
    await loadTournamentData();
  };

  const handleScoreMatch = (matchContext) => {
    const context = {
      tournamentId: matchContext.tournamentId || tournament._id,
      matchId: matchContext.matchId || matchContext._id,
      player1Name: matchContext.player1Name || matchContext.participant_a?.name,
      player2Name: matchContext.player2Name || matchContext.participant_b?.name,
      player1Id: matchContext.player1Id || matchContext.participant_a?.participant_id,
      player2Id: matchContext.player2Id || matchContext.participant_b?.participant_id,
      participant_a: matchContext.participant_a,
      participant_b: matchContext.participant_b,
      isTournamentMatch: true,
      matchConfig: tournament?.config?.match || {},
    };

    if (tournament?.config?.match?.is_handicap) {
      setHandicapMatch(context);
    } else {
      onScoreMatch(context);
    }
  };

  const handleEnterResult = (match) => {
    setEnterResultMatch(match);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormatDisplayName = (format) => {
    const names = {
      single_elimination: 'Single Elimination',
      monrad: 'Monrad (Swiss)',
    };
    return names[format] || format;
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-lg text-gray-600'>Loading tournament...</div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='text-lg text-red-600 mb-4'>{error || 'Tournament not found'}</div>
          <button onClick={onBack} className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700'>
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  // ── Draft state ──────────────────────────────────────────────────────────────
  if (tournament.status === 'draft') {
    const mc = tournament.config?.match || {};
    return (
      <div className='min-h-screen bg-gray-50'>
        {/* Header */}
        <div className='bg-white shadow-sm'>
          <div className='max-w-3xl mx-auto px-4 py-6'>
            <div className='flex items-center gap-4 mb-4'>
              <button onClick={onBack} className='p-2 text-gray-600 hover:text-gray-800'>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                </svg>
              </button>
              <div className='flex-1'>
                <h1 className='text-2xl font-bold text-gray-900'>{tournament.name}</h1>
                <div className='flex items-center gap-3 mt-1'>
                  <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700'>
                    Draft
                  </span>
                  <span className='text-sm text-gray-500'>{getFormatDisplayName(tournament.format)}</span>
                  <span className='text-sm text-gray-500'>{participants.length} players</span>
                </div>
              </div>
            </div>

            {actionError && (
              <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4'>
                {actionError}
              </div>
            )}

            <div className='flex gap-3'>
              <button
                onClick={handleEditTournament}
                className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium'
              >
                Edit Tournament
              </button>
              <button
                onClick={handleStartTournament}
                disabled={participants.length < 4}
                className='flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Start Tournament
              </button>
            </div>
          </div>
        </div>

        {/* Details & participants */}
        <div className='max-w-3xl mx-auto px-4 py-6 space-y-6'>
          {/* Match settings summary */}
          <div className='bg-white rounded-lg shadow-sm p-4'>
            <h2 className='font-semibold text-gray-900 mb-3'>Match Settings</h2>
            <div className='flex gap-6 text-sm text-gray-600'>
              <span>{mc.points_to_win || 15} points to win</span>
              <span>Best of {mc.best_of || 5}</span>
              <span>{mc.clear_points === 1 ? 'No clear required' : '2 clear'}</span>
            </div>
          </div>

          {/* Optional metadata */}
          {(tournament.venue || tournament.start_date || tournament.description) && (
            <div className='bg-white rounded-lg shadow-sm p-4 text-sm text-gray-600 space-y-1'>
              {tournament.venue && <div>Venue: {tournament.venue}</div>}
              {tournament.start_date && <div>Date: {tournament.start_date}</div>}
              {tournament.description && <div className='mt-2'>{tournament.description}</div>}
            </div>
          )}

          {/* Participants */}
          <div className='bg-white rounded-lg shadow-sm p-4'>
            <h2 className='font-semibold text-gray-900 mb-3'>
              Players ({participants.length})
            </h2>
            {participants.length === 0 ? (
              <p className='text-sm text-gray-500'>No players added yet.</p>
            ) : (
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
                {[...participants]
                  .sort((a, b) => (a.seed || 999) - (b.seed || 999))
                  .map((p) => (
                    <div key={p._id} className='flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm'>
                      <span className='text-gray-400 text-xs w-5 text-right'>#{p.seed}</span>
                      <span className='font-medium truncate'>{p.name}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Passphrase modal */}
        {showPassphraseModal && (
          <PassphraseModal
            tournamentId={tournamentId}
            onSuccess={handlePassphraseSuccess}
            onCancel={() => { setShowPassphraseModal(false); pendingAction.current = null; }}
          />
        )}

        {/* Edit tournament modal */}
        {showEditModal && (
          <CreateTournamentModal
            onClose={() => setShowEditModal(false)}
            onUpdate={handleTournamentUpdate}
            tournament={tournament}
            participants={participants}
          />
        )}
      </div>
    );
  }

  // ── Active / completed — Monrad gets its own view ─────────────────────────
  if (tournament.format === 'monrad') {
    return (
      <>
        <MonradTournamentView
          tournament={tournament}
          participants={participants}
          matches={matches}
          onScoreMatch={handleScoreMatch}
          onEnterResult={handleEnterResult}
          onBack={onBack}
          onEdit={handleEdit}
          isHandicap={!!tournament?.config?.match?.is_handicap}
        />
        {showPassphraseModal && (
          <PassphraseModal
            tournamentId={tournamentId}
            onSuccess={handlePassphraseSuccess}
            onCancel={() => { setShowPassphraseModal(false); pendingAction.current = null; }}
          />
        )}
        {showEditOptionsModal && (
          <TournamentEditOptionsModal
            tournamentId={tournamentId}
            passphrase={getCachedPassphrase(tournamentId)}
            onEditPlayers={handleEditPlayers}
            onReset={() => { setShowEditOptionsModal(false); loadTournamentData(); }}
            onClose={() => setShowEditOptionsModal(false)}
          />
        )}
        {showEditParticipantsModal && (
          <EditParticipantsModal
            tournamentId={tournamentId}
            participants={participants}
            passphrase={getCachedPassphrase(tournamentId)}
            onSave={() => { setShowEditParticipantsModal(false); loadTournamentData(); }}
            onCancel={() => setShowEditParticipantsModal(false)}
          />
        )}
        {enterResultMatch && (
          <EnterResultModal
            match={enterResultMatch}
            tournamentId={tournamentId}
            matchConfig={tournament?.config?.match}
            isHandicap={!!(tournament?.config?.match?.is_handicap)}
            onSave={() => { setEnterResultMatch(null); loadTournamentData(); }}
            onCancel={() => setEnterResultMatch(null)}
          />
        )}
        {handicapMatch && (
          <HandicapSetupModal
            player1Name={handicapMatch.player1Name}
            player2Name={handicapMatch.player2Name}
            onConfirm={(p1Start, p2Start) => {
              setHandicapMatch(null);
              onScoreMatch({ ...handicapMatch, player1StartScore: p1Start, player2StartScore: p2Start });
            }}
            onCancel={() => setHandicapMatch(null)}
          />
        )}
      </>
    );
  }

  // ── Single elimination (and any other active format) ──────────────────────
  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm'>
        <div className='max-w-6xl mx-auto px-4 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button onClick={onBack} className='p-2 text-gray-600 hover:text-gray-800 transition-colors'>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                </svg>
              </button>
              <div>
                <h1 className='text-3xl font-bold text-gray-900'>{tournament.name}</h1>
                <div className='flex items-center space-x-4 mt-2'>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(tournament.status)}`}>
                    {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                  </span>
                  <span className='text-gray-600'>{getFormatDisplayName(tournament.format)}</span>
                  <span className='text-gray-600'>{participants.length} participants</span>
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
                onClick={handleEdit}
                className='px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium'
              >
                Edit
              </button>
              <button onClick={loadTournamentData} className='p-2 text-gray-600 hover:text-gray-800 transition-colors' title='Refresh'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' />
                </svg>
              </button>
            </div>
          </div>
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
            {playableMatches.length > 0 && (
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-4'>Ready to Play</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {playableMatches.slice(0, 6).map((match) => (
                    <TournamentMatchCard key={match._id} match={match} onScore={() => handleScoreMatch(match)} onEnterResult={() => handleEnterResult(match)} showScoreButton />
                  ))}
                </div>
              </div>
            )}

            {matches.some((m) => m.status === 'completed') && (
              <div>
                <h2 className='text-xl font-semibold text-gray-900 mb-4'>Recent Results</h2>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {matches
                    .filter((m) => m.status === 'completed')
                    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
                    .slice(0, 6)
                    .map((match) => (
                      <TournamentMatchCard key={match._id} match={match} showResult />
                    ))}
                </div>
              </div>
            )}

            <div>
              <h2 className='text-xl font-semibold text-gray-900 mb-4'>Participants</h2>
              <div className='bg-white rounded-lg shadow-sm p-6'>
                <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                  {[...participants]
                    .sort((a, b) => (a.seed || 999) - (b.seed || 999))
                    .map((p) => (
                      <div key={p._id} className='flex items-center space-x-3 p-3 bg-gray-50 rounded-lg'>
                        <div className={`w-8 h-8 rounded-full ${p.color} border-2 flex items-center justify-center flex-shrink-0`}>
                          <span className='text-xs font-bold text-gray-700'>{p.seed || '?'}</span>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-sm font-medium text-gray-900 truncate'>{p.name}</p>
                          {p.club && <p className='text-xs text-gray-500 truncate'>{p.club}</p>}
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
            {['completed', 'live', 'ready', 'pending'].map((status) => {
              const statusMatches = matches.filter((m) => m.status === status);
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
                        onScore={status === 'ready' ? () => handleScoreMatch(match) : null}
                        onEnterResult={status === 'ready' ? () => handleEnterResult(match) : null}
                        showScoreButton={status === 'ready'}
                        showResult={status === 'completed'}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'standings' && (
          <TournamentStandings standings={standings} format={tournament.format} groups={groups} />
        )}
      </div>

      {/* Passphrase modal */}
      {showPassphraseModal && (
        <PassphraseModal
          tournamentId={tournamentId}
          onSuccess={handlePassphraseSuccess}
          onCancel={() => { setShowPassphraseModal(false); pendingAction.current = null; }}
        />
      )}

      {/* Edit options modal */}
      {showEditOptionsModal && (
        <TournamentEditOptionsModal
          tournamentId={tournamentId}
          passphrase={getCachedPassphrase(tournamentId)}
          onEditPlayers={handleEditPlayers}
          onReset={() => { setShowEditOptionsModal(false); loadTournamentData(); }}
          onClose={() => setShowEditOptionsModal(false)}
        />
      )}

      {/* Edit players modal */}
      {showEditParticipantsModal && (
        <EditParticipantsModal
          tournamentId={tournamentId}
          participants={participants}
          passphrase={getCachedPassphrase(tournamentId)}
          onSave={() => { setShowEditParticipantsModal(false); loadTournamentData(); }}
          onCancel={() => setShowEditParticipantsModal(false)}
        />
      )}

      {/* Enter result modal */}
      {enterResultMatch && (
        <EnterResultModal
          match={enterResultMatch}
          tournamentId={tournamentId}
          matchConfig={tournament?.config?.match}
          isHandicap={!!(tournament?.config?.match?.is_handicap)}
          onSave={() => { setEnterResultMatch(null); loadTournamentData(); }}
          onCancel={() => setEnterResultMatch(null)}
        />
      )}

      {/* Handicap setup modal */}
      {handicapMatch && (
        <HandicapSetupModal
          player1Name={handicapMatch.player1Name}
          player2Name={handicapMatch.player2Name}
          onConfirm={(p1Start, p2Start) => {
            setHandicapMatch(null);
            onScoreMatch({ ...handicapMatch, player1StartScore: p1Start, player2StartScore: p2Start });
          }}
          onCancel={() => setHandicapMatch(null)}
        />
      )}
    </div>
  );
};

export default TournamentDetailScreen;
