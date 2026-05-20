import { useState } from 'react';
import useGameStore from '../stores/gameStore';
import PropTypes from 'prop-types';

function buildAnnouncement({ serverName, receiverName, bestOf, pointsToWin, clearPoints, isHandicap, serverStart, receiverStart }) {
  const clearText = clearPoints > 1 ? `, by ${clearPoints} clear points` : '';
  const handicapText = isHandicap
    ? ` ${serverName} starts at ${serverStart >= 0 ? '+' : ''}${serverStart}, ${receiverName} starts at ${receiverStart >= 0 ? '+' : ''}${receiverStart}.`
    : '';
  return `${serverName} to serve, ${receiverName} to receive. Best of ${bestOf} games, first to ${pointsToWin}${clearText}.${handicapText} Love all, play.`;
}

export default function MatchSetupModal({ onClose }) {
  const player1 = useGameStore((state) => state.player1);
  const player2 = useGameStore((state) => state.player2);
  const matchSettings = useGameStore((state) => state.matchSettings);
  const tournamentMatchContext = useGameStore((state) => state.tournamentMatchContext);
  const selectServer = useGameStore((state) => state.selectServer);

  const isHandicap = tournamentMatchContext?.isHandicap ?? matchSettings.isHandicap ?? false;
  const initialP1Start = tournamentMatchContext?.player1StartScore ?? matchSettings.player1StartScore ?? 0;
  const initialP2Start = tournamentMatchContext?.player2StartScore ?? matchSettings.player2StartScore ?? 0;

  const [p1Start, setP1Start] = useState(initialP1Start);
  const [p2Start, setP2Start] = useState(initialP2Start);
  const [selectedServer, setSelectedServer] = useState(null); // 1 or 2

  const serverName = selectedServer === 1 ? player1.name : selectedServer === 2 ? player2.name : null;
  const receiverName = selectedServer === 1 ? player2.name : selectedServer === 2 ? player1.name : null;
  const serverStart = selectedServer === 1 ? p1Start : p2Start;
  const receiverStart = selectedServer === 1 ? p2Start : p1Start;

  const announcement = serverName
    ? buildAnnouncement({
        serverName,
        receiverName,
        bestOf: matchSettings.bestOf,
        pointsToWin: matchSettings.pointsToWin,
        clearPoints: matchSettings.clearPoints,
        isHandicap,
        serverStart,
        receiverStart,
      })
    : null;

  const handleStartMatch = () => {
    selectServer(selectedServer);
    onClose();
  };

  const scoreColor = (val) => {
    if (val > 0) return 'text-green-600';
    if (val < 0) return 'text-red-600';
    return 'text-gray-700';
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-6 p-6'>
        <h2 className='text-xl font-bold text-center text-slate-800'>Match Setup</h2>

        {/* Handicap starting scores */}
        {isHandicap && (
          <div>
            <p className='text-sm font-semibold text-slate-600 mb-3 text-center'>Starting Scores</p>
            <div className='flex gap-4'>
              {[
                { name: player1.name, val: p1Start, set: setP1Start },
                { name: player2.name, val: p2Start, set: setP2Start },
              ].map(({ name, val, set }) => (
                <div key={name} className='flex-1 flex flex-col items-center gap-2'>
                  <span className='text-sm font-medium text-slate-700 text-center'>{name}</span>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => set((v) => v - 1)}
                      className='w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-lg font-bold text-slate-700 flex items-center justify-center'
                    >
                      −
                    </button>
                    <span className={`text-2xl font-bold w-10 text-center ${scoreColor(val)}`}>{val}</span>
                    <button
                      onClick={() => set((v) => v + 1)}
                      className='w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-lg font-bold text-slate-700 flex items-center justify-center'
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Server selection */}
        <div>
          <p className='text-sm font-semibold text-slate-600 mb-3 text-center'>Who is serving first?</p>
          <div className='flex gap-3'>
            {[
              { num: 1, name: player1.name, color: player1.color },
              { num: 2, name: player2.name, color: player2.color },
            ].map(({ num, name, color }) => (
              <button
                key={num}
                onClick={() => setSelectedServer(num)}
                className={`flex-1 py-4 rounded-xl border-2 font-semibold text-base transition-all ${
                  selectedServer === num
                    ? `${color} bg-blue-50 border-blue-500 text-blue-700 shadow-md scale-105`
                    : 'border-gray-200 text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                {name}
                {selectedServer === num && (
                  <div className='text-xs font-normal text-blue-500 mt-1'>Serving</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Announcement */}
        {announcement && (
          <div className='bg-slate-50 border border-slate-200 rounded-xl px-4 py-3'>
            <p className='text-sm font-semibold text-slate-500 mb-1'>Marker&apos;s call</p>
            <p className='text-base text-slate-800 leading-relaxed'>{announcement}</p>
          </div>
        )}

        {/* Start button */}
        <button
          onClick={handleStartMatch}
          disabled={!selectedServer}
          className='w-full py-4 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
        >
          Start Match
        </button>
      </div>
    </div>
  );
}

MatchSetupModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};
