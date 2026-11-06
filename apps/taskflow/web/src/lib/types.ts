/**
 * Shared types — mirrors the backend's wire contract (the golden matrix shape).
 * Keep in sync with `py/src/models.py` / `ts/src/schemas.ts`.
 */

export interface Workspace {
  id: string;
  name: string;
  plan_tier: "free" | "starter";
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
}

export interface Issue {
  id: string;
  project_id: string;
  title: string;
  status: "open" | "closed";
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: "owner" | "member";
}

export interface Plan {
  id: string;
  workspace_id: string | null;
  razorpay_order_id: string | null;
  state: "trial" | "active" | "past_due" | "canceled";
  created_at: string;
}

export interface CheckoutResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan: Plan;
}
