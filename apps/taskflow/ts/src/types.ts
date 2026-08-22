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
