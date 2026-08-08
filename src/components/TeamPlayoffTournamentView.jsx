import { useState } from 'react';
import PropTypes from 'prop-types';
import PlayoffBracketTree from './PlayoffBracketTree';

// Before the tournament starts, no TournamentMatch docs exist yet — but the 4 semi-final
// matchups are already fully determined by each team's division + finishing position, so
// build lightweight preview "matches" (no _id, so PlayoffBracketTree renders them read-only)
// to show the known bracket shape ahead of time.
function buildDraftPreviewMatches(participants, fixtureDates = {}) {
  const byDivisionPosition = (divIndex, position) =>
    participants.find((p) => !p.is_pool && p.player_type == null && (p.division_index ?? 0) === divIndex && p.seed === position);
  const teamRef = (p) => (p ? { type: 'participant', name: p.name } : { type: 'tbd', name: 'TBD' });
  const tbd = { type: 'tbd', name: 'TBD' };

  const stubs = [
    { match_number: 'PINT-SF-A', stage: 'main', round: 1, participant_a: teamRef(byDivisionPosition(0, 1)), participant_b: teamRef(byDivisionPosition(1, 2)) },
    { match_number: 'PINT-SF-B', stage: 'main', round: 1, participant_a: teamRef(byDivisionPosition(0, 2)), participant_b: teamRef(byDivisionPosition(1, 1)) },
    { match_number: 'PINT-F', stage: 'main', round: 2, participant_a: tbd, participant_b: tbd },
    { match_number: 'PINT-3V4', stage: 'main', round: 2, participant_a: tbd, participant_b: tbd },
    { match_number: 'HP-SF-A', stage: 'plate', round: 1, participant_a: teamRef(byDivisionPosition(0, 3)), participant_b: teamRef(byDivisionPosition(1, 4)) },
    { match_number: 'HP-SF-B', stage: 'plate', round: 1, participant_a: teamRef(byDivisionPosition(0, 4)), participant_b: teamRef(byDivisionPosition(1, 3)) },
    { match_number: 'HP-F', stage: 'plate', round: 2, participant_a: tbd, participant_b: tbd },
    { match_number: 'HP-7V8', stage: 'plate', round: 2, participant_a: tbd, participant_b: tbd },
  ];

  return stubs.map((m) => ({
    ...m,
    status: 'pending',
    result: null,
    ...(fixtureDates[m.match_number] && { scheduled_at: fixtureDates[m.match_number] }),
  }));
}

