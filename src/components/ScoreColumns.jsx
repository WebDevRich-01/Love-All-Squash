import useGameStore from "../stores/gameStore";
import { useEffect, useRef } from "react";

export default function ScoreColumns() {
  const scoreHistory = useGameStore((state) => state.scoreHistory);
  const player1Score = useGameStore((state) => state.player1.score);
  const player2Score = useGameStore((state) => state.player2.score);
  const scrollRef = useRef(null);

  // Auto-scroll to bottom when new scores are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [scoreHistory]);

  // Only show history if any points have been scored
  if (player1Score === 0 && player2Score === 0) {
    return (
      <div className="flex-1 flex min-h-0 relative bg-white m-2 rounded-xl border border-slate-200">
        <div className="absolute top-0 bottom-0 left-[calc(50%-0.5px)] w-[1px] bg-slate-300" />
      </div>
    );
  }

  // Filter out the initial score entry
  const filteredHistory = scoreHistory.filter(
    (score) => score.type !== "initial"
  );

  return (
    <div className="flex-1 flex min-h-0 relative bg-white m-2 rounded-xl border border-slate-200">
      {/* Center dividing line */}
      <div className="absolute top-0 bottom-0 left-[calc(50%-0.5px)] w-[1px] bg-slate-300" />

      {/* Score rows container */}
      <div
        ref={scrollRef}
        className="absolute inset-0 flex flex-col overflow-y-auto"
      >
        <div className="flex-1" /> {/* Spacer to push content to bottom */}
        {filteredHistory.map((score) => (
          <div
            key={score.timestamp}
            className="w-full h-8 flex relative shrink-0"
          >
            {/* Handout line - show under the losing player's score */}
            {score.isHandout && (
              <div className="absolute -bottom-1 mb-2 left-1/4 right-1/4 h-[1px] bg-slate-600" />
            )}

            {/* Left side (Player 1) */}
            <div className="flex-1 flex justify-end pr-3">
              {score.player === "player1" && (
                <span className="text-base font-medium text-slate-700">
                  {score.score}
                  {score.serveSide}
                </span>
              )}
            </div>

            {/* Right side (Player 2) */}
            <div className="flex-1 flex pl-3">
              {score.player === "player2" && (
                <span className="text-base font-medium text-slate-700">
                  {score.score}
                  {score.serveSide}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
