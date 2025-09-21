import PropTypes from "prop-types";

export default function MatchHistoryTable({ player1, player2, gameScores }) {
  if (!gameScores || gameScores.length === 0) {
    return (
      <div className="text-center text-slate-600 py-4">
        No games completed yet.
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-slate-100 grid grid-cols-3 text-sm font-semibold text-slate-700">
        <div className="p-2 border-r border-slate-200"></div>
        <div className="p-2 text-center border-r border-slate-200">
          {player1.name}
        </div>
        <div className="p-2 text-center">{player2.name}</div>
      </div>

      {/* Game Rows */}
      {gameScores.map((game, index) => {
        const player1Won = game.player1 > game.player2;
        return (
          <div
            key={index}
            className="grid grid-cols-3 border-t border-slate-200"
          >
            <div className="p-2 font-medium text-slate-700 border-r border-slate-200">
              Game {index + 1}
            </div>
            <div
              className={`p-2 text-center border-r border-slate-200 font-bold ${
                player1Won ? "text-green-600 bg-green-50" : "text-slate-600"
              }`}
            >
              {game.player1}
            </div>
            <div
              className={`p-2 text-center font-bold ${
                !player1Won ? "text-green-600 bg-green-50" : "text-slate-600"
              }`}
            >
              {game.player2}
            </div>
          </div>
        );
      })}

      {/* Match Score Row */}
      <div className="grid grid-cols-3 border-t-2 border-slate-300 bg-blue-50">
        <div className="p-2 font-semibold text-slate-700 border-r border-slate-200">
          Match
        </div>
        <div className="p-2 text-center border-r border-slate-200 font-bold text-blue-600">
          {gameScores.filter((g) => g.player1 > g.player2).length}
        </div>
        <div className="p-2 text-center font-bold text-blue-600">
          {gameScores.filter((g) => g.player2 > g.player1).length}
        </div>
      </div>
    </div>
  );
}

MatchHistoryTable.propTypes = {
  player1: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  player2: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
  gameScores: PropTypes.arrayOf(
    PropTypes.shape({
      player1: PropTypes.number.isRequired,
      player2: PropTypes.number.isRequired,
    })
  ).isRequired,
};
