# Workspace Checklist

This checklist ensures the VibeForge workspace interface is fully functional, visually correct, and structurally sound.

- [ ] **Layout Integrity**: The overall workspace layout adheres to design rules without overlapping elements or broken flexbox/grid alignments.
- [ ] **Resizable Panels**: `react-resizable-panels` components (`Group`, `Panel`, `Separator`) function smoothly. Panels can be resized without breaking constraints or causing layout jumps.
- [ ] **Activity Bar**: The leftmost activity bar displays the correct icons, reflects the active view state, and switches contexts correctly when clicked.
- [ ] **Explorer**: The file/project explorer renders hierarchical data accurately, handles expand/collapse states properly, and selects files correctly.
- [ ] **Monaco Editor**: The Monaco code editor instances load properly with syntax highlighting, correct themes, line numbers, and file content binding.
- [ ] **Editor Tabs**: Multiple files can be opened in tabs; switching tabs updates the editor content, and closing tabs works without state corruption.
- [ ] **AI Panel**: The AI chat/assistant panel renders correctly, maintains conversation history, and handles input states (loading, disabled) properly.
- [ ] **Task Panel**: The current task list or ActiveTodoStrip renders accurately above the input or in its designated panel, reflecting real-time progress.
- [ ] **Bottom Panel**: The bottom auxiliary panel toggles correctly and preserves its height when collapsed/expanded.
- [ ] **Terminal**: The integrated terminal emulator instances load without errors, accept input, and display output formatted correctly.
- [ ] **Problems/Logs Tabs**: The problem matcher and log viewers in the bottom panel display current warnings, errors, and system logs correctly.
- [ ] **Status Bar**: The bottom status bar shows accurate information (e.g., current branch, token usage progress bar, connection status, line/col numbers).
- [ ] **Dialog Renders**: Modal dialogs (`DialogTrigger`) use the `render={}` prop (NOT `asChild`), trap focus correctly, blur/overlay the background, and close gracefully.
