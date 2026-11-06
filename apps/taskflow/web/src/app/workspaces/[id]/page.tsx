import { Suspense } from "react";
import { WorkspaceDetailClient } from "./-workspace-detail-client";

export const instant = false;

export default function WorkspaceDetailPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-muted">Loading…</p></div>}>
      <WorkspaceDetailClient />
    </Suspense>
  );
}
