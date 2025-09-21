import PropTypes from "prop-types";

export default function PointIndicator({ type }) {
  const isGamePoint = type === "game";
  const isMatchPoint = type === "match";

  if (!isGamePoint && !isMatchPoint) return null;

  return (
    <div
      className={`
        inline-flex items-center justify-center
        w-8 h-8 rounded-full text-xs font-bold text-white
        ml-2 shadow-lg animate-pulse
        ${
          isMatchPoint
            ? "bg-green-500 border-2 border-green-300"
            : "bg-orange-500 border-2 border-orange-300"
        }
      `}
    >
      {isMatchPoint ? "MP" : "GP"}
    </div>
  );
}

PointIndicator.propTypes = {
  type: PropTypes.oneOf(["game", "match"]).isRequired,
};
