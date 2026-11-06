import { redirect } from "next/navigation";

export const instant = false;

/**
 * Root page — immediately redirect to the dashboard.
 * The dashboard (/workspaces) is the "first run" surface:
 * it handles the logged-out state (login CTA) and the
 * logged-in state (workspace grid) in one place.
 */
export default function Home() {
  redirect("/workspaces");
}
