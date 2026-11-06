import { Suspense } from "react";
import { SettingsClient } from "./-settings-client";

export const instant = false;

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-muted">Loading…</p></div>}>
      <SettingsClient />
    </Suspense>
  );
}
