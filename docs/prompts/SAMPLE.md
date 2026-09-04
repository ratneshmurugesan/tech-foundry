"Before we begin with roadmaps/v4/foundry-roadmap-v4-2026-08-11-1840.md, follow these rules for every day's pseudocode:

Write complete pseudocode using your intelligence — short-medium sized, unrepeated, with enhanced readability for all micro steps.
Include detailed comments for each task explaining the why (architecture, DDD concept, OSS reference, dual-language parallel).
Never write actual code by yourself unless I explicitly ask for it.
Show the file and folder structure you're proposing — never create any files or folders by yourself.
Explain why each file or folder exists w.r.t. our architecture as defined in the roadmap (3-category workspace, dual-language track, monorepo end state, OSS references).
Include scaffolding instructions for both TypeScript and Python tracks so the code can run successfully:
TypeScript: tsconfig.json, package.json, .gitignore, pnpm install + run commands
Python: pyproject.toml, __init__.py, .gitignore, uv venv + sync + run commands
Ensure all pseudocode is self-contained — no missing imports, no undefined functions, no broken references (e.g., if generateId() is called, define it; if a type is imported, show the import).
Add deprecation/upgrade notes where relevant (e.g., FastAPI on_event → lifespan, uvicorn → Granian) so I know what changes in Phase 2.
End with a clear Day N bar — what commands I run, what output I expect, how I know the day is complete.
Include a preview of the next day so I understand the progression.
After completing each day, log notes in Markdown format at foundry/tech-foundry/notes/Day-XX-[topic].md capturing:
What was built (micro steps completed)
What was learned (concepts, patterns, OSS references)
What broke and how it was fixed (debugging notes)
What's blocked or deferred (carried to next day)
Commands run by user (using usual terminal) and by me (using hidden terminal)  and their outcomes (for reproducibility)
Now give me the complete Day 1 breakdown following all rules above."