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
import ErrorBoundary from './components/ErrorBoundary';
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
  const initializeGame = useGameStore((state) => state.initializeGame);
  const setTournamentMatchContext = useGameStore(
    (state) => state.setTournamentMatchContext
  );
  const [hasActiveMatch, setHasActiveMatch] = useState(false);
  const [gameSettings, setGameSettings] = useState(null);
  const [submitError, setSubmitError] = useState(null);

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
    setGameSettings({
      ...settingsFromGame,
      eventName: settingsFromGame.eventName || '',
    });
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

    setSubmitError(null);

    // If this was a tournament match, submit the result
    if (tournamentMatchContext) {
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

      const p1Start = tournamentMatchContext.player1StartScore ?? 0;
      const p2Start = tournamentMatchContext.player2StartScore ?? 0;
      const matchResult = {
        winner_id: winnerId,
        winner_name: winnerName,
        loser_id: loserId,
        loser_name: loserName,
        game_scores: gameState.gameScores,
        walkover: false,
        retired: false,
        ...((p1Start !== 0 || p2Start !== 0) && {
          handicap_starts: { player1: p1Start, player2: p2Start },
        }),
      };

      try {
        await api.submitTournamentMatchResult(
          tournamentMatchContext.tournamentId,
          tournamentMatchContext.matchId,
          matchResult
        );
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error submitting tournament match result:', error);
        // Show the error and keep the user on the current screen so they can retry
        setSubmitError(
          'Failed to save the match result. Please check your connection and try again.'
        );
        return; // Don't navigate — let the user retry or skip
      }

      useGameStore.getState().resetGame();
      setTournamentMatchContext(null);
      setHasActiveMatch(false);
      navigate(`/tournaments/${tournamentMatchContext.tournamentId}`);
      return;
    }

    useGameStore.getState().resetGame();
    setHasActiveMatch(false);
    navigate('/');
  };

  const handleSkipAndExit = () => {
    setSubmitError(null);
    setTournamentMatchContext(null);
    setHasActiveMatch(false);
    navigate('/tournaments');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleNavigateToTournament = (tournamentId) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const handleScoreTournamentMatch = (matchContext) => {
    setTournamentMatchContext({
      ...matchContext,
      player1Id:
        matchContext.player1Id || matchContext.participant_a?.participant_id,
      player2Id:
        matchContext.player2Id || matchContext.participant_b?.participant_id,
    });

    const mc = matchContext.matchConfig || {};
    const settings = {
      player1Name: matchContext.player1Name,
      player2Name: matchContext.player2Name,
      player1Color: 'border-red-500',
      player2Color: 'border-blue-500',
      pointsToWin: mc.points_to_win || 15,
      clearPoints: mc.clear_points || 2,
      bestOf: mc.best_of || 5,
      player1Serving: null, // decided on game screen via "Serving" button
      eventName: 'Tournament Match',
      player1StartScore: matchContext.player1StartScore ?? 0,
      player2StartScore: matchContext.player2StartScore ?? 0,
    };

    initializeGame(settings);
    setHasActiveMatch(true);
    navigate('/game');
  };

  return (
    <ErrorBoundary>
      <div className='h-full flex flex-col'>
        <div className='mx-auto w-full h-full bg-white shadow-lg'>

          {/* Tournament result submission error banner */}
          {submitError && (
            <div className='fixed inset-x-0 top-0 z-50 bg-red-600 text-white p-4 shadow-lg'>
              <p className='font-medium mb-2'>{submitError}</p>
              <div className='flex gap-3'>
                <button
                  onClick={handleFinishMatch}
                  className='px-4 py-2 bg-white text-red-600 rounded font-medium text-sm'
                >
                  Retry
                </button>
                <button
                  onClick={handleSkipAndExit}
                  className='px-4 py-2 border border-white rounded text-sm'
                >
                  Skip and exit
                </button>
              </div>
            </div>
          )}

          <Routes>
            <Route
              path='/'
              element={
                <LandingScreen
                  onNewMatch={() => {
                    if (hasActiveMatch) {
                      navigate('/setup/edit');
                    } else {
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
    </ErrorBoundary>
  );
}

export default App;
