import { useState } from 'react';
import PropTypes from 'prop-types';
import api from '../utils/api';

const EditParticipantsModal = ({ tournamentId, participants, passphrase, onSave, onCancel }) => {
  const [names, setNames] = useState(
    Object.fromEntries(participants.map((p) => [p._id, p.name]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const changed = participants.filter((p) => names[p._id] !== p.name && names[p._id].trim());
      await Promise.all(
        changed.map((p) =>
          api.updateTournamentParticipant(tournamentId, p._id, names[p._id].trim(), passphrase)
        )
      );
      onSave();
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-md'>
        <div className='flex items-center justify-between p-6 border-b'>
          <div>
            <h2 className='text-xl font-bold text-gray-900'>Edit Player Names</h2>
            <p className='text-sm text-gray-500 mt-0.5'>Rename players for substitutions</p>
          </div>
          <button onClick={onCancel} className='text-gray-400 hover:text-gray-600'>
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className='p-6 space-y-3 max-h-96 overflow-y-auto'>
            {error && (
              <div className='bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm'>
                {error}
              </div>
            )}
            {[...participants]
              .sort((a, b) => (a.seed || 999) - (b.seed || 999))
              .map((p) => (
                <div key={p._id} className='flex items-center gap-3'>
                  <span className='text-sm text-gray-500 w-6 text-right flex-shrink-0'>#{p.seed}</span>
                  <input
                    type='text'
                    value={names[p._id]}
                    onChange={(e) => setNames((prev) => ({ ...prev, [p._id]: e.target.value }))}
                    className='flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
              ))}
          </div>

          <div className='flex gap-3 p-6 border-t bg-gray-50'>
            <button
              type='button'
              onClick={onCancel}
              className='flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={saving}
              className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50'
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

EditParticipantsModal.propTypes = {
  tournamentId: PropTypes.string.isRequired,
  participants: PropTypes.array.isRequired,
  passphrase: PropTypes.string.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default EditParticipantsModal;
