"use client";

import { useEffect, useState } from "react";
import { DatasetTable } from "@/components/DatasetTable";
import { RefreshCountdown } from "@/components/RefreshCountdown";

const REFRESH_INTERVAL_SECONDS = 30;

export default function DatasetsPage() {
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(
    REFRESH_INTERVAL_SECONDS,
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => {
        if (current <= 1) {
          setRefreshSignal((value) => value + 1);
          return REFRESH_INTERVAL_SECONDS;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  function refreshNow() {
    setRefreshSignal((value) => value + 1);
    setSecondsRemaining(REFRESH_INTERVAL_SECONDS);
  }

  return (
    <>
      <h1>📊 Datasets</h1>
      <RefreshCountdown
        secondsRemaining={secondsRemaining}
        onRefresh={refreshNow}
      />
      <DatasetTable refreshSignal={refreshSignal} />
    </>
  );
}
