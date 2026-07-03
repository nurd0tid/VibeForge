# MCP Rules

This document outlines the Model Context Protocol (MCP) servers and tools available to AI agents in VibeForge, and the strict rules governing their use.

---

## 1. Context7 (Documentation Server)

The Context7 MCP server provides access to the latest, most accurate documentation for libraries, frameworks, SDKs, and tools.

### Mandatory Usage

The agent **must** use Context7 before writing or refactoring code that uses any of the following technologies:

- **Next.js** (App Router, API routes, Server Actions, Middleware)
- **React** (Hooks, Context, Server Components)
- **Tailwind CSS v4** (Utility classes, plugins, configuration)
- **shadcn/ui** (Component APIs, specifically noting the `@base-ui/react` dependency in v4)
- **Radix UI** (For any remaining legacy components)
- **TanStack Query** (Query client configuration, hooks, mutations, cache invalidation)
- **React Hook Form** (Form setup, submission, error handling)
- **Zod v4** (Schema definition, validation, refinement)
- **Monaco Editor** (`@monaco-editor/react` setup, configuration, themes, language support)
- **xterm.js** (Terminal instantiation, addon usage)
- **SweetAlert2** (Dialog configuration, promises)
- **Sonner** (Toast configuration)
- **NocoDB** (REST API endpoints, query parameters, authentication, webhook setup)

### The Golden Rule of Context7

**If Context7 returns information that contradicts the agent's pre-trained knowledge or memory, Context7 always wins.** The agent must prioritize the retrieved, up-to-date documentation over its own assumptions.

### When NOT to use Context7

- General programming concepts (e.g., "what is a closure?")
- Debugging business logic specific to VibeForge
- Refactoring internal VibeForge components (unless relying on new library features)
- Generating scripts from scratch without a specific library target

---

## 2. Sequential Thinking

The Sequential Thinking MCP tool enables structured, step-by-step reasoning for complex problems.

### Mandatory Usage

The agent **must** use Sequential Thinking for tasks in the following categories:

- **Architecture**: Designing new modules, defining data models, choosing design patterns, integrating new services.
- **Rebuilds**: Planning the steps to rebuild a generic/broken page into a VibeForge-compliant layout.
- **Planning**: Breaking down a large feature request into a structured implementation plan.
- **Scheduling**: Distributing planned tasks across a timeline or sprints.
- **Database Schema**: Modifying NocoDB tables, managing relationships, handling migrations.
- **UI/UX Design**: Planning complex layouts (e.g., the Web IDE workspace, resizable panels, deeply nested drawers).
- **AI Provider Integration**: Implementing new provider adapters, handling fallbacks, managing context limits.
- **Security**: Evaluating authorization, secret handling, secure data storage, API route protection.
- **Deployment**: Creating Dockerfiles, configuring Traefik, setting up CI/CD pipelines.

### Usage Guidelines

- **Start Broad, Get Specific**: Begin by defining the overall goal, then break it down into smaller, actionable steps.
- **Document Assumptions**: Explicitly state any assumptions made during the thought process.
- **Consider Alternatives**: Briefly evaluate alternative approaches before settling on a decision.
- **Define Success**: Clearly state what constitutes a successful outcome for the task.
- **Review and Refine**: Re-read the thought process and refine it before executing the plan.

---

## 3. General MCP Principles

- **Tool Awareness**: The agent must always be aware of the available MCP tools and choose the most appropriate one for the task.
- **Minimize Tool Calls**: While using tools is encouraged, avoid excessive or redundant calls. Batch calls when possible.
- **Handle Errors Gracefully**: If an MCP tool call fails, log the error, attempt a fallback strategy (if applicable), and notify the user if necessary.
- **Transparency**: When using an MCP tool that significantly impacts the implementation plan, briefly explain the findings to the user (e.g., "According to the latest Next.js docs retrieved via Context7, we should use `headers()` instead of...").
