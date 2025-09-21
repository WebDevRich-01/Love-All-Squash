import { useState, useEffect } from "react";
import api from "../utils/api";
import PropTypes from "prop-types";

export default function MatchHistoryScreen({ onBack }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // "all", "today", "week", "month"
  const [eventFilter, setEventFilter] = useState("all"); // Add event filter
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [eventNames, setEventNames] = useState([]); // Store unique event names

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await api.getMatches();
      console.log("Fetched matches:", response); // Debug log
      setMatches(response);

      // Extract unique event names
      const uniqueEvents = [
        ...new Set(
          response
            .map((match) => match.eventName)
            .filter((name) => name && name.trim() !== "")
        ),
      ];
      console.log("Unique events:", uniqueEvents); // Debug log
      setEventNames(uniqueEvents);

      setError(null);
    } catch (err) {
      console.error("Error fetching matches:", err);
      setError("Failed to load matches. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to fetch events from the API or local storage
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Check if we're in development mode using environment variable
        const envValue = import.meta.env.VITE_USE_LOCAL_STORAGE;
        const isDevelopment = envValue === "true";

        if (isDevelopment) {
          // Use local storage in development
          const storedEvents = localStorage.getItem("events");
          if (storedEvents) {
            const parsedEvents = JSON.parse(storedEvents);
            const uniqueEvents = [
              ...new Set(parsedEvents.map((event) => event.name)),
            ];
            setEventNames(uniqueEvents);
          } else {
            setEventNames([]);
          }
        } else {
          // Use API in production
          const API_URL =
            import.meta.env.VITE_API_URL ||
            "https://squash-marker-backend.onrender.com";
          const response = await fetch(`${API_URL}/api/events`);
          if (!response.ok) {
            throw new Error("Failed to fetch events");
          }
          const data = await response.json();
          const uniqueEvents = [...new Set(data.map((event) => event.name))];
          setEventNames(uniqueEvents);
        }
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    fetchEvents();
  }, []);

  // Handle delete button click
  const handleDeleteClick = (e, match) => {
    e.stopPropagation(); // Prevent expanding the match details
    setMatchToDelete(match);
    setDeleteModalOpen(true);
  };

  // Handle actual deletion
  const handleDeleteConfirm = async () => {
    if (!matchToDelete) return;

    try {
      setIsDeleting(true);
      const result = await api.deleteMatch(matchToDelete._id);

      if (result.success) {
        // Remove from local state
        setMatches(matches.filter((m) => m._id !== matchToDelete._id));
        setDeleteModalOpen(false);
        setMatchToDelete(null);
      } else {
        setError("Failed to delete match. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting match:", err);
      setError("Failed to delete match. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter matches by date
  const getFilteredByDate = (matches) => {
    if (dateFilter === "all") return matches;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === "today") {
      return matches.filter((match) => new Date(match.date) >= today);
    }

    if (dateFilter === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return matches.filter((match) => new Date(match.date) >= weekAgo);
    }

    if (dateFilter === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return matches.filter((match) => new Date(match.date) >= monthAgo);
    }

    return matches;
  };

  // Filter matches by search term
  const getFilteredBySearch = (matches) => {
    if (!searchTerm.trim()) return matches;

    return matches.filter(
      (match) =>
        match.player1Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        match.player2Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (match.eventName &&
          match.eventName.toLowerCase().includes(searchTerm.toLowerCase())) // Also search in event name
    );
  };

  // Filter matches by event
  const getFilteredByEvent = (matches) => {
    if (eventFilter === "all") return matches;

    return matches.filter((match) => match.eventName === eventFilter);
  };

  // Apply all filters
  const filteredMatches = getFilteredByEvent(
    getFilteredBySearch(getFilteredByDate(matches))
  );

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  // Get winner of a match
  const getWinner = (match) => {
    const player1Wins = match.gameScores.filter(
      (game) => game.player1 > game.player2
    ).length;
    const player2Wins = match.gameScores.filter(
      (game) => game.player2 > game.player1
    ).length;

    if (player1Wins > player2Wins) {
      return match.player1Name;
    } else if (player2Wins > player1Wins) {
      return match.player2Name;
    } else {
      return "Tie";
    }
  };

  // Get score display (e.g., "3-1")
  const getScoreDisplay = (match) => {
    const player1Wins = match.gameScores.filter(
      (game) => game.player1 > game.player2
    ).length;
    const player2Wins = match.gameScores.filter(
      (game) => game.player2 > game.player1
    ).length;

    return `${player1Wins}-${player2Wins}`;
  };

  // Toggle expanded state for a match
  const toggleExpanded = (matchId) => {
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
    } else {
      setExpandedMatchId(matchId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <div className="p-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="btn-secondary !py-2 !px-3 text-xl"
          >
            &larr;
          </button>
          <h1 className="text-2xl font-bold">Match History</h1>

          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            New Match
          </button>
        </div>

        {/* Search and filter controls */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Search players or events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded"
          />

          {/* Event filter dropdown - always show it */}
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap font-medium">Event:</label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="p-2 border rounded flex-grow"
            >
              <option value="all">All Events</option>
              {eventNames.map((name, index) => (
                <option key={index} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setDateFilter("all")}
              className={`px-3 py-1 rounded whitespace-nowrap ${
                dateFilter === "all" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter("today")}
              className={`px-3 py-1 rounded whitespace-nowrap ${
                dateFilter === "today"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter("week")}
              className={`px-3 py-1 rounded whitespace-nowrap ${
                dateFilter === "week" ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter("month")}
              className={`px-3 py-1 rounded whitespace-nowrap ${
                dateFilter === "month"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-xl text-gray-500">Loading matches...</div>
          </div>
        ) : error ? (
          <div className="text-center p-8">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Retry
            </button>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            {searchTerm || dateFilter !== "all"
              ? "No matches found with the current filters."
              : "No matches recorded yet."}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => (
              <div
                key={match._id}
                className="bg-white p-4 rounded-lg shadow-sm relative"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => handleDeleteClick(e, match)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500"
                  aria-label="Delete match"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">
                    {formatDate(match.date)}
                  </span>
                  <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded mr-8">
                    {getScoreDisplay(match)}
                  </span>
                </div>

                {/* Event name display - make it more prominent */}
                {match.eventName && (
                  <div className="mb-3">
                    <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
                      {match.eventName}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{match.player1Name}</div>
                    <div className="text-sm text-gray-500">
                      {getWinner(match) === match.player1Name && "Winner"}
                    </div>
                  </div>

                  <div className="text-lg font-bold mx-4">vs</div>

                  <div className="flex-1 text-right">
                    <div className="font-medium">{match.player2Name}</div>
                    <div className="text-sm text-gray-500">
                      {getWinner(match) === match.player2Name && "Winner"}
                    </div>
                  </div>
                </div>

                {/* Game scores section */}
                <div className="mt-3 pt-2 border-t">
                  <div
                    className="flex justify-between items-center cursor-pointer"
                    onClick={() => toggleExpanded(match._id)}
                  >
                    <div className="text-sm text-gray-600">
                      {match.matchSettings.pointsToWin} points
                      {match.matchSettings.clearPoints === 2 ? ", 2 clear" : ""}
                      {" • "}
                      Best of {match.matchSettings.bestOf}
                    </div>
                    <button className="text-blue-500 text-sm">
                      {expandedMatchId === match._id
                        ? "Hide scores"
                        : "Show scores"}
                    </button>
                  </div>

                  {/* Expanded game scores */}
                  {expandedMatchId === match._id && (
                    <div className="mt-2 space-y-2 bg-gray-50 p-3 rounded">
                      {match.gameScores.map((score, index) => (
                        <div
                          key={index}
                          className="flex justify-between text-sm"
                        >
                          <div className="font-medium">Game {index + 1}</div>
                          <div>
                            <span
                              className={
                                score.player1 > score.player2 ? "font-bold" : ""
                              }
                            >
                              {score.player1}
                            </span>
                            {" - "}
                            <span
                              className={
                                score.player2 > score.player1 ? "font-bold" : ""
                              }
                            >
                              {score.player2}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteModalOpen && matchToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold mb-4">Delete Match?</h2>
            <p className="mb-6">
              Are you sure you want to delete the match between{" "}
              <span className="font-medium">{matchToDelete.player1Name}</span>{" "}
              and{" "}
              <span className="font-medium">{matchToDelete.player2Name}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-100"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

MatchHistoryScreen.propTypes = {
  onBack: PropTypes.func.isRequired,
};
