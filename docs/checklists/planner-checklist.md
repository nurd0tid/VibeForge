# Planner Checklist

This checklist verifies the AI-driven planning, scheduling, and task generation capabilities of the Planner feature.

- [ ] **Objective Input**: The user interface allows clear, multi-line input of high-level objectives and constraints for the AI planner to analyze.
- [ ] **Planner AI Generation**: The AI provider integration successfully receives the objective, processes it, and returns a structured plan without timing out.
- [ ] **Breakdown Parameters**: The plan correctly breaks the objective down into actionable milestones, phases, or specific tasks with appropriate granularity.
- [ ] **Dependencies & Risks**: The generated plan accurately identifies logical dependencies between tasks and surfaces potential risks or blockers upfront.
- [ ] **Day-Index Scheduling**: Tasks are scheduled using relative day-indexes (e.g., Day 1, Day 2) or specific dates, logically ordered according to their dependencies.
- [ ] **Schedule Conflicts**: The system detects and highlights unrealistic timelines, resource bottlenecks, or logical schedule conflicts in the generated plan.
- [ ] **Convert to Tasks**: The user can seamlessly approve the plan and convert the proposed milestones/steps into concrete Kanban tasks persisted in NocoDB.
- [ ] **UI Feedback**: During generation and conversion, clear loading states and success/error toasts are displayed to the user.
