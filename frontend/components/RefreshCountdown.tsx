"use client";

type RefreshCountdownProps = {
  secondsRemaining: number;
  onRefresh: () => void;
};

export function RefreshCountdown({
  secondsRemaining,
  onRefresh,
}: RefreshCountdownProps) {
  return (
    <div className="refresh-bar">
      <p className="refresh-text">
        Data refreshes every 30 seconds. Refreshing in {secondsRemaining}s.
      </p>
      <button
        type="button"
        className="refresh-button"
        onClick={onRefresh}
        aria-label="Refresh data now"
        title="Refresh data now"
      >
        ↻
      </button>
    </div>
  );
}
