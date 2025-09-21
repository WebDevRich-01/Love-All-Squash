# Love All Squash - Frontend

A professional squash match scoring and tracking Progressive Web App with enhanced features.

## Features

- Professional squash scoring system
- Match history tracking
- Event management
- PWA capabilities (installable, offline support)
- Responsive design for mobile and desktop
- Wake lock support to keep screen active during matches

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- Zustand for state management
- PWA with Workbox

## Development Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env.local
   ```

4. Update `.env.local` with your backend API URL:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   VITE_USE_LOCAL_STORAGE=false
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Build and Deploy

### Local Build
```bash
npm run build
npm run preview
```

### Netlify Deployment

1. Connect this repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard:
   - `VITE_API_URL`: Your backend API URL
   - `VITE_USE_LOCAL_STORAGE`: `false`

The `netlify.toml` file is already configured with proper redirects and caching headers.

## Environment Variables

- `VITE_API_URL`: Backend API URL
- `VITE_USE_LOCAL_STORAGE`: Set to `true` for local development without backend
- `VITE_PWA_ENABLED`: Enable/disable PWA features

## Project Structure

```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── stores/        # Zustand state management
├── utils/         # Utility functions
└── pages/         # Page components
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
