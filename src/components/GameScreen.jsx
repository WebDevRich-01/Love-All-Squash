import { useState, useEffect } from "react";
import useGameStore from "../stores/gameStore";
import ScoreColumns from "./ScoreColumns";
import PlayerButton from "./PlayerButton";
import LetDecisionModal from "./LetDecisionModal";
import GameWinModal from "./GameWinModal";
import MatchHistoryTable from "./MatchHistoryTable";
import PointIndicator from "./PointIndicator";
import { useNavigate } from "react-router-dom";
import { useWakeLock } from "../hooks/useWakeLock";
import PropTypes from "prop-types";

export default function GameScreen({ onBackToSetup, onFinishMatch }) {
  const navigate = useNavigate();
  const [letModalOpen, setLetModalOpen] = useState(false);
  const [letCallingPlayer, setLetCallingPlayer] = useState(null);
  const [gameWinModalOpen, setGameWinModalOpen] = useState(false);
  const [winningPlayer, setWinningPlayer] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [matchHistoryModalOpen, setMatchHistoryModalOpen] = useState(false);

  const {
    player1,
    player2,
    currentGame,
    gameScores,
    matchWon,
    undoLastPoint,
    toggleServeSide,
    handleLetDecision,
    startNextGame,
    checkGameWin,
    handleGameCompletion,
    resetGame,
    matchSettings,
    isGamePoint,
    isMatchPoint,
  } = useGameStore();

  // Wake lock to prevent screen timeout during matches
  const {
    isSupported: wakeLockSupported,
    isActive: wakeLockActive,
    requestWakeLock,
    releaseWakeLock,
  } = useWakeLock();

  // Check for game wins without trying to save to backend
  useEffect(() => {
    const winner = checkGameWin();
    if (winner) {
      // Store the winner in state to avoid recalculating
      setWinningPlayer(winner);

      // Skip the API call for now and just show the modal
      try {
        // If handleGameCompletion is synchronous or returns a non-promise
        handleGameCompletion();
      } catch (error) {
        console.error("Error in game completion:", error);
        // Continue showing the modal even if there's an error
      }

      // Always show the modal
      setGameWinModalOpen(true);
    }
  }, [player1.score, player2.score, checkGameWin, handleGameCompletion]);

  // Request wake lock when component mounts and release when unmounting
  useEffect(() => {
    if (wakeLockSupported) {
      requestWakeLock();
    }

    // Cleanup: release wake lock when component unmounts
    return () => {
      if (wakeLockActive) {
        releaseWakeLock();
      }
    };
  }, [wakeLockSupported, requestWakeLock, releaseWakeLock, wakeLockActive]);

  const handleStartNext = () => {
    console.log("Starting next game");
    startNextGame();
    setGameWinModalOpen(false);
  };

  const handleFinishMatch = async () => {
    // No need to save here as it's already saved in handleGameCompletion
    // Just reset the game state and navigate
    resetGame();
    if (onFinishMatch) {
      onFinishMatch(); // Notify App component that match is finished
    }
    navigate("/");
  };

  const getGameScoreDisplay = () => {
    if (!gameScores || gameScores.length === 0) return "0-0";

    const player1Wins = gameScores.filter((s) => s.player1 > s.player2).length;
    const player2Wins = gameScores.filter((s) => s.player2 > s.player1).length;

    return `${player1Wins}-${player2Wins}`;
  };

  const handleLetButtonClick = (playerNum) => {
    setLetCallingPlayer(playerNum);
    setLetModalOpen(true);
  };

  const handleLetDecisionMade = (decision) => {
    handleLetDecision(letCallingPlayer, decision);
    setLetModalOpen(false);
    setLetCallingPlayer(null);
  };

  const handleCancelMatch = () => {
    resetGame();
    if (onFinishMatch) {
      onFinishMatch(); // Notify App component that match is finished
    }
    // Don't call onBackToSetup when canceling - just go back to landing
    navigate("/");
  };

  const handleBackToSetup = () => {
    // Get the event name from the store
    const eventName = useGameStore.getState().eventName;

    // Pass the current game state to the setup screen
    const settingsToPass = {
      preserveScores: true,
      currentGame,
      gameScores,
      player1Name: player1.name,
      player2Name: player2.name,
      player1Color: player1.color,
      player2Color: player2.color,
      player1Score: player1.score,
      player2Score: player2.score,
      player1Serving: player1.serving,
      player2Serving: player2.serving,
      player1ServeSide: player1.serveSide,
      player2ServeSide: player2.serveSide,
      pointsToWin: matchSettings.pointsToWin,
      clearPoints: matchSettings.clearPoints,
      bestOf: matchSettings.bestOf,
      eventName: eventName,
    };

    onBackToSetup(settingsToPass);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="card flex justify-between items-center p-4 m-2 shrink-0">
        <button
          className="btn-secondary !py-2 !px-3 text-xl"
          onClick={handleBackToSetup}
        >
          &larr;
        </button>
        <button
          className="text-lg font-semibold text-slate-700 hover:text-slate-900 transition-colors duration-200"
          onClick={() => setMatchHistoryModalOpen(true)}
        >
          <span className="text-blue-600 hover:text-blue-700">
            {getGameScoreDisplay()}
          </span>
        </button>
        <button
          className="btn-secondary !py-2 !px-3 text-xl text-red-500 hover:text-red-600"
          onClick={() => setCancelModalOpen(true)}
        >
          ×
        </button>
      </div>

      {/* Score columns */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <ScoreColumns />
      </div>

      {/* Current score and player controls */}
      <div className="card p-6 m-2 shrink-0">
        <div className="flex gap-6">
          <div className="flex-1">
            {/* Player 1 score and serve indicator */}
            <div className="text-center mb-4 flex items-center justify-center">
              <div className="text-6xl font-bold text-slate-800">
                {player1.score}
              </div>
              {player1.serving && (
                <button
                  onClick={() => toggleServeSide(1)}
                  className="ml-3 text-3xl text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1 transition-colors duration-200"
                >
                  {player1.serveSide}
                </button>
              )}
              {/* Game/Match Point Indicator for Player 1 */}
              {isMatchPoint(1) && <PointIndicator type="match" />}
              {!isMatchPoint(1) && isGamePoint(1) && (
                <PointIndicator type="game" />
              )}
            </div>
            <PlayerButton playerNum={1} />
            <button
              onClick={() => handleLetButtonClick(1)}
              className="btn-let w-full mt-3"
            >
              Let
            </button>
          </div>

          <div className="flex-1">
            {/* Player 2 score and serve indicator */}
            <div className="text-center mb-4 flex items-center justify-center">
              <div className="text-6xl font-bold text-slate-800">
                {player2.score}
              </div>
              {player2.serving && (
                <button
                  onClick={() => toggleServeSide(2)}
                  className="ml-3 text-3xl text-blue-500 hover:text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1 transition-colors duration-200"
                >
                  {player2.serveSide}
                </button>
              )}
              {/* Game/Match Point Indicator for Player 2 */}
              {isMatchPoint(2) && <PointIndicator type="match" />}
              {!isMatchPoint(2) && isGamePoint(2) && (
                <PointIndicator type="game" />
              )}
            </div>
            <PlayerButton playerNum={2} />
            <button
              onClick={() => handleLetButtonClick(2)}
              className="btn-let w-full mt-3"
            >
              Let
            </button>
          </div>
        </div>
      </div>

      {/* Undo button */}
      <div className="p-2">
        <button onClick={undoLastPoint} className="btn-undo w-full">
          ↺ Undo Last Point
        </button>
      </div>

      {/* Game win modal */}
      {gameWinModalOpen && (
        <GameWinModal
          winningPlayer={winningPlayer}
          gameNumber={currentGame + 1}
          matchWon={matchWon}
          gameScores={gameScores}
          onStartNext={handleStartNext}
          onFinishMatch={handleFinishMatch}
        />
      )}

      {/* Let decision modal */}
      {letModalOpen && (
        <LetDecisionModal
          onDecision={handleLetDecisionMade}
          onCancel={() => {
            setLetModalOpen(false);
            setLetCallingPlayer(null);
          }}
        />
      )}

      {/* Match History Modal */}
      {matchHistoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 w-96 max-w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-center text-slate-800">
              Match History
            </h2>

            <div className="mb-6">
              <MatchHistoryTable
                player1={player1}
                player2={player2}
                gameScores={gameScores}
              />
            </div>

            <button
              onClick={() => setMatchHistoryModalOpen(false)}
              className="btn-secondary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 w-80 max-w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-center text-slate-800">
              Cancel Match?
            </h2>
            <p className="text-center mb-6 text-slate-600">
              Are you sure you want to cancel this match? All progress will be
              lost.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleCancelMatch()}
                className="flex-1 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium transition-all duration-200 hover:shadow-md active:scale-95"
              >
                Yes, Cancel
              </button>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="btn-secondary flex-1"
              >
                No, Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

GameScreen.propTypes = {
  onBackToSetup: PropTypes.func.isRequired,
  onFinishMatch: PropTypes.func,
};
