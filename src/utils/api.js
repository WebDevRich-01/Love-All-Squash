// API utility that switches between localStorage and real API based on environment

// Check if we're in development mode
const isDevelopment = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Admin token storage (sessionStorage — cleared when tab closes)
export const getAdminToken = () => sessionStorage.getItem('adminToken');
export const setAdminToken = (token) => sessionStorage.setItem('adminToken', token);
export const clearAdminToken = () => sessionStorage.removeItem('adminToken');

// Build auth headers for write operations
const authHeaders = () => {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const REQUEST_TIMEOUT_MS = 15000;
const MAX_GET_RETRIES = 2;

// Helper to get matches from localStorage
const getStoredMatches = () => {
  const matches = localStorage.getItem('squash_matches');
  return matches ? JSON.parse(matches) : [];
};

// Helper to save matches to localStorage
const saveStoredMatches = (matches) => {
  localStorage.setItem('squash_matches', JSON.stringify(matches));
};

// Helper to get events from localStorage
const getStoredEvents = () => {
  const events = localStorage.getItem('events');
  return events ? JSON.parse(events) : [];
};

/**
 * fetch() with a hard timeout. Throws if the request exceeds timeoutMs.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET-only: retries up to maxRetries times with exponential backoff (1s, 2s…).
 * Only retries on network errors or 5xx responses.
 */
async function fetchWithRetry(url, maxRetries = MAX_GET_RETRIES) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
    try {
      const response = await fetchWithTimeout(url);
      // Don't retry on 4xx – those are client errors
      if (response.status >= 400 && response.status < 500) return response;
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return response;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const api = {
  // Tournament methods
  getTournamentFormats: async () => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { id: 'single_elimination', name: 'Single Elimination' },
            { id: 'monrad', name: 'Monrad (Swiss)' },
          ]);
        }, 300);
      });
    }
    const response = await fetchWithRetry(`${API_URL}/api/tournaments/formats`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  createTournament: async (tournamentData) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ...tournamentData,
            _id: `tournament_${Date.now()}`,
            status: 'active',
            created_at: new Date().toISOString(),
          });
        }, 500);
      });
    }
    const response = await fetchWithTimeout(`${API_URL}/api/tournaments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(tournamentData),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.details
        ? `: ${errorData.details.map((d) => `${d.field || 'unknown'}: ${d.message}`).join('; ')}`
        : '';
      throw new Error((errorData.error || `API error: ${response.status}`) + detail);
    }
    return response.json();
  },

  getTournaments: async () => {
    if (isDevelopment) {
      const tournaments = localStorage.getItem('tournaments');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(tournaments ? JSON.parse(tournaments) : []);
        }, 300);
      });
    }
    const response = await fetchWithRetry(`${API_URL}/api/tournaments`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getTournament: async (id) => {
    if (isDevelopment) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const tournaments = localStorage.getItem('tournaments');
          const tournamentList = tournaments ? JSON.parse(tournaments) : [];
          const tournament = tournamentList.find((t) => t._id === id);
          if (tournament) {
            resolve({
              tournament,
              participants: tournament.participants || [],
              matches: tournament.matches || [],
              groups: tournament.groups || [],
            });
          } else {
            reject(new Error('Tournament not found'));
          }
        }, 300);
      });
    }
    const response = await fetchWithRetry(`${API_URL}/api/tournaments/${id}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getTournamentStandings: async (id) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ type: 'bracket', currentRound: 1, standings: [] });
        }, 300);
      });
    }
    const response = await fetchWithRetry(
      `${API_URL}/api/tournaments/${id}/standings`
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  getPlayableTournamentMatches: async (tournamentId) => {
    if (isDevelopment) {
      return new Promise((resolve) => setTimeout(() => resolve([]), 300));
    }
    const response = await fetchWithRetry(
      `${API_URL}/api/tournaments/${tournamentId}/matches/playable`
    );
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  submitTournamentMatchResult: async (tournamentId, matchId, result) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true, tournament_complete: false }), 500);
      });
    }
    const response = await fetchWithTimeout(
      `${API_URL}/api/tournaments/${tournamentId}/matches/${matchId}/result`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(result),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    return response.json();
  },

  verifyTournamentPassphrase: async (id, passphrase) => {
    const response = await fetchWithTimeout(`${API_URL}/api/tournaments/${id}/verify-passphrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    return response.json();
  },

  startTournament: async (id, passphrase) => {
    const response = await fetchWithTimeout(`${API_URL}/api/tournaments/${id}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ passphrase }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    return response.json();
  },

  resetTournament: async (id, passphrase) => {
    const response = await fetchWithTimeout(`${API_URL}/api/tournaments/${id}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ passphrase }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    return response.json();
  },

  updateTournament: async (id, data, passphrase) => {
    const response = await fetchWithTimeout(`${API_URL}/api/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ ...data, passphrase }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    return response.json();
  },

  updateTournamentParticipant: async (tournamentId, participantId, name, passphrase) => {
    const response = await fetchWithTimeout(
      `${API_URL}/api/tournaments/${tournamentId}/participants/${participantId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name, passphrase }),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }
    return response.json();
  },

  deleteTournament: async (id) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const tournaments = localStorage.getItem('tournaments');
          const tournamentList = tournaments ? JSON.parse(tournaments) : [];
          localStorage.setItem(
            'tournaments',
            JSON.stringify(tournamentList.filter((t) => t._id !== id))
          );
          resolve({ success: true });
        }, 300);
      });
    }
    const response = await fetchWithTimeout(`${API_URL}/api/tournaments/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  // Get all matches
  getMatches: async () => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => resolve(getStoredMatches()), 300);
      });
    }
    const response = await fetchWithRetry(`${API_URL}/api/matches`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  // Get a specific match
  getMatch: async (id) => {
    if (isDevelopment) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const match = getStoredMatches().find((m) => m._id === id);
          if (match) resolve(match);
          else reject(new Error('Match not found'));
        }, 300);
      });
    }
    const response = await fetchWithRetry(`${API_URL}/api/matches/${id}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  // Save a match
  saveMatch: async (matchData) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const matches = getStoredMatches();
          const newMatch = {
            ...matchData,
            _id: `match_${Date.now()}`,
            date: new Date().toISOString(),
          };
          matches.unshift(newMatch);
          saveStoredMatches(matches);

          if (matchData.eventName && matchData.eventName.trim() !== '') {
            const events = getStoredEvents();
            if (!events.some((e) => e.name === matchData.eventName)) {
              events.push({
                name: matchData.eventName,
                date: new Date().toISOString(),
                id: Date.now().toString(),
              });
              localStorage.setItem('events', JSON.stringify(events));
            }
          }

          resolve(newMatch);
        }, 300);
      });
    }
    const response = await fetchWithTimeout(`${API_URL}/api/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matchData),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => String(response.status));
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    return response.json();
  },

  // Delete a match
  deleteMatch: async (id) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const matches = getStoredMatches();
          const updated = matches.filter((m) => m._id !== id);
          if (updated.length < matches.length) {
            saveStoredMatches(updated);
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Match not found' });
          }
        }, 300);
      });
    }
    try {
      const response = await fetchWithTimeout(`${API_URL}/api/matches/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Get unique event names
  getEventNames: async () => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const storedEvents = localStorage.getItem('events');
          if (storedEvents) {
            resolve(JSON.parse(storedEvents).map((e) => e.name));
            return;
          }
          const eventNames = [
            ...new Set(
              getStoredMatches()
                .map((m) => m.eventName)
                .filter((n) => n && n.trim() !== '')
            ),
          ];
          resolve(eventNames);
        }, 300);
      });
    }
    const response = await fetchWithRetry(`${API_URL}/api/events`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.map((event) => event.name);
  },
};

export default api;
