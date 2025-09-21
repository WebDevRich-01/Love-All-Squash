import useGameStore from "../stores/gameStore";
import PropTypes from "prop-types";

export default function PlayerButton({ playerNum }) {
  const player = useGameStore((state) => state[`player${playerNum}`]);
  const addPoint = useGameStore((state) => state.addPoint);

  return (
    <button
      onClick={() => addPoint(playerNum)}
      className={`
        w-full p-1 h-24 text-lg font-medium rounded-lg
        border-t-4 ${player.color || "border-slate-300"}
        transition-all duration-200 hover:shadow-lg active:scale-95
        ${
          player.serving
            ? "player-serving ring-2 ring-blue-200"
            : "bg-slate-50 hover:bg-slate-100"
        }
      `}
    >
      <div className="flex items-center justify-center gap-2">
        <span>{player.name || `Player ${playerNum}`}</span>
      </div>
    </button>
  );
}

PlayerButton.propTypes = {
  playerNum: PropTypes.number.isRequired,
};
