import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import LandingScreen from './components/LandingScreen';
import GameSetupScreen from './components/GameSetupScreen';
import GameScreen from './components/GameScreen';
import MatchHistoryScreen from './components/MatchHistoryScreen';
import TournamentScreen from './components/TournamentScreen';
import TournamentDetailScreen from './components/TournamentDetailScreen';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import useGameStore from './stores/gameStore';
import api from './utils/api';

// Wrapper component to properly extract tournamentId from URL params
function TournamentDetailScreenWrapper({ onBack, onScoreMatch }) {
  const { tournamentId } = useParams();
  return (
    <TournamentDetailScreen
      tournamentId={tournamentId}
      onBack={onBack}
      onScoreMatch={onScoreMatch}
    />
  );
}

TournamentDetailScreenWrapper.propTypes = {
  onBack: PropTypes.func.isRequired,
  onScoreMatch: PropTypes.func.isRequired,
};

function App() {
  const navigate = useNavigate();
  const updateGameSettings = useGameStore((state) => state.updateGameSettings);
  const setTournamentMatchContext = useGameStore(
    (state) => state.setTournamentMatchContext
  );
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
      eventName: settingsFromGame.eventName || '', // Ensure eventName is passed
    });

    // Navigate to the edit setup route
    navigate('/setup/edit');
  };

  const handleStartMatch = () => {
    setHasActiveMatch(true);
    navigate('/game');
  };

  const handleReturnToMatch = (settings) => {
    updateGameSettings(settings);
    navigate('/game');
  };

  const handleFinishMatch = async () => {
    const gameState = useGameStore.getState();
    const tournamentMatchContext = gameState.tournamentMatchContext;

    // If this was a tournament match, submit the result
    if (tournamentMatchContext) {
      try {
        // Determine winner
        const player1Wins = gameState.gameScores.filter(
          (s) => s.player1 > s.player2
        ).length;
        const player2Wins = gameState.gameScores.filter(
          (s) => s.player2 > s.player1
        ).length;
        const winnerId =
          player1Wins > player2Wins
            ? tournamentMatchContext.player1Id
            : tournamentMatchContext.player2Id;
        const winnerName =
          player1Wins > player2Wins
            ? gameState.player1.name
            : gameState.player2.name;
        const loserId =
          player1Wins > player2Wins
            ? tournamentMatchContext.player2Id
            : tournamentMatchContext.player1Id;
        const loserName =
          player1Wins > player2Wins
            ? gameState.player2.name
            : gameState.player1.name;

        const matchResult = {
          winner_id: winnerId,
          winner_name: winnerName,
          loser_id: loserId,
          loser_name: loserName,
          game_scores: gameState.gameScores,
          walkover: false,
          retired: false,
        };

        await api.submitTournamentMatchResult(
          tournamentMatchContext.tournamentId,
          tournamentMatchContext.matchId,
          matchResult
        );

        // Clear tournament context
        setTournamentMatchContext(null);

        // Navigate back to tournament
        navigate(`/tournaments/${tournamentMatchContext.tournamentId}`);
      } catch (error) {
        console.error('Error submitting tournament match result:', error);
        // Still clear context and allow navigation
        setTournamentMatchContext(null);
      }
    }

    setHasActiveMatch(false);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleNavigateToTournament = (tournamentId) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const handleScoreTournamentMatch = (matchContext) => {
    // Store tournament match context in game store for when match is completed
    setTournamentMatchContext({
      ...matchContext,
      player1Id:
        matchContext.player1Id || matchContext.participant_a?.participant_id,
      player2Id:
        matchContext.player2Id || matchContext.participant_b?.participant_id,
    });

    // Set up the game with tournament match details
    const gameSettings = {
      player1Name: matchContext.player1Name,
      player2Name: matchContext.player2Name,
      player1Color: 'border-red-500',
      player2Color: 'border-blue-500',
      pointsToWin: 15,
      clearPoints: 2,
      bestOf: 5,
      player1Serving: true,
      eventName: `Tournament Match`,
    };

    updateGameSettings(gameSettings);
    setHasActiveMatch(true);
    navigate('/game');
  };

  return (
    <div className='h-full flex flex-col'>
      <div className='mx-auto w-full h-full bg-white shadow-lg'>
        <Routes>
          <Route
            path='/'
            element={
              <LandingScreen
                onNewMatch={() => {
                  // Reset game state for new match
                  if (hasActiveMatch) {
                    // If there's an active match, go to edit screen
                    navigate('/setup/edit');
                  } else {
                    // Otherwise go to new match setup
                    navigate('/setup');
                  }
                }}
                onFindMatch={() => navigate('/history')}
                onTournaments={() => navigate('/tournaments')}
                hasActiveMatch={hasActiveMatch}
              />
            }
          />

          <Route
            path='/setup'
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
            path='/setup/edit'
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
            path='/game'
            element={
              <GameScreen
                onBackToSetup={handleBackToSetup}
                onFinishMatch={handleFinishMatch}
              />
            }
          />

          <Route
            path='/history'
            element={<MatchHistoryScreen onBack={() => navigate('/')} />}
          />

          <Route
            path='/tournaments'
            element={
              <TournamentScreen
                onNavigateToTournament={handleNavigateToTournament}
                onBack={() => navigate('/')}
              />
            }
          />

          <Route
            path='/tournaments/:tournamentId'
            element={
              <TournamentDetailScreenWrapper
                onBack={() => navigate('/tournaments')}
                onScoreMatch={handleScoreTournamentMatch}
              />
            }
          />

          <Route path='*' element={<Navigate to='/' replace />} />
        </Routes>

        {/* PWA Update Prompt */}
        <PWAUpdatePrompt />
      </div>
    </div>
  );
}

export default App;
