import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LandingScreen from "./components/LandingScreen";
import GameSetupScreen from "./components/GameSetupScreen";
import GameScreen from "./components/GameScreen";
import MatchHistoryScreen from "./components/MatchHistoryScreen";
import PWAUpdatePrompt from "./components/PWAUpdatePrompt";
import useGameStore from "./stores/gameStore";

function App() {
  const navigate = useNavigate();
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);
  const [hasActiveMatch, setHasActiveMatch] = useState(false);
  const [gameSettings, setGameSettings] = useState(null);

  // Check if there's an active match when the component mounts
  useEffect(() => {
    const state = useGameStore.getState();
    const hasMatch =
      state.gameScores.length > 0 ||
      state.player1.score > 0 ||
      state.player2.score > 0;
    setHasActiveMatch(hasMatch);
  }, []);

  const handleBackToSetup = (settingsFromGame) => {
    // Store the settings in state
    setGameSettings({
      ...settingsFromGame,
      eventName: settingsFromGame.eventName || "", // Ensure eventName is passed
    });

    // Navigate to the edit setup route
    navigate("/setup/edit");
  };

  const handleStartMatch = () => {
    setHasActiveMatch(true);
    navigate("/game");
  };

  const handleReturnToMatch = (settings) => {
    updateGameSettings(settings);
    navigate("/game");
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mx-auto w-full h-full bg-white shadow-lg">
        <Routes>
          <Route
            path="/"
            element={
              <LandingScreen
                onNewMatch={() => {
                  // Reset game state for new match
                  if (hasActiveMatch) {
                    // If there's an active match, go to edit screen
                    navigate("/setup/edit");
                  } else {
                    // Otherwise go to new match setup
                    navigate("/setup");
                  }
                }}
                onFindMatch={() => navigate("/history")}
                hasActiveMatch={hasActiveMatch}
              />
            }
          />

          <Route
            path="/setup"
            element={
              <GameSetupScreen
                initialSettings={null}
                onStartMatch={handleStartMatch}
                onBack={handleBackToHome}
                isEditing={false}
              />
            }
          />

          <Route
            path="/setup/edit"
            element={
              <GameSetupScreen
                initialSettings={gameSettings}
                onReturnToMatch={handleReturnToMatch}
                onBack={handleBackToHome}
                isEditing={true}
              />
            }
          />

          <Route
            path="/game"
            element={
              <GameScreen
                onBackToSetup={handleBackToSetup}
                onFinishMatch={() => setHasActiveMatch(false)}
              />
            }
          />

          <Route
            path="/history"
            element={<MatchHistoryScreen onBack={() => navigate("/")} />}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* PWA Update Prompt */}
        <PWAUpdatePrompt />
      </div>
    </div>
  );
}

export default App;
