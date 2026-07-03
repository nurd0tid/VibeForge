# Contributing to VibeForge

Thank you for your interest in contributing to VibeForge! We welcome contributions from the community to help make VibeForge the best open-source AI Coding Workspace.

## Development Principles

- **IDE-Like Experience**: VibeForge is not a standard admin dashboard. Maintain a VS Code-like user experience with proper panels, sidebars, and keyboard shortcuts.
- **Robust UI States**: All core features must handle loading, empty, error, skeleton, toast, and confirmation states appropriately.
- **Strict Typing**: Use TypeScript strictly. Avoid `any` wherever possible.
- **Stable Dependencies**: Rely on the latest stable versions of our core packages (Next.js 16, React 19, Tailwind CSS v4, shadcn/ui).
- **Security First**: Never commit secrets, API keys, or sensitive environment variables.
- **Documentation**: Update relevant documentation in `docs/` when changing architecture, APIs, database schemas, workflows, or UI patterns.

## Local Setup Environment

To run VibeForge locally:

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local

# Fill in your NocoDB credentials in .env.local
# Run the setup script if you need to initialize NocoDB tables
node scripts/setup-nocodb.js

# Start the development server
pnpm dev
```

## Pull Request Checklist

Before submitting a Pull Request, please ensure the following:

- [ ] `pnpm build` completes successfully.
- [ ] `pnpm run typecheck` passes without errors.
- [ ] `pnpm run lint` passes without errors.
- [ ] Acceptance criteria for the specific issue are met.
- [ ] All necessary UI states (loading, error, empty) are implemented.
- [ ] No secrets or sensitive data are leaked in the code.
- [ ] Documentation is updated if applicable.
- [ ] Logs and context files (`SESSION.md`, `NEXT_ACTION.md`) are updated if the task was completed by an AI agent.

## AI Agent Collaboration

If you are using an AI Agent (like opencode, Devin, or Cline) to contribute:
1. Ensure the agent reads `AGENTS.md` and `.clinerules`.
2. Do not let the agent mark a task as done if there are blockers or failing checks.
3. The agent must update the memory bank and NocoDB logs as per our workflow.
