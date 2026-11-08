import { useCallback, useEffect, useState } from "react";

import type { ScanRecord } from "@/lib/phishguard.types";

const STORAGE_KEY = "phishguard.scan-history.v1";

function readHistory(): ScanRecord[] {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ScanRecord =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        (item.kind === "url" || item.kind === "email") &&
        typeof item.input === "string" &&
        typeof item.createdAt === "string" &&
        ["SAFE", "SUSPICIOUS", "PHISHING"].includes(item.prediction),
    );
  } catch {
    return [];
  }
}

export function useScanHistory() {
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecords(readHistory());
    setReady(true);
    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setRecords(readHistory());
    };
    window.addEventListener("storage", syncFromOtherTab);
    return () => window.removeEventListener("storage", syncFromOtherTab);
  }, []);

  const addRecord = useCallback(
    (record: ScanRecord) => {
      const updated = [record, ...records].slice(0, 500);
      setRecords(updated);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // The current page still shows the new scan if browser storage is unavailable.
      }
    },
    [records],
  );

  const clearRecords = useCallback(() => {
    setRecords([]);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Keep the visible history cleared even if browser storage is unavailable.
    }
  }, []);

  return { records, ready, addRecord, clearRecords };
}

export function downloadScanReport(record: ScanRecord) {
  const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `phishguard-${record.kind}-${record.id}.json`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}