import { Suspense } from "react";
import { BoardClient } from "./-board-client";

export const instant = false;

export default function BoardPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><p className="text-muted">Loading…</p></div>}>
      <BoardClient />
    </Suspense>
  );
}
