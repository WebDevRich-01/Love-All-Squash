import React from 'react';

const TournamentCard = ({ tournament, onView, onDelete }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'No date set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      monrad: 'Monrad',
      pools_knockout: 'Pools → Knockout',
      double_elimination: 'Double Elimination',
      swiss: 'Swiss System',
    };
    return formatNames[format] || format;
  };

  return (
    <div className='bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200'>
      <div className='p-6'>
        {/* Header */}
        <div className='flex items-start justify-between mb-4'>
          <div className='flex-1'>
            <h3 className='text-xl font-semibold text-gray-900 mb-2'>
              {tournament.name}
            </h3>
            <div className='flex items-center space-x-2'>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  tournament.status
                )}`}
              >
                {tournament.status.charAt(0).toUpperCase() +
                  tournament.status.slice(1)}
              </span>
              <span className='text-sm text-gray-500'>
                {getFormatDisplayName(tournament.format)}
              </span>
            </div>
          </div>

          {/* Action menu */}
          <div className='flex items-center space-x-1'>
            <button
              onClick={onView}
              className='p-2 text-gray-400 hover:text-blue-600 transition-colors'
              title='View tournament'
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
                  d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                />
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className='p-2 text-gray-400 hover:text-red-600 transition-colors'
              title='Delete tournament'
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
                  d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Details */}
        <div className='space-y-2 text-sm text-gray-600'>
          {tournament.venue && (
            <div className='flex items-center'>
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
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
                />
              </svg>
              <span>{tournament.venue}</span>
            </div>
          )}

          <div className='flex items-center'>
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
            <span>
              {formatDate(tournament.start_date || tournament.created_at)}
            </span>
          </div>

          {tournament.description && (
            <div className='mt-3'>
              <p className='text-gray-700 line-clamp-2'>
                {tournament.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between mt-6 pt-4 border-t border-gray-100'>
          <div className='text-xs text-gray-500'>
            Created {formatDate(tournament.created_at)}
          </div>

          <button
            onClick={onView}
            className='bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors'
          >
            View Tournament
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentCard;
