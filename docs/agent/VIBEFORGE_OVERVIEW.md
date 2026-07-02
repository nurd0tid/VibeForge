# VibeForge Overview

## What is VibeForge?
VibeForge is an advanced AI-native IDE, workspace, and project management tool. It integrates an intelligent coding agent directly into a modern web-based environment. It bridges the gap between chat, file editing, terminal execution, and database persistence.

## Architecture Overview
VibeForge operates as a Next.js 16 App Router application.
- **Frontend**: Built with React, Tailwind CSS v4, and shadcn/ui. Heavily utilizes `react-resizable-panels` for the IDE layout.
- **Agent Gateway**: The backend orchestration layer that handles prompts, tool execution, context management, and MCP integrations.
- **Persistence Layer**: Connects to a NocoDB REST API to persist tasks, logs, and project metadata.

## Main Modules and Relationships
1. **Chat Assistant**: The central communication hub. Connects to various LLM providers (Anthropic, OpenAI, etc.).
2. **Workspace & Explorer**: Provides Progressive Disclosure of the file system to the agent.
3. **Editor / Diff Viewer**: Intercepts agent file modifications to present structured, inline diffs for user approval.
4. **Agent Activity Monitor**: Tracks agent workflows (Define, Plan, Build, Verify, Review, Ship).
5. **Memory Bank**: The persistent context engine located at `.vibeforge/memory-bank.md`. Required for Bi-Directional Sync.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 (@tailwindcss/postcss)
- **UI Components**: shadcn/ui (based on @base-ui/react)
- **Forms & Validation**: Zod v4 with react-hook-form
- **Database**: NocoDB v1 (REST API)

## AI Agent Interaction
The AI agent interacts with VibeForge via explicit Tools. 
- It cannot blindly write files; it must use `edit_file` to trigger the Diff Viewer.
- It cannot hallucinate database schemas; it must use NocoDB helpers.
- It operates under strict guardrails (Anti-Rationalization, Doubt-Driven Development, and Mandatory Memory Workflows).