import useGameStore from "../stores/gameStore";
import PropTypes from "prop-types";
import MatchHistoryTable from "./MatchHistoryTable";

export default function GameWinModal({
  winningPlayer,
  gameNumber,
  matchWon,
  onStartNext,
  onFinishMatch,
}) {
  const player1 = useGameStore((state) => state.player1);
  const player2 = useGameStore((state) => state.player2);
  const gameScores = useGameStore((state) => state.gameScores);

  const player = winningPlayer === 1 ? player1 : player2;
  const playerName = player?.name || `Player ${winningPlayer}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        {matchWon ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Match Complete!
            </h2>
            <p className="text-center mb-4">{playerName} wins the match!</p>

            {/* Match History */}
            <div className="mb-6">
              <MatchHistoryTable
                player1={player1}
                player2={player2}
                gameScores={gameScores}
              />
            </div>

            <button
              onClick={onFinishMatch}
              className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Return to Menu
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-center">
              Game {gameNumber - 1} Complete!
            </h2>

            {/* Match History */}
            <div className="mb-6">
              <MatchHistoryTable
                player1={player1}
                player2={player2}
                gameScores={gameScores}
              />
            </div>

            <button
              onClick={onStartNext}
              className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Start Game {gameNumber}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

GameWinModal.propTypes = {
  winningPlayer: PropTypes.number.isRequired,
  gameNumber: PropTypes.number.isRequired,
  matchWon: PropTypes.bool.isRequired,
  onStartNext: PropTypes.func.isRequired,
  onFinishMatch: PropTypes.func.isRequired,
};
