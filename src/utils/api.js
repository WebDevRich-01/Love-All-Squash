// API utility that switches between localStorage and real API based on environment

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

// Check if we're in development mode
const isDevelopment = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = {
  // Tournament methods
  getTournamentFormats: async () => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { id: 'single_elimination', name: 'Single Elimination' },
            { id: 'round_robin', name: 'Round Robin' },
            { id: 'monrad', name: 'Monrad / Progressive Consolation' },
            { id: 'pools_knockout', name: 'Pools → Knockout' },
          ]);
        }, 300);
      });
    } else {
      try {
        const response = await fetch(`${API_URL}/api/tournaments/formats`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching tournament formats:', error);
        throw error;
      }
    }
  },

  createTournament: async (tournamentData) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const tournament = {
            ...tournamentData,
            _id: `tournament_${Date.now()}`,
            status: 'active',
            created_at: new Date().toISOString(),
          };
          resolve(tournament);
        }, 500);
      });
    } else {
      try {
        const response = await fetch(`${API_URL}/api/tournaments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tournamentData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error creating tournament:', error);
        throw error;
      }
    }
  },

  getTournaments: async () => {
    if (isDevelopment) {
      const tournaments = localStorage.getItem('tournaments');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(tournaments ? JSON.parse(tournaments) : []);
        }, 300);
      });
    } else {
      try {
        const response = await fetch(`${API_URL}/api/tournaments`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        throw error;
      }
    }
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
    } else {
      try {
        const response = await fetch(`${API_URL}/api/tournaments/${id}`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching tournament:', error);
        throw error;
      }
    }
  },

  getTournamentStandings: async (id) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            type: 'bracket',
            currentRound: 1,
            standings: [],
          });
        }, 300);
      });
    } else {
      try {
        const response = await fetch(
          `${API_URL}/api/tournaments/${id}/standings`
        );
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching tournament standings:', error);
        throw error;
      }
    }
  },

  getPlayableTournamentMatches: async (tournamentId) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([]);
        }, 300);
      });
    } else {
      try {
        const response = await fetch(
          `${API_URL}/api/tournaments/${tournamentId}/matches/playable`
        );
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error fetching playable matches:', error);
        throw error;
      }
    }
  },

  submitTournamentMatchResult: async (tournamentId, matchId, result) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true, tournament_complete: false });
        }, 500);
      });
    } else {
      try {
        const response = await fetch(
          `${API_URL}/api/tournaments/${tournamentId}/matches/${matchId}/result`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
          }
        );
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error submitting tournament match result:', error);
        throw error;
      }
    }
  },

  deleteTournament: async (id) => {
    if (isDevelopment) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const tournaments = localStorage.getItem('tournaments');
          const tournamentList = tournaments ? JSON.parse(tournaments) : [];
          const updatedTournaments = tournamentList.filter((t) => t._id !== id);
          localStorage.setItem(
            'tournaments',
            JSON.stringify(updatedTournaments)
          );
          resolve({ success: true });
        }, 300);
      });
    } else {
      try {
        const response = await fetch(`${API_URL}/api/tournaments/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.error('Error deleting tournament:', error);
        throw error;
      }
    }
  },

  // Get all matches
  getMatches: async () => {
    if (isDevelopment) {
      // Use localStorage in development
      return new Promise((resolve) => {
        setTimeout(() => {
          const matches = getStoredMatches();
          resolve(matches);
        }, 300);
      });
    } else {
      // Use real API in production
      try {
        const response = await fetch(`${API_URL}/api/matches`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error fetching matches from API:', error);
        throw error;
      }
    }
  },

  // Get a specific match
  getMatch: async (id) => {
    if (isDevelopment) {
      // Use localStorage in development
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const matches = getStoredMatches();
          const match = matches.find((m) => m._id === id);
          if (match) {
            resolve(match);
          } else {
            reject(new Error('Match not found'));
          }
        }, 300);
      });
    } else {
      // Use real API in production
      try {
        const response = await fetch(`${API_URL}/api/matches/${id}`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching match from API:', error);
        throw error;
      }
    }
  },

  // Save a match
  saveMatch: async (matchData) => {
    if (isDevelopment) {
      // Use localStorage in development
      return new Promise((resolve) => {
        setTimeout(() => {
          const matches = getStoredMatches();
          const newMatch = {
            ...matchData,
            _id: `match_${Date.now()}`, // Generate a simple ID
            date: new Date().toISOString(),
          };

          matches.unshift(newMatch); // Add to beginning of array
          saveStoredMatches(matches);

          // If there's an event name, save it to events storage too
          if (matchData.eventName && matchData.eventName.trim() !== '') {
            const events = getStoredEvents();
            if (!events.some((event) => event.name === matchData.eventName)) {
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
    } else {
      // Use real API in production
      try {
        // Save the match (events are created separately when match is started, not when completed)
        const response = await fetch(`${API_URL}/api/matches`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(matchData),
        });

        if (!response.ok) {
          // Get more details about the error
          const errorText = await response.text();
          console.error(`API error (${response.status}):`, errorText);
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Error saving match to API:', error);
        throw error;
      }
    }
  },

  // Delete a match
  deleteMatch: async (id) => {
    if (isDevelopment) {
      // Use localStorage in development
      return new Promise((resolve) => {
        setTimeout(() => {
          const matches = getStoredMatches();
          const updatedMatches = matches.filter((match) => match._id !== id);
          const success = updatedMatches.length < matches.length;

          if (success) {
            saveStoredMatches(updatedMatches);
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Match not found' });
          }
        }, 300);
      });
    } else {
      // Use real API in production
      try {
        const response = await fetch(`${API_URL}/api/matches/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        return { success: true };
      } catch (error) {
        console.error('Error deleting match from API:', error);
        return { success: false, error: error.message };
      }
    }
  },

  // Get unique event names
  getEventNames: async () => {
    if (isDevelopment) {
      // Use localStorage in development
      return new Promise((resolve) => {
        setTimeout(() => {
          // First check the events storage
          const storedEvents = localStorage.getItem('events');
          if (storedEvents) {
            const events = JSON.parse(storedEvents);
            const eventNames = events.map((event) => event.name);
            resolve(eventNames);
            return;
          }

          // Fallback to extracting from matches
          const matches = getStoredMatches();
          const eventNames = [
            ...new Set(
              matches
                .map((match) => match.eventName)
                .filter((name) => name && name.trim() !== '')
            ),
          ];
          resolve(eventNames);
        }, 300);
      });
    } else {
      // Use real API in production
      try {
        const response = await fetch(`${API_URL}/api/events`);
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        const eventNames = data.map((event) => event.name);
        return eventNames;
      } catch (error) {
        console.error('Error fetching events from API:', error);
        throw error;
      }
    }
  },
};

export default api;
