# Task Play Workflow

VibeForge includes a robust task management system designed for agentic execution.

## Execution
- Each task in the UI has a dedicated **Play** button.
- Users can select a single task or multiple tasks for execution.

## Task States
Tasks progress through the following states:
1. **Pending**: Task is created but not yet queued.
2. **Queued**: Task is added to the execution queue.
3. **Running**: Agent is actively working on the task.
4. **Blocked**: Task cannot proceed (e.g., waiting on user input or missing dependencies).
5. **Done**: Task is successfully completed.
6. **Failed**: Task encountered an unrecoverable error.
7. **Skipped**: Task was bypassed.

## Workspace Queue
- Pending tasks enter the workspace queue for execution.
- Done tasks are removed from the active queue.

## Multi-step Tasks
- For complex requests, a todo list is generated, breaking the work down into multiple sub-tasks that flow through this state machine.