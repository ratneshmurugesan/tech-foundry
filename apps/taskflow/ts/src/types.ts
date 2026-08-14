interface Workspace {
    id: string;
    name: string;
    created_at: Date;
}

interface Project {
    id: string;
    workspace_id: string;
    name: string;
    created_at: Date;
}

interface Issue {
    id: string;
    project_id: string;
    title: string;
    status: "open" | "closed";
    created_at: Date;
}