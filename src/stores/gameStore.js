import { create } from 'zustand';
import api from '../utils/api';

const getUniqueTimestamp = () => {
  return new Date().getTime();
};

const useGameStore = create((set, get) => ({
  // Match settings
  matchSettings: {
    pointsToWin: 15,
    clearPoints: 2,
    bestOf: 5,
    isHandicap: false,
    player1StartScore: 0,
    player2StartScore: 0,
  },

  // Match state
  currentGame: 1,
  gameScores: [], // [{player1: 15, player2: 13}, ...]
  matchWon: false,

  // Tournament match context
  tournamentMatchContext: null,

  // Current game state
  gameNumber: 1,
  player1: {
    name: '',
    color: 'border-red-500',
    score: 0,
    serving: true,
    serveSide: 'R',
  },
  player2: {
    name: '',
    color: 'border-blue-500',
    score: 0,
    serving: false,
    serveSide: 'R',
  },

  // Match history
  gamesWon: {
    player1: 0,
    player2: 0,
  },

  // Initialize score history with starting position
  scoreHistory: [
    {
      type: 'initial',
      player1Score: 0,
      player2Score: 0,
      initialServeSide: 'R',
      servingPlayer: 'player1',
      timestamp: getUniqueTimestamp(),
    },
  ],

  servingDecided: true, // false when tournament match starts and server hasn't been chosen yet
  firstServiceComplete: false,

  // Add error state
  saveError: null,
  isSaving: false,

  // Add a flag to track if the match has been saved
  matchSaved: false,

  // Add event name to the store state
  eventName: '',

  // Serve side preference — updated whenever the serve side button is pressed, reset on new match
  player1ServePreference: 'R',
  player2ServePreference: 'R',

  // Actions
  setPlayerDetails: (playerNum, details) =>
    set((state) => ({
      [`player${playerNum}`]: {
        ...state[`player${playerNum}`],
        ...details,
      },
    })),

  // Set tournament match context
  setTournamentMatchContext: (context) =>
    set({ tournamentMatchContext: context }),

  // Reset game to initial state
  resetGame: () => {
    localStorage.removeItem('las_active_game');
    set(() => ({
      player1: {
        name: '',
        color: 'border-red-500',
        score: 0,
        serving: true,
        serveSide: 'R',
      },
      player2: {
        name: '',
        color: 'border-blue-500',
        score: 0,
        serving: false,
        serveSide: 'R',
      },
      currentGame: 1,
      gameScores: [],
      matchWon: false,
      matchSaved: false,
      eventName: '',
      tournamentMatchContext: null, // Clear tournament context
      player1ServePreference: 'R',
      player2ServePreference: 'R',
      scoreHistory: [
        {
          type: 'initial',
          player1Score: 0,
          player2Score: 0,
          initialServeSide: 'R',
          servingPlayer: 'player1',
          timestamp: getUniqueTimestamp(),
        },
      ],
    }));
  },

  // Add back checkGameWin for the modal
  checkGameWin: () => {
    const state = get();
    const { pointsToWin, clearPoints } = state.matchSettings;
    const { player1, player2 } = state;

    if (
      player1.score >= pointsToWin &&
      player1.score - player2.score >= clearPoints
    ) {
      return 1;
    }
    if (
      player2.score >= pointsToWin &&
      player2.score - player1.score >= clearPoints
    ) {
      return 2;
    }
    return 0;
  },

  // Check if it's game point for a player
  isGamePoint: (playerNum) => {
    const state = get();
    const { pointsToWin, clearPoints } = state.matchSettings;
    const player = state[`player${playerNum}`];
    const opponent = state[`player${playerNum === 1 ? 2 : 1}`];

    // Player is at game point if they need one more point to win
    const wouldWinWithOneMorePoint =
      player.score + 1 >= pointsToWin &&
      player.score + 1 - opponent.score >= clearPoints;

    return wouldWinWithOneMorePoint;
  },

  // Check if it's match point for a player
  isMatchPoint: (playerNum) => {
    const state = get();

    // First check if it's game point
    const isGamePoint = get().isGamePoint(playerNum);
    if (!isGamePoint) return false;

    // Then check if winning this game would win the match
    const currentGameWins = state.gameScores.filter((game) =>
      playerNum === 1
        ? game.player1 > game.player2
        : game.player2 > game.player1
    ).length;

    // If they win this game, would they have enough games to win the match?
    const gamesNeededToWin = Math.ceil(state.matchSettings.bestOf / 2);
    return currentGameWins + 1 >= gamesNeededToWin;
  },

  addPoint: (playerNum) =>
    set((state) => {
      if (state.matchWon) return state;
      const player = `player${playerNum}`;
      const opponentNum = playerNum === 1 ? 2 : 1;
      const opponent = `player${opponentNum}`;
      const newScore = state[player].score + 1;
      const isHandout = !state[player].serving;

      // Handout: new server starts from their stored preference; otherwise toggle
      const newServeSide = isHandout
        ? (playerNum === 1 ? state.player1ServePreference : state.player2ServePreference)
        : state[player].serveSide === 'R' ? 'L' : 'R';

      const newHistory = [...state.scoreHistory];

      if (isHandout) {
        newHistory.push({
          type: 'score',
          player: opponent,
          score: state[opponent].score,
          serveSide: state[opponent].serveSide,
          isHandout: true,
          timestamp: getUniqueTimestamp(),
        });
      } else {
        newHistory.push({
          type: 'score',
          player,
          score: state[player].score,
          serveSide: state[player].serveSide,
          timestamp: getUniqueTimestamp(),
        });
      }

      const { pointsToWin, clearPoints } = state.matchSettings;
      const opponentScore = state[opponent].score;
      const isWinningPoint =
        newScore >= pointsToWin && newScore - opponentScore >= clearPoints;

      if (isWinningPoint) {
        const newGameScores = [
          ...state.gameScores,
          {
            player1: playerNum === 1 ? newScore : opponentScore,
            player2: playerNum === 2 ? newScore : opponentScore,
          },
        ];

        const playerWins = newGameScores.filter((s) =>
          playerNum === 1 ? s.player1 > s.player2 : s.player2 > s.player1
        ).length;
        const matchWon = playerWins > state.matchSettings.bestOf / 2;

        return {
          ...state,
          [player]: { ...state[player], score: newScore, serving: true, serveSide: newServeSide },
          [opponent]: { ...state[opponent], serving: false },
          scoreHistory: newHistory,
          gameScores: newGameScores,
          matchWon,
        };
      }

      return {
        ...state,
        [player]: { ...state[player], score: newScore, serving: true, serveSide: newServeSide },
        [opponent]: { ...state[opponent], serving: false },
        scoreHistory: newHistory,
      };
    }),

  toggleServeSide: (playerNum) =>
    set((state) => {
      const player = `player${playerNum}`;
      const newServeSide = state[player].serveSide === 'R' ? 'L' : 'R';

      // If no points scored yet, update the initial serve side in history
      const newHistory = [...state.scoreHistory];
      if (state.player1.score === 0 && state.player2.score === 0) {
        newHistory[0] = {
          ...newHistory[0],
          initialServeSide: newServeSide,
        };
      }

      return {
        [player]: { ...state[player], serveSide: newServeSide },
        [`player${playerNum}ServePreference`]: newServeSide,
        scoreHistory: newHistory,
      };
    }),

  undoLastPoint: () =>
    set((state) => {
      if (state.scoreHistory.length <= 1) return state;

      // Get the last entry and remove it
      const lastEntry = state.scoreHistory[state.scoreHistory.length - 1];
      let newHistory = state.scoreHistory.slice(0, -1);

      // If it's a let entry, just remove it — no score changes
      if (lastEntry.type === 'let') {
        return { scoreHistory: newHistory };
      }

      // If it's a stroke entry, remove the previous entries and reduce score
      if (lastEntry.type === 'stroke') {
        const player = lastEntry.player;
        const opponent = player === 'player1' ? 'player2' : 'player1';
        newHistory = newHistory.slice(0, -1);

        // If it was a handout stroke, restore serving state
        if (lastEntry.isHandout) {
          return {
            [player]: { ...state[player], score: state[player].score - 1, serving: false },
            [opponent]: { ...state[opponent], serving: true },
            scoreHistory: newHistory,
          };
        }

        // Regular stroke undo
        return {
          [player]: { ...state[player], score: state[player].score - 1 },
          scoreHistory: newHistory,
        };
      }

      // If it's a nolet entry, undo the awarded point
      if (lastEntry.type === 'nolet') {
        const player = lastEntry.player;
        const opponent = player === 'player1' ? 'player2' : 'player1';

        if (lastEntry.isHandout) {
          newHistory = newHistory.slice(0, -1);
          return {
            [player]: { ...state[player], serving: true, serveSide: lastEntry.serveSide },
            [opponent]: { ...state[opponent], score: state[opponent].score - 1, serving: false },
            scoreHistory: newHistory,
          };
        }

        // Regular nolet: opponent got the point, reduce their score
        return {
          [opponent]: { ...state[opponent], score: state[opponent].score - 1, serveSide: lastEntry.serveSide },
          scoreHistory: newHistory,
        };
      }

      // Handle regular scoring entries
      if (lastEntry.type === 'score') {
        const player = lastEntry.player;
        const opponent = player === 'player1' ? 'player2' : 'player1';

        if (lastEntry.isHandout) {
          return {
            [player]: { ...state[player], serving: true, serveSide: lastEntry.serveSide },
            [opponent]: { ...state[opponent], score: state[opponent].score - 1, serving: false },
            scoreHistory: newHistory,
          };
        }

        // Regular point undo
        return {
          [player]: { ...state[player], score: state[player].score - 1, serveSide: lastEntry.serveSide },
          scoreHistory: newHistory,
        };
      }

      // For any other type of entry, just remove it without changing scores
      return { scoreHistory: newHistory };
    }),

  // Add let to score history
  addLet: (playerNum) =>
    set((state) => {
      const player = `player${playerNum}`;
      const newHistory = [...state.scoreHistory];

      newHistory.push({
        type: 'let',
        player,
        score: state[player].score,
        serveSide: state[player].serving ? state[player].serveSide : null,
        timestamp: getUniqueTimestamp(),
      });

      return {
        scoreHistory: newHistory,
      };
    }),

  handleLetDecision: (playerNum, decision) =>
    set((state) => {
      const player = `player${playerNum}`;
      const opponent = `player${playerNum === 1 ? 2 : 1}`;
      const newHistory = [...state.scoreHistory];

      switch (decision) {
        case 'let': {
          // Record the let in history so it can be undone
          const servingPlayer = state.player1.serving ? 'player1' : 'player2';
          newHistory.push({
            type: 'let',
            player: servingPlayer,
            score: state[servingPlayer].score,
            serveSide: state[servingPlayer].serveSide,
            timestamp: getUniqueTimestamp(),
          });
          return { scoreHistory: newHistory };
        }

        case 'stroke': {
          const isHandout = !state[player].serving;
          const newScore = state[player].score + 1;

          const newServeSide = isHandout
            ? (playerNum === 1 ? state.player1ServePreference : state.player2ServePreference)
            : state[player].serveSide === 'R' ? 'L' : 'R';

          if (isHandout) {
            newHistory.push({
              type: 'stroke',
              player: opponent,
              score: state[opponent].score,
              serveSide: state[opponent].serveSide,
              isHandout: true,
              timestamp: getUniqueTimestamp(),
            });
          } else {
            newHistory.push({
              type: 'stroke',
              player,
              score: state[player].score,
              serveSide: state[player].serveSide,
              timestamp: getUniqueTimestamp(),
            });
          }

          const { pointsToWin, clearPoints } = state.matchSettings;
          const opponentScore = state[opponent].score;
          const isWinningPoint =
            newScore >= pointsToWin && newScore - opponentScore >= clearPoints;

          if (isWinningPoint) {
            const newGameScores = [
              ...state.gameScores,
              {
                player1: playerNum === 1 ? newScore : opponentScore,
                player2: playerNum === 2 ? newScore : opponentScore,
              },
            ];

            const playerWins = newGameScores.filter((s) =>
              playerNum === 1 ? s.player1 > s.player2 : s.player2 > s.player1
            ).length;
            const matchWon = playerWins > state.matchSettings.bestOf / 2;

            return {
              ...state,
              [player]: { ...state[player], score: newScore, serving: true, serveSide: newServeSide },
              [opponent]: { ...state[opponent], serving: false },
              scoreHistory: newHistory,
              gameScores: newGameScores,
              matchWon,
            };
          }

          return {
            [player]: { ...state[player], score: newScore, serving: true, serveSide: newServeSide },
            [opponent]: { ...state[opponent], serving: false },
            scoreHistory: newHistory,
          };
        }

        case 'nolet': {
          const isServingPlayerCalling = state[player].serving;
          const willHandout = isServingPlayerCalling;
          const newScore = state[opponent].score + 1;
          const opponentNum = playerNum === 1 ? 2 : 1;

          const newServeSide = willHandout
            ? (opponentNum === 1 ? state.player1ServePreference : state.player2ServePreference)
            : state[opponent].serveSide === 'R' ? 'L' : 'R';

          if (willHandout) {
            newHistory.push({
              type: 'nolet',
              player,
              score: state[player].score,
              serveSide: state[player].serveSide,
              isHandout: true,
              timestamp: getUniqueTimestamp(),
            });
          } else {
            newHistory.push({
              type: 'nolet',
              player: opponent,
              score: state[opponent].score,
              serveSide: state[opponent].serveSide,
              timestamp: getUniqueTimestamp(),
            });
          }

          const { pointsToWin, clearPoints } = state.matchSettings;
          const callingPlayerScore = state[player].score;
          const isWinningPoint =
            newScore >= pointsToWin && newScore - callingPlayerScore >= clearPoints;

          if (isWinningPoint) {
            const newGameScores = [
              ...state.gameScores,
              {
                player1: opponentNum === 1 ? newScore : callingPlayerScore,
                player2: opponentNum === 2 ? newScore : callingPlayerScore,
              },
            ];

            const playerWins = newGameScores.filter((s) =>
              opponentNum === 1 ? s.player1 > s.player2 : s.player2 > s.player1
            ).length;
            const matchWon = playerWins > state.matchSettings.bestOf / 2;

            return {
              ...state,
              [opponent]: { ...state[opponent], score: newScore, serving: true, serveSide: newServeSide },
              [player]: { ...state[player], serving: false },
              scoreHistory: newHistory,
              gameScores: newGameScores,
              matchWon,
            };
          }

          return {
            [opponent]: { ...state[opponent], score: newScore, serving: true, serveSide: newServeSide },
            [player]: { ...state[player], serving: false },
            scoreHistory: newHistory,
          };
        }

        default:
          return state;
      }
    }),

  // Record game result and check for match win
  recordGameWin: () =>
    set((state) => {
      // Don't modify gameScores here, it's already handled in addPoint
      // Just return the state with matchWon set to false
      return {
        ...state,
        matchWon: false, // We'll handle match win check separately
      };
    }),

  // Start next game
  startNextGame: () =>
    set((state) => {
      // Determine who won the last game
      const lastGameIndex = state.gameScores.length - 1;
      if (lastGameIndex < 0) return state; // No games played yet

      const lastGame = state.gameScores[lastGameIndex];
      const player1WonLastGame = lastGame.player1 > lastGame.player2;

      // New server starts from their learned preference for this match
      const newServerSide = player1WonLastGame
        ? state.player1ServePreference
        : state.player2ServePreference;

      return {
        ...state,
        currentGame: state.currentGame + 1,
        player1: {
          ...state.player1,
          score: 0,
          serving: player1WonLastGame,
          serveSide: player1WonLastGame ? newServerSide : 'R',
        },
        player2: {
          ...state.player2,
          score: 0,
          serving: !player1WonLastGame,
          serveSide: !player1WonLastGame ? newServerSide : 'R',
        },
        scoreHistory: [
          {
            type: 'initial',
            player1Score: 0,
            player2Score: 0,
            initialServeSide: newServerSide,
            servingPlayer: player1WonLastGame ? 'player1' : 'player2',
            timestamp: getUniqueTimestamp(),
          },
        ],
      };
    }),

  // Initialize game with settings
  initializeGame: (settings) => {
    // Make sure eventName is a string, not undefined or null
    const eventName = settings.eventName || '';

    set(() => ({
      matchSettings: {
        pointsToWin: settings.pointsToWin,
        clearPoints: settings.clearPoints,
        bestOf: settings.bestOf,
        isHandicap: settings.isHandicap ?? false,
        player1StartScore: settings.player1StartScore ?? 0,
        player2StartScore: settings.player2StartScore ?? 0,
      },
      servingDecided: settings.player1Serving !== null && settings.player1Serving !== undefined,
      player1: {
        name: settings.player1Name,
        color: settings.player1Color,
        score: settings.player1StartScore ?? 0,
        serving: settings.player1Serving === null || settings.player1Serving === undefined ? false : settings.player1Serving,
        serveSide: 'R',
      },
      player2: {
        name: settings.player2Name,
        color: settings.player2Color,
        score: settings.player2StartScore ?? 0,
        serving: settings.player1Serving === null || settings.player1Serving === undefined ? false : !settings.player1Serving,
        serveSide: 'R',
      },
      eventName: eventName, // Use the validated event name
      player1ServePreference: 'R',
      player2ServePreference: 'R',
      currentGame: 1,
      gameScores: [],
      matchWon: false,
      matchSaved: false,
      scoreHistory: [
        {
          type: 'initial',
          player1Score: settings.player1StartScore ?? 0,
          player2Score: settings.player2StartScore ?? 0,
          initialServeSide: 'R',
          servingPlayer: settings.player1Serving === false ? 'player2' : 'player1',
          timestamp: getUniqueTimestamp(),
        },
      ],
    }));
  },

  selectServer: (playerNum) => {
    const p1Serving = playerNum === 1;
    set((state) => ({
      servingDecided: true,
      player1: { ...state.player1, serving: p1Serving, serveSide: 'R' },
      player2: { ...state.player2, serving: !p1Serving, serveSide: 'R' },
      scoreHistory: state.scoreHistory.map((entry, i) =>
        i === 0 ? { ...entry, servingPlayer: p1Serving ? 'player1' : 'player2' } : entry
      ),
    }));
  },

  // Updated save method with error handling
  saveCompletedMatch: async () => {
    const state = get();

    // Check if the match has already been saved
    if (state.matchSaved) {
      return true; // Already saved, no need to save again
    }

    set({ isSaving: true, saveError: null });

    // Make sure eventName is a string, not undefined or null
    const eventName = state.eventName || '';

    const matchData = {
      player1Name: state.player1.name,
      player2Name: state.player2.name,
      player1Color: state.player1.color,
      player2Color: state.player2.color,
      gameScores: state.gameScores,
      matchSettings: state.matchSettings,
      eventName: eventName, // Use the validated event name
      date: new Date(),
    };

    try {
      await api.saveMatch(matchData);
      localStorage.removeItem('las_active_game');
      set({ isSaving: false, matchSaved: true });
      return true;
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error saving match:', error);
      set({
        saveError: 'Failed to save match. Please try again.',
        isSaving: false,
      });
      return false;
    }
  },

  // Updated game completion handler
  handleGameCompletion: async () => {
    // Check if match is won
    const matchWon = get().checkMatchWin();
    if (matchWon) {
      set({ matchWon: true });

      // Only save to regular matches API if this is NOT a tournament match
      const state = get();
      if (!state.tournamentMatchContext) {
        const savedSuccessfully = await get().saveCompletedMatch();
        if (!savedSuccessfully && import.meta.env.DEV) {
          console.error('Match save failed');
        }
      }
    }

    // Start next game if match isn't over
    if (!matchWon) {
      // Reset scores but DON'T increment game number here
      // The game number will be incremented in startNextGame
      set((state) => ({
        player1: { ...state.player1, score: 0 },
        player2: { ...state.player2, score: 0 },
      }));
    }
  },

  // Add method to clear error
  clearSaveError: () => set({ saveError: null }),

  // Restore a previously persisted in-progress game from localStorage
  restorePersistedGame: () => {
    try {
      const raw = localStorage.getItem('las_active_game');
      if (!raw) return false;
      const saved = JSON.parse(raw);
      set({
        matchSettings: saved.matchSettings,
        player1: saved.player1,
        player2: saved.player2,
        currentGame: saved.currentGame,
        gameScores: saved.gameScores,
        gamesWon: saved.gamesWon,
        matchWon: saved.matchWon,
        scoreHistory: saved.scoreHistory,
        firstServiceComplete: saved.firstServiceComplete,
        eventName: saved.eventName,
        tournamentMatchContext: saved.tournamentMatchContext,
        player1ServePreference: saved.player1ServePreference ?? 'R',
        player2ServePreference: saved.player2ServePreference ?? 'R',
        matchSaved: false,
        saveError: null,
        isSaving: false,
      });
      return true;
    } catch {
      localStorage.removeItem('las_active_game');
      return false;
    }
  },

  checkMatchWin: () => {
    const state = get();
    const { bestOf } = state.matchSettings;
    const { gameScores } = state;

    // Calculate wins for each player
    const player1Wins = gameScores.filter(
      (score) => score.player1 > score.player2
    ).length;
    const player2Wins = gameScores.filter(
      (score) => score.player2 > score.player1
    ).length;

    // Check if either player has won more than half of the total games
    if (player1Wins > bestOf / 2) {
      return 1;
    }
    if (player2Wins > bestOf / 2) {
      return 2;
    }

    return 0; // No winner yet
  },

  // Update the updateGameSettings method to preserve the event name
  updateGameSettings: (settings) => {
    set((state) => ({
      matchSettings: {
        ...state.matchSettings,
        pointsToWin: settings.pointsToWin,
        clearPoints: settings.clearPoints,
        bestOf: settings.bestOf,
      },
      player1: {
        ...state.player1,
        name: settings.player1Name,
        color: settings.player1Color,
        // Don't update score or serving status
      },
      player2: {
        ...state.player2,
        name: settings.player2Name,
        color: settings.player2Color,
        // Don't update score or serving status
      },
      // Update or preserve the event name
      eventName: settings.eventName || state.eventName || '',
      // Don't reset currentGame, gameScores, or matchWon
    }));
  },
}));

// Persist active game state to localStorage after every state change.
// Only writes when a named match is in progress and not yet saved.
useGameStore.subscribe((state) => {
  if (!state.player1.name || !state.player2.name || state.matchSaved) return;
  try {
    localStorage.setItem('las_active_game', JSON.stringify({
      matchSettings: state.matchSettings,
      player1: state.player1,
      player2: state.player2,
      currentGame: state.currentGame,
      gameScores: state.gameScores,
      gamesWon: state.gamesWon,
      matchWon: state.matchWon,
      scoreHistory: state.scoreHistory,
      firstServiceComplete: state.firstServiceComplete,
      eventName: state.eventName,
      tournamentMatchContext: state.tournamentMatchContext,
      player1ServePreference: state.player1ServePreference,
      player2ServePreference: state.player2ServePreference,
      savedAt: Date.now(),
    }));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
});

export default useGameStore;
