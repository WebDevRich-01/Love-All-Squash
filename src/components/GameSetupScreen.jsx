import { useState, useEffect } from "react";
import useGameStore from "../stores/gameStore";
import PropTypes from "prop-types";
import api from "../utils/api";
import ColorDropdown from "./ColorDropdown";

const saveEventToLocalStorage = (eventName) => {
  if (!eventName || eventName.trim() === "") return;

  try {
    // Debug environment variables
    console.log("Environment variables in saveEventToLocalStorage:", {
      USE_LOCAL_STORAGE: import.meta.env.VITE_USE_LOCAL_STORAGE,
      API_URL: import.meta.env.VITE_API_URL,
    });

    // Check if we're in development mode using environment variable
    const envValue = import.meta.env.VITE_USE_LOCAL_STORAGE;
    const isDevelopment = envValue === "true";

    console.log("isDevelopment calculation:", {
      envValue,
      isDevelopment,
      typeOfEnvValue: typeof envValue,
    });

    if (isDevelopment) {
      // Get existing events
      const storedEvents = localStorage.getItem("events");
      let events = storedEvents ? JSON.parse(storedEvents) : [];

      // Check if event already exists
      if (!events.some((event) => event.name === eventName)) {
        // Add new event
        events.push({
          name: eventName,
          date: new Date().toISOString(),
          id: Date.now().toString(), // Simple unique ID
        });

        // Save back to local storage
        localStorage.setItem("events", JSON.stringify(events));
        console.log("Saved event to local storage:", eventName);
      }
    } else {
      // In production, save to API
      // Use hardcoded fallback if environment variable is missing
      const API_URL =
        import.meta.env.VITE_API_URL ||
        "https://squash-marker-backend.onrender.com";
      console.log(`Attempting to save event to API at: ${API_URL}/api/events`);

      fetch(`${API_URL}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: eventName,
          date: new Date().toISOString(),
        }),
      })
        .then((response) => {
          console.log("API response status:", response.status);
          if (!response.ok) {
            throw new Error("Failed to save event to API");
          }
          return response.json();
        })
        .then((data) => {
          console.log("Saved event to API:", data);
        })
        .catch((error) => {
          console.error("Error saving event to API:", error);
        });
    }
  } catch (error) {
    console.error("Error saving event:", error);
  }
};

export default function GameSetupScreen({
  initialSettings,
  onStartMatch,
  onReturnToMatch,
  isEditing,
  onBack,
}) {
  const [settings, setSettings] = useState(
    initialSettings || {
      player1Name: "",
      player2Name: "",
      player1Color: "border-red-500",
      player2Color: "border-blue-500",
      pointsToWin: 15,
      clearPoints: 2,
      bestOf: 5,
      player1Serving: true,
      eventName: "",
    }
  );

  useEffect(() => {
    if (
      initialSettings?.eventName &&
      settings.eventName !== initialSettings.eventName
    ) {
      setSettings((prev) => ({
        ...prev,
        eventName: initialSettings.eventName,
      }));
    }
  }, [initialSettings, settings.eventName]);

  const [eventNames, setEventNames] = useState([]);
  const [showEventSuggestions, setShowEventSuggestions] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState([]);

  const initializeGame = useGameStore((state) => state.initializeGame);

  useEffect(() => {
    const fetchEventNames = async () => {
      try {
        const names = await api.getEventNames();
        setEventNames(names);
      } catch (error) {
        console.error("Error fetching event names:", error);
      }
    };

    fetchEventNames();
  }, []);

  useEffect(() => {
    if (settings.eventName) {
      const filtered = eventNames.filter((name) =>
        name.toLowerCase().includes(settings.eventName.toLowerCase())
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents(eventNames);
    }
  }, [settings.eventName, eventNames]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (settings.eventName && settings.eventName.trim() !== "") {
      saveEventToLocalStorage(settings.eventName);
    }

    if (isEditing && onReturnToMatch) {
      useGameStore.getState().updateGameSettings(settings);
      onReturnToMatch(settings);
    } else {
      initializeGame({
        ...settings,
        eventName: settings.eventName || "",
      });
      onStartMatch(settings);
    }
  };

  const handleEventNameChange = (e) => {
    setSettings({ ...settings, eventName: e.target.value });
    setShowEventSuggestions(true);

    // Optionally save immediately on change
    // If you want to save only when they select or submit, remove this line
    // saveEventToLocalStorage(e.target.value);
  };

  const selectEvent = (eventName) => {
    setSettings({ ...settings, eventName });
    setShowEventSuggestions(false);

    // No need to save here as the event already exists in the suggestions
  };

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-auto">
      {/* Header */}
      <div className="card flex justify-between items-center p-4 m-2 shrink-0">
        <button onClick={onBack} className="btn-secondary !py-2 !px-3 text-xl">
          &larr;
        </button>
        <h2 className="text-2xl font-bold text-center flex-1">
          {isEditing ? "Edit Game Settings" : "Game Setup"}
        </h2>
      </div>

      {/* Match options */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="w-full mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card flex flex-col min-h-0 relative bg-white p-4 m-2">
              <label className="mb-1 font-medium">Event Name</label>
              <input
                type="text"
                value={settings.eventName}
                onChange={handleEventNameChange}
                onFocus={() => setShowEventSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowEventSuggestions(false), 200)
                }
                className="w-full p-2 border rounded border-slate-400"
                placeholder="Enter event name"
              />
              {showEventSuggestions && filteredEvents.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredEvents.map((name, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => selectEvent(name)}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card flex flex-col min-h-0 relative bg-white p-4 m-2">
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 font-medium">
                    Player 1 Name
                  </label>
                  <input
                    type="text"
                    value={settings.player1Name}
                    onChange={(e) =>
                      setSettings({ ...settings, player1Name: e.target.value })
                    }
                    className="w-full p-2 border rounded border-slate-400"
                    placeholder="Enter name"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-2">
                    <ColorDropdown
                      selectedColor={settings.player1Color}
                      onColorChange={(color) =>
                        setSettings({
                          ...settings,
                          player1Color: color,
                        })
                      }
                    />
                  </div>

                  <div className="flex-1">
                    <label className="flex items-center p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors duration-200 border-slate-400">
                      <div className="relative mr-3">
                        <input
                          type="checkbox"
                          checked={settings.player1Serving}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              player1Serving: e.target.checked,
                              player2Serving: !e.target.checked,
                            })
                          }
                          className="sr-only border-slate-400"
                        />
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                            settings.player1Serving
                              ? "bg-blue-500 border-blue-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {settings.player1Serving && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">Serving</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="card flex flex-col min-h-0 relative bg-white p-4 m-2">
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 font-medium">
                    Player 2 Name
                  </label>
                  <input
                    type="text"
                    value={settings.player2Name}
                    onChange={(e) =>
                      setSettings({ ...settings, player2Name: e.target.value })
                    }
                    className="w-full p-2 border rounded border-slate-400"
                    placeholder="Enter name"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-2">
                    <ColorDropdown
                      selectedColor={settings.player2Color}
                      onColorChange={(color) =>
                        setSettings({
                          ...settings,
                          player2Color: color,
                        })
                      }
                    />
                  </div>

                  <div className="flex-1">
                    <label className="flex items-center p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors duration-200 border-slate-400">
                      <div className="relative mr-3">
                        <input
                          type="checkbox"
                          checked={!settings.player1Serving}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              player1Serving: !e.target.checked,
                              player2Serving: e.target.checked,
                            })
                          }
                          className="sr-only border-slate-400"
                        />
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                            !settings.player1Serving
                              ? "bg-blue-500 border-blue-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {!settings.player1Serving && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">Serving</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="card flex flex-col min-h-0 relative bg-white p-4 m-2">
              <h3 className="font-semibold text-lg mb-3 text-center border-b border-slate-400 pb-2">
                Match Settings
              </h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-2">
                    <label className="block mb-1 font-medium">
                      Points to Win
                    </label>
                    <select
                      value={settings.pointsToWin}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          pointsToWin: Number(e.target.value),
                        })
                      }
                      className="w-full p-2 border rounded border-slate-400"
                      style={{ zIndex: 30 }}
                    >
                      <option value={11}>11 Points</option>
                      <option value={15}>15 Points</option>
                    </select>
                  </div>

                  <div className="flex-1 flex items-end">
                    <label className="flex items-center p-2 bg-white rounded border cursor-pointer hover:bg-gray-50 transition-colors duration-200 w-full border-slate-400">
                      <div className="relative mr-3">
                        <input
                          type="checkbox"
                          checked={settings.clearPoints === 2}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              clearPoints: e.target.checked ? 2 : 1,
                            })
                          }
                          className="sr-only border-slate-400"
                        />
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                            settings.clearPoints === 2
                              ? "bg-blue-500 border-blue-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {settings.clearPoints === 2 && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="font-medium">2 Clear</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Match Format</label>
                  <select
                    value={settings.bestOf}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        bestOf: Number(e.target.value),
                      })
                    }
                    className="w-full p-2 border rounded border-slate-400"
                    style={{ zIndex: 30 }}
                  >
                    <option value={3}>Best of 3</option>
                    <option value={5}>Best of 5</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex">
              <button
                type="submit"
                className="w-full p-3 m-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isEditing ? "Save Changes" : "Start Match"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

GameSetupScreen.propTypes = {
  initialSettings: PropTypes.shape({
    player1Name: PropTypes.string,
    player2Name: PropTypes.string,
    player1Color: PropTypes.string,
    player2Color: PropTypes.string,
    pointsToWin: PropTypes.number,
    clearPoints: PropTypes.number,
    bestOf: PropTypes.number,
    player1Serving: PropTypes.bool,
    eventName: PropTypes.string,
  }),
  onStartMatch: PropTypes.func.isRequired,
  onReturnToMatch: PropTypes.func,
  isEditing: PropTypes.bool.isRequired,
  onBack: PropTypes.func.isRequired,
};

GameSetupScreen.defaultProps = {
  initialSettings: null,
  onReturnToMatch: null,
};
