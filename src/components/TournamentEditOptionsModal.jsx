import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

const TournamentEditOptionsModal = ({
  tournamentId,
  passphrase,
  onEditPlayers,
  onReset,
  onClose,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);

  const handleReset = async () => {
    setError(null);
    setResetting(true);
    try {
      await api.resetTournament(tournamentId, passphrase);
      onReset();
    } catch (err) {
      setError(err.message || 'Failed to reset tournament');
    } finally {
      setResetting(false);
      setConfirming(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-sm p-6'>
        <h2 className='text-xl font-bold text-gray-900 mb-1'>Edit Tournament</h2>
        <p className='text-sm text-gray-500 mb-5'>What would you like to change?</p>

        {error && (
          <div className='bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4'>
            {error}
          </div>
        )}

        {!confirming ? (
          <div className='space-y-3'>
            <button
              onClick={() => { onEditPlayers(); onClose(); }}
              className='w-full flex items-start gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left'
            >
              <span className='text-xl mt-0.5'>✏️</span>
              <div>
                <div className='font-medium text-gray-900'>Edit player names</div>
                <div className='text-sm text-gray-500'>Rename players — e.g. for a substitute</div>
              </div>
            </button>

            <button
              onClick={() => setConfirming(true)}
              className='w-full flex items-start gap-3 px-4 py-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-left'
            >
              <span className='text-xl mt-0.5'>🔄</span>
              <div>
                <div className='font-medium text-red-700'>Reset tournament</div>
                <div className='text-sm text-gray-500'>Clear all results and return to draft to edit players before restarting</div>
              </div>
            </button>

            <button
              onClick={onClose}
              className='w-full px-4 py-2 text-gray-600 hover:text-gray-800 text-sm'
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700'>
              <p className='font-semibold mb-1'>Are you sure?</p>
              <p>This will delete all match results and return the tournament to draft. You can then edit players and settings before starting again. This cannot be undone.</p>
            </div>
            <div className='flex gap-3'>
              <button
                onClick={() => setConfirming(false)}
                className='flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className='flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {resetting ? 'Resetting…' : 'Reset tournament'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

TournamentEditOptionsModal.propTypes = {
  tournamentId: PropTypes.string.isRequired,
  passphrase: PropTypes.string.isRequired,
  onEditPlayers: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default TournamentEditOptionsModal;
