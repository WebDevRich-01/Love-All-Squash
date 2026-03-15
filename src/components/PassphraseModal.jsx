import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

const CACHE_KEY = (id) => `las_passphrase_${id}`;

export const getCachedPassphrase = (tournamentId) =>
  sessionStorage.getItem(CACHE_KEY(tournamentId));

const PassphraseModal = ({ tournamentId, onSuccess, onCancel }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.verifyTournamentPassphrase(tournamentId, value);
      sessionStorage.setItem(CACHE_KEY(tournamentId), value);
      onSuccess(value);
    } catch {
      setError('Incorrect passphrase. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-sm p-6'>
        <h2 className='text-xl font-bold text-gray-900 mb-1'>Enter Passphrase</h2>
        <p className='text-sm text-gray-500 mb-5'>
          This action requires the tournament passphrase.
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <input
            type='password'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder='Passphrase'
            autoFocus
            className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />

          {error && (
            <p className='text-sm text-red-600'>{error}</p>
          )}

          <div className='flex gap-3'>
            <button
              type='button'
              onClick={onCancel}
              className='flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading || !value.trim()}
              className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? 'Checking...' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

PassphraseModal.propTypes = {
  tournamentId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default PassphraseModal;
