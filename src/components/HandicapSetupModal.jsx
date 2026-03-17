import { useState } from 'react';
import PropTypes from 'prop-types';

const PlayerRow = ({ name, score, onIncrement, onDecrement }) => (
  <div className='flex flex-col gap-2'>
    <span className='text-sm font-medium text-gray-700'>{name}</span>
    <div className='flex items-center gap-3'>
      <button
        type='button'
        onClick={onDecrement}
        className='w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-2xl transition-colors flex items-center justify-center'
      >
        −
      </button>
      <div className={`w-20 h-12 flex items-center justify-center rounded-lg text-2xl font-bold border-2 ${
        score > 0 ? 'border-green-400 text-green-600 bg-green-50' :
        score < 0 ? 'border-red-400 text-red-600 bg-red-50' :
        'border-gray-200 text-gray-700 bg-white'
      }`}>
        {score > 0 ? `+${score}` : score}
      </div>
      <button
        type='button'
        onClick={onIncrement}
        className='w-12 h-12 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-2xl transition-colors flex items-center justify-center'
      >
        +
      </button>
    </div>
  </div>
);

PlayerRow.propTypes = {
  name: PropTypes.string.isRequired,
  score: PropTypes.number.isRequired,
  onIncrement: PropTypes.func.isRequired,
  onDecrement: PropTypes.func.isRequired,
};

const HandicapSetupModal = ({ player1Name, player2Name, onConfirm, onCancel }) => {
  const [p1Score, setP1Score] = useState(0);
  const [p2Score, setP2Score] = useState(0);

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-sm p-6'>
        <h2 className='text-xl font-bold text-gray-900 mb-1'>Enter Handicaps</h2>
        <p className='text-sm text-gray-500 mb-6'>
          Use + and − to set each player's starting score.
        </p>

        <div className='space-y-6 mb-8'>
          <PlayerRow
            name={player1Name}
            score={p1Score}
            onIncrement={() => setP1Score((s) => s + 1)}
            onDecrement={() => setP1Score((s) => s - 1)}
          />
          <PlayerRow
            name={player2Name}
            score={p2Score}
            onIncrement={() => setP2Score((s) => s + 1)}
            onDecrement={() => setP2Score((s) => s - 1)}
          />
        </div>

        <div className='flex gap-3'>
          <button
            type='button'
            onClick={onCancel}
            className='flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={() => onConfirm(p1Score, p2Score)}
            className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
          >
            Start Match
          </button>
        </div>
      </div>
    </div>
  );
};

HandicapSetupModal.propTypes = {
  player1Name: PropTypes.string.isRequired,
  player2Name: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default HandicapSetupModal;
