# Love All Squash — Frontend

React 19 + Vite PWA for court-side squash scoring.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run lint      # ESLint
```

## Environment

Copy `.env.example` to `.env.local` and set:

```
VITE_API_URL=https://your-backend.onrender.com
VITE_USE_LOCAL_STORAGE=false   # set true to skip backend entirely in dev
VITE_PWA_ENABLED=true
```

When `VITE_USE_LOCAL_STORAGE=true`, all API calls use localStorage with simulated delays — no backend needed for local development.

## Architecture

### State Management
All match state lives in a single Zustand store: `src/stores/gameStore.js`

Key actions:
- `addPoint(playerNum)` — award a point; handles serve rotation and handout detection automatically
- `toggleServeSide(playerNum)` — switch serve side (R/L)
- `handleLetDecision(playerNum, decision)` — process let / stroke / no-let
- `undoLastPoint()` — full state rollback from scoreHistory
- `startNextGame()` — transition between games
- `saveCompletedMatch()` — persist to backend (non-tournament matches)

### API Layer
`src/utils/api.js` is the single point of contact with the backend. It switches between localStorage mock and real HTTP based on `VITE_USE_LOCAL_STORAGE`. Always call through this module — never use fetch directly in components.

### Routing
React Router DOM v7. Routes defined in `src/App.jsx`:

| Path | Component |
|------|-----------|
| `/` | `LandingScreen` |
| `/setup` | `GameSetupScreen` |
| `/setup/edit` | `GameSetupScreen` (edit mode) |
| `/game` | `GameScreen` |
| `/history` | `MatchHistoryScreen` |
| `/tournaments` | `TournamentScreen` |
| `/tournaments/:id` | `TournamentDetailScreen` |

### Tournament Flow
Regular matches and tournament matches both use `GameScreen`. When launching a tournament match, a `tournamentMatchContext` object is injected into the store — this changes the save behaviour and post-match navigation. Don't branch the UI for tournament vs non-tournament; use the context.

## Key Files

| File | Purpose |
|------|---------|
| `src/stores/gameStore.js` | All match/game state (~1500 lines) |
| `src/utils/api.js` | API abstraction layer |
| `src/App.jsx` | Router and tournament context management |
| `src/components/GameScreen.jsx` | Live scoring UI |
| `src/components/GameSetupScreen.jsx` | Match configuration |
| `src/components/TournamentDetailScreen.jsx` | Tournament view and match launching |
| `vite.config.js` | Build config, PWA manifest, Workbox |

## Squash Rules (Hardcoded Defaults)
- First to 15 points, win by 2 clear
- Best of 5 games
- Serve side alternates R/L; handout resets serve side to R
- Player colours are Tailwind border classes (e.g. `border-red-500`)

## Styling
Tailwind CSS 4.0 (utility classes only — no custom CSS files beyond `index.css`). Use existing Tailwind classes before adding new ones.

## PWA Notes
- Service worker managed by Workbox via `vite-plugin-pwa`
- `PWAUpdatePrompt.jsx` handles update notifications
- Wake lock (`src/hooks/useWakeLock.js`) keeps screen on during matches — requested on `GameScreen` mount, released on unmount
