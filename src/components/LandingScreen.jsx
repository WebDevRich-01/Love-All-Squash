import PropTypes from "prop-types";
import { usePWAInstall } from "../hooks/usePWAInstall";
import IOSInstallInstructions from "./IOSInstallInstructions";

export default function LandingScreen({
  onNewMatch,
  onFindMatch,
  hasActiveMatch,
}) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    showIOSInstructions,
    installApp,
    setShowIOSInstructions,
  } = usePWAInstall();

  const handleInstallClick = async () => {
    const success = await installApp();
    if (success) {
      console.log("App installed successfully!");
    }
  };
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-8">Squash Marker</h1>

        <div className="space-y-4">
          <button
            onClick={onNewMatch}
            className="w-full py-4 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium text-lg shadow-sm transition-colors"
          >
            {hasActiveMatch ? "Return to Match" : "Start New Match"}
          </button>

          <button
            onClick={onFindMatch}
            className="w-full py-4 px-6 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-lg shadow-sm transition-colors"
          >
            Find Match
          </button>

          {/* PWA Install Button */}
          {isInstallable && !isInstalled && (
            <button
              onClick={handleInstallClick}
              className="w-full py-3 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-base shadow-sm transition-colors flex items-center justify-center gap-2 mt-6 border-t border-gray-200 pt-6"
            >
              {isIOS ? (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  How to Install
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Install App
                </>
              )}
            </button>
          )}

          {/* Installed indicator */}
          {isInstalled && (
            <div className="w-full py-3 px-6 bg-green-100 text-green-800 rounded-lg font-medium text-base flex items-center justify-center gap-2 mt-6 border-t border-gray-200 pt-6">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              App Installed
            </div>
          )}
        </div>
      </div>

      {/* iOS Install Instructions Modal */}
      <IOSInstallInstructions
        isVisible={showIOSInstructions}
        onClose={() => setShowIOSInstructions(false)}
      />
    </div>
  );
}

LandingScreen.propTypes = {
  onNewMatch: PropTypes.func.isRequired,
  onFindMatch: PropTypes.func.isRequired,
  hasActiveMatch: PropTypes.bool.isRequired,
};
