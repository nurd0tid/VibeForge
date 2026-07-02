# UI Layout Rules

To ensure a seamless IDE-like experience, VibeForge enforces strict layout conventions. 

## Layout Areas
- **Sidebar**: Global navigation and MCP tool configuration.
- **Explorer**: File tree. Progressive Disclosure rules apply (accordion defaults to collapsed).
- **Workspace**: The central hub. Contains the Chat, ActiveTodoStrip, and Agent Activity.
- **Editor / Diff Viewer**: Dedicated space for viewing code changes.
- **Terminal**: Bottom panel for command execution output.
- **Right Panel**: Supplemental context, memory bank overview, or detailed task views.
- **Modals**: For settings, provider configurations, and manual approvals.

## Strict Rules

1. **No Overlap**
   - UI panels must not overlap unless explicitly designed as a temporary floating modal or popover.
   - Z-index must be carefully managed. Modals > Popovers > Floating Elements > Workspace.

2. **Accordion Default Collapsed**
   - File trees and long lists must use accordions and default to a collapsed state to prevent information overload.

3. **Scrollable Content**
   - Any container holding dynamic content (Chat, Editor, Terminal) must have `overflow-y-auto`.
   - The main window should never scroll; scrolling is restricted to internal panels.

4. **Modals Must Not Break**
   - Modals must have a maximum height (`max-h-[90vh]`) and internal scrolling to ensure they remain usable on small screens.
   - `DialogTrigger` from shadcn/ui must use the `render={}` prop, NOT `asChild`.

5. **Flex & Height Rules**
   - Use `flex-1` for primary content areas to fill available space.
   - Use absolute or fixed positioning sparingly, only for global overlays.
   - The root layout must be `h-screen w-screen overflow-hidden`.

6. **Responsive Behavior**
   - On mobile, panels should collapse into drawer menus or stack vertically.
   - Resizable panels (`react-resizable-panels`) should define strict `minSize` and `maxSize` props.