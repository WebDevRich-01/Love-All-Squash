import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

const CACHE_KEY = (id) => `las_passphrase_${id}`;

export const getCachedPassphrase = (tournamentId) =>
  sessionStorage.getItem(CACHE_KEY(tournamentId));

const PassphraseModal = ({ tournamentId, onSuccess, onCancel }) => {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
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
          <div className='relative'>
            <input
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder='Passphrase'
              autoFocus
              className='w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
            <button
              type='button'
              onClick={() => setShow((s) => !s)}
              className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'
              tabIndex={-1}
              aria-label={show ? 'Hide passphrase' : 'Show passphrase'}
            >
              {show ? (
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21' />
                </svg>
              ) : (
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                </svg>
              )}
            </button>
          </div>

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
