import PropTypes from "prop-types";

export default function LetDecisionModal({ onDecision, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card p-6 w-80 max-w-full mx-4">
        <h2 className="text-xl font-bold mb-6 text-center text-slate-800">
          Let Decision
        </h2>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onDecision("let")}
            className="w-full p-4 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg font-medium transition-all duration-200 hover:shadow-md active:scale-95"
          >
            🔄 Let
          </button>

          <button
            onClick={() => onDecision("stroke")}
            className="w-full p-4 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg font-medium transition-all duration-200 hover:shadow-md active:scale-95"
          >
            ✓ Stroke
          </button>

          <button
            onClick={() => onDecision("nolet")}
            className="w-full p-4 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg font-medium transition-all duration-200 hover:shadow-md active:scale-95"
          >
            ✗ No Let
          </button>
        </div>

        <button onClick={onCancel} className="btn-secondary w-full mt-6">
          Cancel
        </button>
      </div>
    </div>
  );
}

LetDecisionModal.propTypes = {
  onDecision: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
