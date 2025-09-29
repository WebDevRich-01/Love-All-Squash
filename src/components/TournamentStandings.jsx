import React from 'react';

const TournamentStandings = ({ standings, format, groups = [] }) => {
  if (!standings) {
    return (
      <div className='bg-white rounded-lg shadow-sm p-6'>
        <div className='text-center text-gray-500'>
          No standings available yet
        </div>
      </div>
    );
  }

  const renderBracketStandings = () => (
    <div className='bg-white rounded-lg shadow-sm p-6'>
      <h2 className='text-xl font-semibold text-gray-900 mb-4'>
        Tournament Bracket
      </h2>
      <div className='text-center text-gray-500'>
        <p>Bracket view coming soon</p>
        <p className='text-sm mt-2'>
          Current Round: {standings.currentRound} / {standings.totalRounds}
        </p>
      </div>
    </div>
  );

  const renderGroupStandings = () => (
    <div className='space-y-6'>
      {standings.groups &&
        standings.groups.map((group) => (
          <div key={group.id} className='bg-white rounded-lg shadow-sm p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900'>
                {group.name}
              </h3>
              {group.completed && (
                <span className='bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium'>
                  Complete
                </span>
              )}
            </div>

            {group.standings && group.standings.length > 0 ? (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Pos
                      </th>
                      <th className='px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Player
                      </th>
                      <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        P
                      </th>
                      <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        W
                      </th>
                      <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        L
                      </th>
                      <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        GD
                      </th>
                      <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        PD
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {group.standings.map((standing, index) => (
                      <tr
                        key={standing.participant_id}
                        className={standing.qualified ? 'bg-green-50' : ''}
                      >
                        <td className='px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                          {standing.position}
                          {standing.qualified && (
                            <span className='ml-1 text-green-600'>✓</span>
                          )}
                        </td>
                        <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-900'>
                          {standing.name}
                        </td>
                        <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center'>
                          {standing.played}
                        </td>
                        <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                          {standing.wins}
                        </td>
                        <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                          {standing.losses}
                        </td>
                        <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center'>
                          {standing.game_differential > 0 ? '+' : ''}
                          {standing.game_differential}
                        </td>
                        <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center'>
                          {standing.point_differential > 0 ? '+' : ''}
                          {standing.point_differential}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='text-center text-gray-500 py-4'>
                No matches completed yet
              </div>
            )}

            {group.qualifiers && group.qualifiers.length > 0 && (
              <div className='mt-4 p-3 bg-green-50 rounded-lg'>
                <div className='text-sm font-medium text-green-800 mb-1'>
                  Qualified for knockout:
                </div>
                <div className='text-sm text-green-700'>
                  {group.qualifiers.join(', ')}
                </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );

  const renderProgressiveStandings = () => (
    <div className='bg-white rounded-lg shadow-sm p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-xl font-semibold text-gray-900'>
          Current Standings
        </h2>
        <div className='text-sm text-gray-500'>
          Round {standings.currentRound} of {standings.totalRounds}
        </div>
      </div>

      {standings.standings && standings.standings.length > 0 ? (
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Position
                </th>
                <th className='px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Player
                </th>
                <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Wins
                </th>
                <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Losses
                </th>
                <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Level
                </th>
                <th className='px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {standings.standings.map((standing) => (
                <tr key={standing.participant_id}>
                  <td className='px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                    {standing.position}
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-900'>
                    {standing.name}
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                    {standing.wins}
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                    {standing.losses}
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center'>
                    {standing.current_level}
                  </td>
                  <td className='px-3 py-4 whitespace-nowrap text-sm text-center'>
                    {standing.trajectory === 'up' && (
                      <span className='text-green-600'>↗</span>
                    )}
                    {standing.trajectory === 'down' && (
                      <span className='text-red-600'>↘</span>
                    )}
                    {standing.trajectory === 'stable' && (
                      <span className='text-gray-400'>→</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className='text-center text-gray-500 py-4'>
          No standings available yet
        </div>
      )}
    </div>
  );

  const renderPoolsKnockoutStandings = () => {
    if (standings.phase === 'pools') {
      return renderGroupStandings();
    } else {
      return renderBracketStandings();
    }
  };

  // Render based on standings type
  switch (standings.type) {
    case 'bracket':
      return renderBracketStandings();
    case 'groups':
    case 'pools':
      return renderGroupStandings();
    case 'progressive':
      return renderProgressiveStandings();
    case 'knockout':
      return renderBracketStandings();
    default:
      if (format === 'pools_knockout') {
        return renderPoolsKnockoutStandings();
      }
      return (
        <div className='bg-white rounded-lg shadow-sm p-6'>
          <div className='text-center text-gray-500'>
            Standings view not available for this format yet
          </div>
        </div>
      );
  }
};

export default TournamentStandings;
