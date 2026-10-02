export interface Workspace {
    id: string;
    name: string;
    created_at: Date | null;
}

export interface CreateWorkspace {
    name: string;
}

export interface UpdateWorkspace {
    id: string;
    name?: string;
}

export interface Project {
    id: string;
    name: string;
    workspace_id: string;
    created_at: Date | null;
}

export interface CreateProject {
    name: string;
    workspace_id: string;
}

export interface UpdateProject {
    id: string;
    name?: string;
    workspace_id?: string;
}

export interface Issue {
    id: string;
    project_id: string;
    title: string;
    status: "open" | "closed";
    created_at: Date | null;
}

export interface CreateIssue {
    project_id: string;
    title: string;
    status?: "open" | "closed"
}


export interface UpdateIssue {
    id: string;
    project_id?: string;
    title?: string;
    status?: "open" | "closed"
}

export interface WorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: "owner" | "member"
    created_at: Date | null;
}

// The role ladder (day-10): a numeric rank so "allows at least min_role" is a *compare*, not equality.
// Typed Record<string, number> on purpose — so an off-ladder role (a stale row that survived the
// schema CHECK) checks `in ROLE_RANK` to false and falls out to the safe "not a member" shape.
// Mirrors py `src/types.py::ROLE_RANK`; the authorizer reads rank from *data*, not branches.
export const ROLE_RANK: Record<string, number> = { member: 1, owner: 2 }