const TeamPlayoffTournamentView = ({
  tournament,
  participants,
  matches,
  onBack,
  onEditTournament,
  onStartTournament,
  onEdit,
  onOpenFixture,
  actionError,
}) => {
  const [tab, setTab] = useState('bracket');
  const [expandedExtras, setExpandedExtras] = useState(null); // null | 'pool' | 'racketball' | 'beginner'

  const statusLabel = tournament.status === 'draft' ? 'Draft' : tournament.status === 'active' ? 'In Progress' : 'Completed';
  const statusClass = tournament.status === 'active'
    ? 'bg-green-100 text-green-700'
    : tournament.status === 'completed'
    ? 'bg-blue-100 text-blue-700'
    : 'bg-gray-100 text-gray-600';

  const divisions = [0, 1].map((i) => ({
    name: `Division ${String.fromCharCode(65 + i)}`,
    teams: participants
      .filter((p) => !p.is_pool && p.player_type == null && (p.division_index ?? 0) === i)
      .sort((a, b) => (a.seed || 999) - (b.seed || 999)),
  }));

  const poolPlayers = participants.filter((p) => p.is_pool);
  const poolGroups = [
    { label: '1', seeds: [1] },
    { label: '2', seeds: [2] },
    { label: '3', seeds: [3] },
    { label: '5', seeds: [4, 5] },
  ].map((g) => ({ ...g, players: poolPlayers.filter((p) => g.seeds.includes(p.seed)) }));
  const racketballPlayers = participants.filter((p) => p.player_type === 'racketball');
  const beginnerPlayers = participants.filter((p) => p.player_type === 'beginner');

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
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
                <span className='text-xs text-gray-400'>Team Round Robin Playoff · {participants.length} teams</span>
              </div>
            </div>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            {tournament.status === 'draft' && (
              <>
                <button onClick={onEditTournament} className='px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50'>
                  Edit
                </button>
                <button onClick={onStartTournament} className='px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium'>
                  <span className='sm:hidden'>Start</span>
                  <span className='hidden sm:inline'>Start Tournament</span>
                </button>
              </>
            )}
            {tournament.status === 'active' && (
              <button onClick={onEdit} className='p-2 text-gray-500 hover:text-gray-700' title='Edit tournament'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='bg-white border-b shrink-0 px-4 lg:px-8 py-3'>
        <div className='flex gap-2'>
          {[
            { key: 'bracket', label: 'Bracket' },
            { key: 'teams', label: 'Teams' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto'>
        <div className='max-w-4xl mx-auto px-4 lg:px-8 py-6 space-y-6'>
          {actionError && (
            <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm'>
              {actionError}
            </div>
          )}

          {tournament.status === 'draft' && (
            <div className='bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800'>
              Tournament is in draft. Click <strong>Start Tournament</strong> to generate the Pint and Half-Pint semi-finals.
            </div>
          )}

          {tab === 'bracket' && (
            <PlayoffBracketTree
              matches={
                tournament.status === 'draft'
                  ? buildDraftPreviewMatches(participants, tournament.config?.fixture_dates || {})
                  : matches
              }
              onOpenFixture={onOpenFixture}
            />
          )}

          {tab === 'teams' && (
            <div className='space-y-4'>
              {divisions.map((div) => (
                <div key={div.name} className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                  <div className='px-4 py-3 bg-gray-50 border-b flex items-center justify-between'>
                    <h2 className='font-bold text-gray-800'>{div.name}</h2>
                    <span className='text-xs text-gray-400'>{div.teams.length} teams</span>
                  </div>
                  <div className='divide-y divide-gray-100'>
                    {div.teams.map((team) => (
                      <div key={team._id} className='px-4 py-3'>
                        <div className='flex items-center gap-2 mb-2'>
                          <span className='text-xs font-bold text-gray-400 w-5'>{team.seed}.</span>
                          <p className='font-semibold text-gray-800 text-sm'>{team.name}</p>
                        </div>
                        <div className='grid grid-cols-5 gap-2 pl-7'>
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
              ))}

              {/* Pool players */}
              {poolPlayers.length > 0 && (
                <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                  <button
                    onClick={() => setExpandedExtras(expandedExtras === 'pool' ? null : 'pool')}
                    className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b text-left hover:bg-gray-100 transition-colors'
                  >
                    <h2 className='font-bold text-gray-800'>Pool</h2>
                    <div className='flex items-center gap-2 shrink-0'>
                      <span className='text-xs text-gray-400'>{poolPlayers.length} players</span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedExtras === 'pool' ? 'rotate-180' : ''}`}
                        fill='none' stroke='currentColor' viewBox='0 0 24 24'
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                      </svg>
                    </div>
                  </button>
                  {expandedExtras === 'pool' && (
                    <div className='p-4 grid grid-cols-2 gap-3'>
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
                </div>
              )}

              {/* Racketball and Beginner */}
              {[
                { key: 'racketball', label: 'Racketball', players: racketballPlayers },
                { key: 'beginner', label: 'Beginners', players: beginnerPlayers },
              ].filter((g) => g.players.length > 0).map(({ key, label, players }) => (
                <div key={key} className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                  <button
                    onClick={() => setExpandedExtras(expandedExtras === key ? null : key)}
                    className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b text-left hover:bg-gray-100 transition-colors'
                  >
                    <h2 className='font-bold text-gray-800'>{label}</h2>
                    <div className='flex items-center gap-2 shrink-0'>
                      <span className='text-xs text-gray-400'>{players.length} players</span>
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedExtras === key ? 'rotate-180' : ''}`}
                        fill='none' stroke='currentColor' viewBox='0 0 24 24'
                      >
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                      </svg>
                    </div>
                  </button>
                  {expandedExtras === key && (
                    <div className='p-4 space-y-1.5'>
                      {players.map((p) => (
                        <div key={p._id} className='text-sm text-gray-700'>{p.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

TeamPlayoffTournamentView.propTypes = {
  tournament: PropTypes.object.isRequired,
  participants: PropTypes.array.isRequired,
  matches: PropTypes.array.isRequired,
  onBack: PropTypes.func.isRequired,
  onEditTournament: PropTypes.func.isRequired,
  onStartTournament: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onOpenFixture: PropTypes.func.isRequired,
  actionError: PropTypes.string,
};

export default TeamPlayoffTournamentView;
