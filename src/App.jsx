import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
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

// Performs the API save for any tournament match type — no navigation or state reset.
// Returns a resolved promise on success, rejects with an error on failure.
async function doSaveTournamentResult(gameState) {
  const ctx = gameState.tournamentMatchContext;
  if (!ctx) return;

  if (ctx.isTeamRRString) {
    const { tournamentId, fixtureId, stringNumber, currentStrings } = ctx;
    const { gameScores } = gameState;
    const scoredString = {
      string_number: stringNumber,
      team_a_games: gameScores.filter((s) => s.player1 > s.player2).length,
      team_b_games: gameScores.filter((s) => s.player2 > s.player1).length,
      team_a_player: gameState.player1.name || undefined,
      team_b_player: gameState.player2.name || undefined,
      game_scores: gameScores.map((s) => ({ team_a: s.player1, team_b: s.player2 })),
    };
    const existingStrings = (currentStrings || [])
      .filter((s) => s.persisted && s.string_number !== stringNumber)
      .map((s) => ({
        string_number: s.string_number,
        team_a_games: s.team_a_games,
        team_b_games: s.team_b_games,
        team_a_player: s.team_a_player || undefined,
        team_b_player: s.team_b_player || undefined,
        game_scores: (s.games || []).map((g) => ({ team_a: parseInt(g.a, 10), team_b: parseInt(g.b, 10) })),
      }));
    await api.saveDraftFixtureStrings(tournamentId, fixtureId, [...existingStrings, scoredString]);
    return;
  }

  if (ctx.isTeamRRExtra) {
    const { tournamentId, fixtureId, extraMatchType } = ctx;
    const { gameScores } = gameState;
    await api.saveExtraMatchResult(tournamentId, fixtureId, extraMatchType, {
      team_a_games: gameScores.filter((s) => s.player1 > s.player2).length,
      team_b_games: gameScores.filter((s) => s.player2 > s.player1).length,
      game_scores: gameScores.map((s) => ({ team_a: s.player1, team_b: s.player2 })),
    });
    return;
  }

  // Regular tournament match
  const { gameScores } = gameState;
  const player1Wins = gameScores.filter((s) => s.player1 > s.player2).length;
  const player2Wins = gameScores.filter((s) => s.player2 > s.player1).length;
  const p1Start = ctx.player1StartScore ?? 0;
  const p2Start = ctx.player2StartScore ?? 0;
  await api.submitTournamentMatchResult(ctx.tournamentId, ctx.matchId, {
    winner_id: player1Wins > player2Wins ? ctx.player1Id : ctx.player2Id,
    winner_name: player1Wins > player2Wins ? gameState.player1.name : gameState.player2.name,
    loser_id: player1Wins > player2Wins ? ctx.player2Id : ctx.player1Id,
    loser_name: player1Wins > player2Wins ? gameState.player2.name : gameState.player1.name,
    game_scores: gameScores,
    walkover: false,
    retired: false,
    ...((p1Start !== 0 || p2Start !== 0) && {
      handicap_starts: { player1: p1Start, player2: p2Start },
    }),
  });
}

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
  const matchWon = useGameStore((state) => state.matchWon);
  const [hasActiveMatch, setHasActiveMatch] = useState(false);
  const [gameSettings, setGameSettings] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const isSubmitting = useRef(false);
  // Tracks the in-flight auto-save so handleFinishMatch can await it instead of double-saving
  const autoSaveRef = useRef({ promise: null, succeeded: false });

  // Check if there's an active match when the component mounts
  useEffect(() => {
    const state = useGameStore.getState();
    const hasMatch =
      state.gameScores.length > 0 ||
      state.player1.score > 0 ||
      state.player2.score > 0;
    setHasActiveMatch(hasMatch);
  }, []);

  // Auto-save tournament results the moment the match is won so the result
  // isn't lost if the marker forgets to press "Finish match".
  useEffect(() => {
    if (!matchWon) return;
    if (autoSaveRef.current.promise) return; // already saving or saved

    const gameState = useGameStore.getState();
    if (!gameState.tournamentMatchContext) return;

    const promise = doSaveTournamentResult(gameState)
      .then(() => { autoSaveRef.current.succeeded = true; })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('Auto-save failed:', err);
        // handleFinishMatch will surface the error and offer a retry
      });

    autoSaveRef.current = { promise, succeeded: false };
  }, [matchWon]);

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
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    const gameState = useGameStore.getState();
    const ctx = gameState.tournamentMatchContext;

    setSubmitError(null);

    if (ctx) {
      // Ensure the result is saved. Auto-save fires the moment the match is won,
      // so in most cases this is already done or in flight.
      if (!autoSaveRef.current.succeeded) {
        try {
          if (autoSaveRef.current.promise) {
            // Wait for the in-progress auto-save rather than firing a duplicate request
            await autoSaveRef.current.promise;
          }
          if (!autoSaveRef.current.succeeded) {
            // Auto-save either wasn't started or failed — save now
            await doSaveTournamentResult(gameState);
            autoSaveRef.current.succeeded = true;
          }
        } catch (error) {
          if (import.meta.env.DEV) console.error('Error saving match result:', error);
          isSubmitting.current = false;
          setSubmitError('Failed to save the match result. Please check your connection and try again.');
          return;
        }
      }

      isSubmitting.current = false;
      autoSaveRef.current = { promise: null, succeeded: false };
      useGameStore.getState().resetGame();
      setTournamentMatchContext(null);
      setHasActiveMatch(false);

      if (ctx.isTeamRRString || ctx.isTeamRRExtra) {
        navigate(`/tournaments/${ctx.tournamentId}`, { state: { reopenFixtureId: ctx.fixtureId } });
      } else {
        navigate(`/tournaments/${ctx.tournamentId}`);
      }
      return;
    }

    isSubmitting.current = false;
    useGameStore.getState().resetGame();
    setHasActiveMatch(false);
    navigate('/');
  };

  const handleSkipAndExit = () => {
    setSubmitError(null);
    const ctx = useGameStore.getState().tournamentMatchContext;
    setTournamentMatchContext(null);
    setHasActiveMatch(false);
    if (ctx?.isTeamRRString || ctx?.isTeamRRExtra) {
      navigate(`/tournaments/${ctx.tournamentId}`, { state: { reopenFixtureId: ctx.fixtureId } });
    } else if (ctx?.tournamentId) {
      navigate(`/tournaments/${ctx.tournamentId}`);
    } else {
      navigate(-1);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleNavigateToTournament = (tournamentId) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const handleScoreTournamentMatch = (matchContext) => {
    autoSaveRef.current = { promise: null, succeeded: false };
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
                  onCancelMatch={handleSkipAndExit}
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
