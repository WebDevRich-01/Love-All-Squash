import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import CreateTournamentModal from './CreateTournamentModal';
import TournamentCard from './TournamentCard';

const TournamentScreen = ({ onNavigateToTournament, onBack }) => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await api.getTournaments();
      setTournaments(data);
      setError(null);
    } catch (err) {
      console.error('Error loading tournaments:', err);
      setError('Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (tournamentData) => {
    try {
      const result = await api.createTournament(tournamentData);
      await loadTournaments(); // Refresh the list
      setShowCreateModal(false);

      // Navigate directly to the new tournament
      if (result.tournament) {
        onNavigateToTournament(result.tournament._id);
      }
    } catch (err) {
      console.error('Error creating tournament:', err);
      throw err; // Let the modal handle the error display
    }
  };

  const handleDeleteTournament = async (tournamentId) => {
    if (
      !confirm(
        'Are you sure you want to delete this tournament? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await api.deleteTournament(tournamentId);
      await loadTournaments(); // Refresh the list
    } catch (err) {
      console.error('Error deleting tournament:', err);
      alert('Failed to delete tournament');
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 p-4'>
        <div className='max-w-6xl mx-auto'>
          <div className='flex items-center justify-center py-12'>
            <div className='text-lg text-gray-600'>Loading tournaments...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4'>
      <div className='max-w-6xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between mb-6'>
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
            <h1 className='text-3xl font-bold text-gray-900'>Tournaments</h1>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className='bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2'
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
                d='M12 4v16m8-8H4'
              />
            </svg>
            <span>Create Tournament</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6'>
            {error}
          </div>
        )}

        {/* Tournament grid */}
        {tournaments.length === 0 ? (
          <div className='text-center py-12'>
            <svg
              className='w-16 h-16 text-gray-400 mx-auto mb-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1}
                d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
              />
            </svg>
            <h3 className='text-xl font-semibold text-gray-900 mb-2'>
              No tournaments yet
            </h3>
            <p className='text-gray-600 mb-6'>
              Create your first tournament to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className='bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors'
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {tournaments.map((tournament) => (
              <TournamentCard
                key={tournament._id}
                tournament={tournament}
                onView={() => onNavigateToTournament(tournament._id)}
                onDelete={() => handleDeleteTournament(tournament._id)}
              />
            ))}
          </div>
        )}

        {/* Create Tournament Modal */}
        {showCreateModal && (
          <CreateTournamentModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateTournament}
          />
        )}
      </div>
    </div>
  );
};

export default TournamentScreen;
