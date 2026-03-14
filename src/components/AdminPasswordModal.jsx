import { useState } from 'react';
import PropTypes from 'prop-types';
import { setAdminToken } from '../utils/api';

/**
 * Prompt the admin to enter their password.
 *
 * On submit, saves the password as a Bearer token in sessionStorage and
 * calls onSuccess so the caller can retry the blocked action.
 */
export default function AdminPasswordModal({ onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter the admin password');
      return;
    }
    setLoading(true);
    setError(null);
    setAdminToken(password.trim());
    // Let the caller retry — if the token is wrong the request will 401 again
    onSuccess();
    setLoading(false);
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl max-w-sm w-full p-6'>
        <h2 className='text-xl font-bold text-gray-900 mb-2'>Admin Access Required</h2>
        <p className='text-sm text-gray-600 mb-6'>
          This action requires the admin password.
        </p>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {error && (
            <div className='bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm'>
              {error}
            </div>
          )}

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Admin Password
            </label>
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500'
              placeholder='Enter admin password'
              autoFocus
            />
          </div>

          <div className='flex space-x-3'>
            <button
              type='button'
              onClick={onCancel}
              className='flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors'
            >
              {loading ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

AdminPasswordModal.propTypes = {
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
