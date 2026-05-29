import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
import TeamFixtureScreen from './TeamFixtureScreen';

const TournamentDetailScreen = ({ tournamentId, onBack, onScoreMatch }) => {
  const location = useLocation();
  const reopenProcessedRef = useRef(false);
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
  const [teamFixture, setTeamFixture] = useState(null);
  const [selectedDivision, setSelectedDivision] = useState(0);
  const [filterTeamId, setFilterTeamId] = useState(null);
  const [expandedTeamsDivision, setExpandedTeamsDivision] = useState(null);
  const [addPoolDraft, setAddPoolDraft] = useState(null); // null=hidden, {name,seed}=open
  const [addPoolSaving, setAddPoolSaving] = useState(false);
  const [addPoolError, setAddPoolError] = useState(null);
  const [addExtraDraft, setAddExtraDraft] = useState(null); // null=hidden, {type,name}=open
  const [addExtraSaving, setAddExtraSaving] = useState(false);
  const [addExtraError, setAddExtraError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const pendingAction = useRef(null);

  useEffect(() => {
    loadTournamentData();
  }, [tournamentId]);

  // Auto-refresh every 30s when tournament is active
  useEffect(() => {
    if (!tournament || tournament.status !== 'active') return;
    const interval = setInterval(async () => {
      if (loading) return;
      try {
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
      } catch {
        // Silent — don't surface polling errors
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [tournament?.status, tournamentId]);

  // Auto-reopen a fixture after returning from live scoring
  useEffect(() => {
    const fixtureId = location.state?.reopenFixtureId;
    if (!fixtureId || loading || matches.length === 0 || reopenProcessedRef.current) return;
    reopenProcessedRef.current = true;
    const fixture = matches.find((m) => m._id?.toString() === fixtureId?.toString());
    if (fixture) setTeamFixture(fixture);
    window.history.replaceState({}, '');
  }, [loading, matches]);

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

  const handleEditResult = (match) => {
    withPassphrase(() => setEnterResultMatch(match));
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
      team_round_robin: 'Team Round Robin',
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

  // ── Draft state (individual formats only — team_round_robin has its own view) ─
  if (tournament.status === 'draft' && tournament.format !== 'team_round_robin') {
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

  // ── Team Round Robin view ─────────────────────────────────────────────────
  if (tournament.format === 'team_round_robin') {
    const participantMap = Object.fromEntries(participants.map((p) => [p._id, p]));

    const formatFixtureDate = (iso) => {
      if (!iso) return null;
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    // Group fixtures by division group
    const fixturesByGroup = groups.reduce((acc, g) => {
      acc[g._id] = { group: g, fixtures: [] };
      return acc;
    }, {});
    matches.forEach((m) => {
      if (m.group_id && fixturesByGroup[m.group_id]) {
        fixturesByGroup[m.group_id].fixtures.push(m);
      }
    });

    // Group participants into divisions (used for draft preview)
    const divCount = tournament.config?.divisions?.count || 2;
    const draftDivisions = Array.from({ length: divCount }, (_, i) => ({
      name: `Division ${String.fromCharCode(65 + i)}`,
      teams: participants
        .filter((p) => !p.is_pool && p.player_type == null && (p.division_index ?? 0) === i)
        .sort((a, b) => (a.seed || 999) - (b.seed || 999)),
    }));

    const statusLabel = tournament.status === 'draft' ? 'Draft'
      : tournament.status === 'active' ? 'In Progress' : 'Completed';
    const statusClass = tournament.status === 'active' ? 'bg-green-100 text-green-700'
      : tournament.status === 'completed' ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-600';

    // Fixture screen takes over the whole view
    if (teamFixture) {
      const tA = participantMap[teamFixture.participant_a?.participant_id] ??
        participants.find((p) => p._id?.toString() === teamFixture.participant_a?.participant_id?.toString());
      const tB = participantMap[teamFixture.participant_b?.participant_id] ??
        participants.find((p) => p._id?.toString() === teamFixture.participant_b?.participant_id?.toString());
      if (tA && tB) {
        return (
          <TeamFixtureScreen
            fixture={teamFixture}
            teamA={tA}
            teamB={tB}
            tournamentId={tournamentId}
            passphrase={getCachedPassphrase(tournamentId)}
            matchConfig={tournament.config?.match || {}}
            poolPlayers={participants.filter((p) => p.player_type === 'pool' || p.is_pool)}
            racketballPlayers={participants.filter((p) => p.player_type === 'racketball')}
            beginnerPlayers={participants.filter((p) => p.player_type === 'beginner')}
            onBack={() => { setTeamFixture(null); loadTournamentData(); }}
            onResultSaved={() => { setTeamFixture(null); loadTournamentData(); }}
            onScoreMatch={onScoreMatch}
          />
        );
      }
    }

    return (
      <div className='min-h-screen bg-gray-50 flex flex-col'>
        {/* Header */}
        <div className='bg-white shadow-sm shrink-0'>
          <div className='px-4 lg:px-8 py-4 flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 min-w-0'>
              <button onClick={onBack} className='p-1.5 text-gray-500 hover:text-gray-700 shrink-0'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
                </svg>
              </button>
              <div className='min-w-0'>
                <h1 className='text-base lg:text-xl font-bold text-gray-900 truncate'>{tournament.name}</h1>
                <div className='hidden sm:flex items-center gap-2 mt-0.5'>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
                    {statusLabel}
                  </span>
                  <span className='text-xs text-gray-400'>
                    {divCount} divisions · {participants.length} teams
                  </span>
                </div>
              </div>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              {tournament.status === 'draft' && (
                <>
                  <button onClick={handleEditTournament} className='px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'>
                    Edit
                  </button>
                  <button onClick={handleStartTournament} className='px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium'>
                    <span className='sm:hidden'>Start</span>
                    <span className='hidden sm:inline'>Start Tournament</span>
                  </button>
                </>
              )}
              {tournament.status === 'active' && (
                <button onClick={handleEdit} className='p-2 text-gray-500 hover:text-gray-700' title='Edit tournament'>
                  <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Division tabs + Teams tab */}
        {(() => {
          const divTabNames = tournament.status === 'draft'
            ? draftDivisions.map((d) => d.name)
            : Object.values(fixturesByGroup).sort((a, b) => a.group.name.localeCompare(b.group.name)).map(({ group }) => group.name);
          const allTabs = [...divTabNames, 'Teams'];
          return (
            <div className='bg-white border-b shrink-0 px-4 lg:px-8 py-3'>
              <div className='flex gap-2 sm:inline-flex'>
                {allTabs.map((name, i) => {
                  const isTeamsTab = name === 'Teams';
                  const isSelected = isTeamsTab
                    ? selectedDivision === 'teams'
                    : selectedDivision === i;
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        setFilterTeamId(null);
                        setSelectedDivision(isTeamsTab ? 'teams' : i);
                      }}
                      className={`flex-1 sm:flex-none sm:px-10 py-3 rounded-xl text-base font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div className='flex-1 overflow-y-auto'>
        <div className='max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6'>
          {actionError && (
            <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm'>
              {actionError}
            </div>
          )}

          {/* ── Draft: show division/team/roster cards ── */}
          {tournament.status === 'draft' && selectedDivision !== 'teams' && (
            <div className='space-y-4'>
              <div className='bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800'>
                Tournament is in draft. Click <strong>Start Tournament</strong> to generate all fixtures.
              </div>
              {draftDivisions.filter((_, i) => i === selectedDivision).map((div, divIdx) => {
                // Build fixture slots for this division
                const fixtureDates = tournament.config?.fixture_dates || {};
                const divNum = selectedDivision + 1;
                const slots = [];
                let n = 1;
                for (let i = 0; i < div.teams.length; i++) {
                  for (let j = i + 1; j < div.teams.length; j++) {
                    const key = `D${divNum}F${n}`;
                    slots.push({ key, teamA: div.teams[i].name, teamB: div.teams[j].name, date: fixtureDates[key] });
                    n++;
                  }
                }

                return (
                <div key={divIdx} className='space-y-4'>
                  {/* Team roster cards */}
                  <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                    <div className='px-4 py-3 bg-gray-50 border-b flex items-center justify-between'>
                      <h2 className='font-bold text-gray-800'>{div.name}</h2>
                      <span className='text-xs text-gray-400'>{div.teams.length} teams</span>
                    </div>
                    <div className='divide-y divide-gray-100'>
                      {div.teams.map((team) => (
                        <div key={team._id} className='px-4 py-3'>
                          <p className='font-semibold text-gray-800 text-sm mb-2'>{team.name}</p>
                          <div className='grid grid-cols-5 gap-2'>
                            {[1, 2, 3, 4, 5].map((sn) => {
                              const player = team.roster?.find((r) => r.string_number === sn);
                              return (
                                <div key={sn} className='text-center'>
                                  <span className='block text-xs text-gray-400 mb-0.5'>S{sn}</span>
                                  <span className='block text-xs font-medium text-gray-700 truncate'>
                                    {player?.player_name || <span className='text-gray-300'>—</span>}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {div.teams.length === 0 && (
                        <p className='px-4 py-3 text-sm text-gray-400'>No teams assigned</p>
                      )}
                    </div>
                  </div>

                  {/* Fixture schedule */}
                  {slots.length > 0 && (
                    <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                      <div className='px-4 py-3 bg-gray-50 border-b'>
                        <h2 className='font-bold text-gray-800'>Fixture Schedule</h2>
                      </div>
                      <div className='divide-y divide-gray-100'>
                        {slots.map((slot) => (
                          <div key={slot.key} className='flex items-center gap-3 px-4 py-3'>
                            <div className='flex-1 min-w-0 text-sm text-gray-700'>
                              <span className='font-medium'>{slot.teamA}</span>
                              <span className='text-gray-400 mx-2'>vs</span>
                              <span className='font-medium'>{slot.teamB}</span>
                            </div>
                            <span className='text-sm text-gray-500 shrink-0'>
                              {slot.date
                                ? new Date(slot.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                                : <span className='text-gray-300'>No date set</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}

          {/* Division standings + fixtures (active/completed state) */}
          {Object.values(fixturesByGroup).length > 0 && selectedDivision !== 'teams' && (
          <div className='space-y-6'>
          {Object.values(fixturesByGroup).sort((a, b) => a.group.name.localeCompare(b.group.name)).filter((_, i) => i === selectedDivision).map(({ group, fixtures }) => {
            const standings = group.standings || [];
            const sortedFixtures = [...fixtures].sort((a, b) => {
              const aDate = a.scheduled_at ? new Date(a.scheduled_at) : null;
              const bDate = b.scheduled_at ? new Date(b.scheduled_at) : null;
              if (aDate && bDate) return aDate - bDate;
              if (aDate) return -1;
              if (bDate) return 1;
              return (a.match_number || '').localeCompare(b.match_number || '');
            });

            return (
              <div key={group._id} className='bg-white rounded-xl shadow-sm overflow-hidden'>
                <div className='px-4 py-3 bg-gray-50 border-b'>
                  <h2 className='font-bold text-gray-800'>{group.name}</h2>
                </div>

                {/* Standings table */}
                {standings.length > 0 && (
                  <div className='overflow-x-auto'>
                    <table className='w-full text-sm'>
                      <thead>
                        <tr className='text-xs text-gray-500 uppercase border-b'>
                          <th className='text-left px-4 py-2'>#</th>
                          <th className='text-left px-4 py-2'>Team</th>
                          <th className='text-center px-2 py-2'>P</th>
                          <th className='text-center px-2 py-2'>W</th>
                          <th className='text-center px-2 py-2'>L</th>
                          <th className='text-center px-2 py-2'>GF</th>
                          <th className='text-center px-2 py-2'>GA</th>
                          <th className='text-center px-2 py-2'>+/-</th>
                          <th className='text-center px-2 py-2 font-bold'>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((row, i) => (
                          <tr
                            key={i}
                            onClick={() => setFilterTeamId(filterTeamId === row.participant_id ? null : row.participant_id)}
                            className={`border-b last:border-0 cursor-pointer transition-colors ${
                              filterTeamId === row.participant_id ? 'bg-blue-50' : 'hover:bg-blue-50'
                            }`}
                          >
                            <td className='px-4 py-2 text-gray-400 font-medium'>{i + 1}</td>
                            <td className={`px-4 py-2 font-semibold ${filterTeamId === row.participant_id ? 'text-blue-700' : 'text-gray-800'}`}>
                              {row.name}
                            </td>
                            <td className='text-center px-2 py-2 text-gray-600'>{row.played}</td>
                            <td className='text-center px-2 py-2 text-gray-600'>{row.wins}</td>
                            <td className='text-center px-2 py-2 text-gray-600'>{row.losses}</td>
                            <td className='text-center px-2 py-2 text-gray-600'>{row.games_won}</td>
                            <td className='text-center px-2 py-2 text-gray-600'>{row.games_lost}</td>
                            <td className={`text-center px-2 py-2 font-medium ${
                              row.games_won - row.games_lost > 0 ? 'text-green-600' :
                              row.games_won - row.games_lost < 0 ? 'text-red-500' : 'text-gray-500'
                            }`}>
                              {row.games_won - row.games_lost > 0 ? '+' : ''}{row.games_won - row.games_lost}
                            </td>
                            <td className='text-center px-2 py-2 font-bold text-gray-800'>{row.league_points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Fixtures list */}
                {sortedFixtures.length > 0 && (
                  <div className='border-t'>
                    <div className='px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 flex items-center justify-between'>
                      <span>Fixtures</span>
                      {filterTeamId && (
                        <span className='text-xs font-normal text-blue-600 normal-case tracking-normal'>
                          Showing {standings.find((r) => r.participant_id === filterTeamId)?.name ?? 'team'} only
                        </span>
                      )}
                    </div>
                    {sortedFixtures
                      .filter((f) => !filterTeamId || f.participant_a?.participant_id === filterTeamId || f.participant_b?.participant_id === filterTeamId)
                      .map((fixture) => {
                      const tA = participantMap[fixture.participant_a?.participant_id];
                      const tB = participantMap[fixture.participant_b?.participant_id];
                      const done = fixture.status === 'completed' || fixture.status === 'walkover';
                      const result = fixture.result;
                      const draftCount = fixture.draft_string_results?.length ?? 0;
                      const hasRB = !!(fixture.team_a_racketball_player && fixture.team_b_racketball_player);
                      const hasBG = !!(fixture.team_a_beginner_player && fixture.team_b_beginner_player);
                      const extraTotal = (hasRB ? 1 : 0) + (hasBG ? 1 : 0);
                      const extraDone = (hasRB && fixture.racketball_result?.team_a_games != null ? 1 : 0)
                                      + (hasBG && fixture.beginner_result?.team_a_games != null ? 1 : 0);
                      const totalMatches = 5 + extraTotal;
                      const doneCount = draftCount + extraDone;
                      const inProgress = !done && doneCount > 0;
                      const bothConfirmed = !done && !inProgress && fixture.team_a_confirmed && fixture.team_b_confirmed;
                      const fixtureDate = formatFixtureDate(fixture.scheduled_at);

                      let statusPill;
                      if (done) {
                        statusPill = (
                          <span className='text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap'>
                            Complete
                          </span>
                        );
                      } else if (inProgress) {
                        statusPill = (
                          <span className='text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap'>
                            In Progress {doneCount}/{totalMatches}
                          </span>
                        );
                      } else if (bothConfirmed) {
                        statusPill = (
                          <span className='text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap'>
                            Ready
                          </span>
                        );
                      } else {
                        statusPill = null;
                      }

                      return (
                        <button
                          key={fixture._id}
                          onClick={() => {
                            if (done) {
                              withPassphrase(() => setTeamFixture(fixture));
                            } else {
                              setTeamFixture(fixture);
                            }
                          }}
                          className='w-full flex items-center gap-3 px-4 py-4 border-b last:border-0 text-left transition-colors hover:bg-blue-50 active:bg-blue-100'
                        >
                          {/* Team names + score */}
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center gap-2 flex-wrap'>
                              <span className='font-bold text-base text-gray-900'>
                                {fixture.participant_a?.name || '?'}
                              </span>
                              <span className='text-gray-400 text-sm'>vs</span>
                              <span className='font-bold text-base text-gray-900'>
                                {fixture.participant_b?.name || '?'}
                              </span>
                            </div>
                            {done && result && (
                              <p className='text-sm text-gray-500 mt-0.5'>
                                {result.team_a_games_total} – {result.team_b_games_total} games
                              </p>
                            )}
                          </div>

                          {/* Date + status pill */}
                          <div className='shrink-0 flex items-center gap-2'>
                            {fixtureDate && (
                              <span className='text-sm text-gray-400 whitespace-nowrap'>{fixtureDate}</span>
                            )}
                            {statusPill}
                          </div>
                        </button>
                      );
                    })}
                    {filterTeamId && (
                      <div className='px-4 py-3 border-t bg-gray-50 text-center'>
                        <button
                          onClick={() => setFilterTeamId(null)}
                          className='text-sm font-medium text-blue-600 hover:text-blue-800'
                        >
                          Show all fixtures
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
          )}

          {/* ── Teams view ── */}
          {selectedDivision === 'teams' && (() => {
            const poolPlayers = participants.filter((p) => p.is_pool);
            const poolGroups = [
              { label: '1', seeds: [1] },
              { label: '2', seeds: [2] },
              { label: '3', seeds: [3] },
              { label: '4/5', seeds: [4, 5] },
            ].map((g) => ({
              ...g,
              players: poolPlayers.filter((p) => g.seeds.includes(p.seed)),
            }));

            const racketballPlayers = participants.filter((p) => p.player_type === 'racketball');
            const beginnerPlayers = participants.filter((p) => p.player_type === 'beginner');

            return (
            <div className='space-y-3'>
              {draftDivisions.map((div, divIdx) => {
                const isOpen = expandedTeamsDivision === divIdx;
                return (
                  <div key={divIdx} className='bg-white rounded-xl shadow-sm overflow-hidden'>
                    {/* Accordion header */}
                    <button
                      onClick={() => setExpandedTeamsDivision(isOpen ? null : divIdx)}
                      className='w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none'
                    >
                      <span className='font-bold text-gray-900'>{div.name}</span>
                      <div className='flex items-center gap-2 shrink-0'>
                        <span className='text-xs text-gray-400'>{div.teams.length} teams</span>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill='none' stroke='currentColor' viewBox='0 0 24 24'
                        >
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded team list */}
                    {isOpen && (
                      <div className='border-t p-4'>
                        {div.teams.length === 0 && (
                          <p className='text-sm text-gray-400 italic'>No teams assigned</p>
                        )}
                        <div className='grid grid-cols-2 gap-3'>
                          {div.teams.map((team) => {
                            const roster = [1, 2, 3, 4, 5]
                              .map((sn) => ({ sn, player: team.roster?.find((r) => r.string_number === sn) }))
                              .filter(({ player }) => player);
                            return (
                              <div key={team._id} className='bg-gray-50 rounded-lg px-3 py-3'>
                                <p className='font-semibold text-gray-800 text-sm mb-2'>{team.name}</p>
                                {roster.length === 0 ? (
                                  <p className='text-xs text-gray-400 italic'>No players added</p>
                                ) : (
                                  <div className='space-y-1.5'>
                                    {roster.map(({ sn, player }) => (
                                      <div key={sn} className='flex items-center gap-2'>
                                        <span className='text-xs font-bold text-gray-400 w-5 shrink-0'>S{sn}</span>
                                        <span className='text-sm text-gray-700 flex-1 min-w-0 truncate'>{player.player_name}</span>
                                        {player.is_captain && (
                                          <span className='text-xs font-medium text-blue-500 shrink-0'>C</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pool players */}
              <div className='bg-white rounded-xl shadow-sm overflow-hidden'>
                <button
                  onClick={() => setExpandedTeamsDivision(expandedTeamsDivision === 'pool' ? null : 'pool')}
                  className='w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none'
                >
                  <span className='font-bold text-gray-900'>Pool</span>
                  <div className='flex items-center gap-2 shrink-0'>
                    <span className='text-xs text-gray-400'>{poolPlayers.length} players</span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedTeamsDivision === 'pool' ? 'rotate-180' : ''}`}
                      fill='none' stroke='currentColor' viewBox='0 0 24 24'
                    >
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                    </svg>
                  </div>
                </button>
                {expandedTeamsDivision === 'pool' && (
                  <div className='border-t p-4 space-y-4'>
                    {/* Player groups */}
                    {poolPlayers.length === 0 && !addPoolDraft && (
                      <p className='text-sm text-gray-400 italic'>No pool players added yet</p>
                    )}
                    {poolGroups.filter((g) => g.players.length > 0).length > 0 && (
                      <div className='grid grid-cols-2 gap-3'>
                        {poolGroups.filter((g) => g.players.length > 0).map((g) => (
                          <div key={g.label} className='bg-gray-50 rounded-lg px-3 py-3'>
                            <p className='font-semibold text-gray-800 text-sm mb-2'>String {g.label}</p>
                            <div className='space-y-1.5'>
                              {g.players.map((p) => (
                                <div key={p._id} className='text-sm text-gray-700 truncate'>{p.name}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add player form */}
                    {addPoolDraft ? (
                      <div className='border border-gray-200 rounded-xl p-4 space-y-4'>
                        <p className='text-sm font-semibold text-gray-700'>New pool player</p>

                        <div>
                          <label className='block text-xs text-gray-500 mb-1'>Name</label>
                          <input
                            type='text'
                            value={addPoolDraft.name}
                            onChange={(e) => setAddPoolDraft((d) => ({ ...d, name: e.target.value }))}
                            placeholder='Player name'
                            className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                          />
                        </div>

                        <div>
                          <label className='block text-xs text-gray-500 mb-2'>String</label>
                          <div className='flex gap-2'>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                onClick={() => setAddPoolDraft((d) => ({ ...d, seed: s }))}
                                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                  addPoolDraft.seed === s
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>

                        {addPoolError && (
                          <p className='text-xs text-red-600'>{addPoolError}</p>
                        )}

                        <div className='flex gap-2'>
                          <button
                            onClick={() => { setAddPoolDraft(null); setAddPoolError(null); }}
                            className='flex-1 py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors'
                          >
                            Cancel
                          </button>
                          <button
                            disabled={!addPoolDraft.name.trim() || !addPoolDraft.seed || addPoolSaving}
                            onClick={async () => {
                              setAddPoolSaving(true);
                              setAddPoolError(null);
                              try {
                                const passphrase = getCachedPassphrase(tournamentId);
                                await api.addTournamentParticipant(
                                  tournamentId,
                                  {
                                    name: addPoolDraft.name.trim(),
                                    seed: addPoolDraft.seed,
                                    is_pool: true,
                                  },
                                  passphrase
                                );
                                setAddPoolDraft(null);
                                await loadTournamentData();
                              } catch (err) {
                                setAddPoolError(err.message || 'Failed to add player');
                              } finally {
                                setAddPoolSaving(false);
                              }
                            }}
                            className='flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                          >
                            {addPoolSaving ? 'Saving…' : 'Add player'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => withPassphrase(() => setAddPoolDraft({ name: '', seed: null }))}
                        className='w-full py-2.5 text-sm font-semibold border border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors'
                      >
                        + Add pool player
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Racketball and Beginner sections */}
              {[
                { key: 'racketball', label: 'Racketball', players: racketballPlayers },
                { key: 'beginner',   label: 'Beginners',  players: beginnerPlayers   },
              ].map(({ key, label, players }) => (
                <div key={key} className='bg-white rounded-xl shadow-sm overflow-hidden'>
                  <button
                    onClick={() => setExpandedTeamsDivision(expandedTeamsDivision === key ? null : key)}
                    className='w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none'
                  >
                    <span className='font-bold text-gray-900'>{label}</span>
                    <div className='flex items-center gap-2 shrink-0'>
                      <span className='text-xs text-gray-400'>{players.length} players</span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedTeamsDivision === key ? 'rotate-180' : ''}`}
                        fill='none' stroke='currentColor' viewBox='0 0 24 24'
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                      </svg>
                    </div>
                  </button>
                  {expandedTeamsDivision === key && (
                    <div className='border-t p-4 space-y-3'>
                      {players.length > 0 && (
                        <div className='space-y-1.5'>
                          {players.map((p) => (
                            <div key={p._id} className='text-sm text-gray-700'>{p.name}</div>
                          ))}
                        </div>
                      )}
                      {players.length === 0 && !addExtraDraft && (
                        <p className='text-sm text-gray-400 italic'>No players added yet</p>
                      )}

                      {/* Add player form */}
                      {addExtraDraft?.type === key ? (
                        <div className='border border-gray-200 rounded-xl p-4 space-y-3'>
                          <p className='text-sm font-semibold text-gray-700'>New {label.toLowerCase()} player</p>
                          <input
                            type='text'
                            value={addExtraDraft.name}
                            onChange={(e) => setAddExtraDraft((d) => ({ ...d, name: e.target.value }))}
                            placeholder='Player name'
                            className='w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300'
                          />
                          {addExtraError && <p className='text-xs text-red-600'>{addExtraError}</p>}
                          <div className='flex gap-2'>
                            <button
                              onClick={() => { setAddExtraDraft(null); setAddExtraError(null); }}
                              className='flex-1 py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors'
                            >
                              Cancel
                            </button>
                            <button
                              disabled={!addExtraDraft.name.trim() || addExtraSaving}
                              onClick={async () => {
                                setAddExtraSaving(true);
                                setAddExtraError(null);
                                try {
                                  const passphrase = getCachedPassphrase(tournamentId);
                                  await api.addTournamentParticipant(
                                    tournamentId,
                                    { name: addExtraDraft.name.trim(), player_type: key },
                                    passphrase
                                  );
                                  setAddExtraDraft(null);
                                  await loadTournamentData();
                                } catch (err) {
                                  setAddExtraError(err.message || 'Failed to add player');
                                } finally {
                                  setAddExtraSaving(false);
                                }
                              }}
                              className='flex-1 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                            >
                              {addExtraSaving ? 'Saving…' : 'Add player'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => withPassphrase(() => setAddExtraDraft({ type: key, name: '' }))}
                          className='w-full py-2.5 text-sm font-semibold border border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors'
                        >
                          + Add {label.toLowerCase()} player
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            );
          })()}
        </div>
        </div>


        {showPassphraseModal && (
          <PassphraseModal
            tournamentId={tournamentId}
            onSuccess={handlePassphraseSuccess}
            onCancel={() => { setShowPassphraseModal(false); pendingAction.current = null; }}
          />
        )}
        {showEditModal && (
          <CreateTournamentModal
            tournament={tournament}
            participants={participants}
            onClose={() => setShowEditModal(false)}
            onUpdate={async (data) => {
              await api.updateTournament(tournamentId, data, getCachedPassphrase(tournamentId));
              setShowEditModal(false);
              loadTournamentData();
            }}
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
          onEditResult={handleEditResult}
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
            passphrase={getCachedPassphrase(tournamentId)}
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
