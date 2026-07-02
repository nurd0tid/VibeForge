# How VibeForge Works

## Overview
VibeForge is a comprehensive AI-native IDE environment and project management system. It integrates an AI assistant seamlessly with file editing, task tracking, database persistence (NocoDB), and structured agent activity. The entire system is built around strict guardrails that mandate verification and discourage blind rationalization.

## Agent Gateway
The gateway orchestrates the agent's interactions with the outside world. It manages the lifecycle of:
1. **Define**: Establish requirements.
2. **Plan**: Draft a plan (and write to memory).
3. **Build**: Execute incremental changes.
4. **Verify**: Ensure tests, types, and lints pass.
5. **Review**: Self-evaluate the work against done criteria.
6. **Ship**: Finalize task.

## Chat Assistant & Modes
The chat interface operates in distinct modes based on task requirements:
- **Architect**: High-level system design and decision-making. No code generation. Focus on structure.
- **Code**: Incremental Implementation of features. Follows Chesterton's Fence: Do not remove code unless you understand why it exists.
- **Ask**: Answering questions based purely on documented evidence or inspected codebase state.
- **Debug**: Doubt-Driven Development mode. CLAIM -> EXTRACT -> DOUBT -> RECONCILE -> STOP.

## Workspace & File Explorer
The file explorer progressively discloses context. 
- **Progressive Disclosure**: Load only what is needed. Don't dump entire directories into context.
- **Bi-Directional Sync**: When editing the project, simultaneously update the memory bank.

## Agent Activity & Task Play
- **Agent Activity**: Logs all tool invocations and step-by-step actions.
- **Task Play**: Agents follow predefined skills (workflows with entry conditions, checkpoints, and exit criteria) to execute tasks reliably.

## Structured Editing & Diff Viewer
- **Structured File Editing**: Edits are done using the `edit_file` tool to generate inline diffs.
- **Diff Viewer**: Displays changes precisely. Incremental Implementation in thin vertical slices is required.

## Todo List & Schedules
- **Todo List (ActiveTodoStrip)**: Tasks are generated into the UI when running a prompt.
- **Daily / Weekly Log**: Track accomplished tasks over time.
- **Schedule System**: Orchestrates routine background checks and synchronization.

## NocoDB Persistence
VibeForge utilizes NocoDB for persistent storage.
- Columns are accessed by Title (e.g., `record['Field Name']`).
- Use `getField` and `getFieldBool` helpers.

## Memory Bank
- **Mandatory Memory Workflow**: Before ANY work, search the memory bank (`.vibeforge/memory-bank.md`). After ANY work, write back to it.

## Skills & MCP Tools
- **Skills**: Step-by-step workflows (Process over Prose). See `SKILLS_INDEX.md`.
- **MCP Tools**: Connected context providers configured in `.vibeforge/mcp.json`. 

## Approval, Error Handling & Verification
- **Auto/Manual Approve**: Critical changes require manual approval.
- **Error Handling**: Stop and ask if uncertain. Bake in Anti-Rationalization.
- **Verification Flow**: Verification is Non-Negotiable. "Seems right" is never sufficient. Tests, typechecks, and linters must pass.

## Context Management
- **Token Tracking**: Token progress bar monitors usage.
- **Auto Compact**: Automatically trigger `/compact` to compress context when usage becomes high.