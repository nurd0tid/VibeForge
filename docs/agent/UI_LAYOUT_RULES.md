# UI Layout Rules

To ensure a seamless, IDE-like experience, VibeForge enforces strict layout conventions. These rules govern spacing, positioning, hierarchy, and overflow.

---

## 1. Top-Level Layout Areas

The UI is divided into fixed functional zones:

| Zone | Purpose | Positioning Constraint |
|------|---------|------------------------|
| **Sidebar** | Global navigation and MCP configuration. | Fixed width on desktop, drawer on mobile. |
| **Explorer** | File tree. | Requires progressive disclosure (defaults to collapsed). |
| **Workspace** | Chat, ActiveTodoStrip, Agent Activity. | Primary fluid area. |
| **Editor / Diff Viewer** | Dedicated space for viewing code changes. | Flexible width, scrollable vertically. |
| **Terminal** | Command execution output. | Anchored to bottom, resizable height. |
| **Right Panel** | Context view, Memory Bank, Task details. | Collapsible/resizable. |
| **Modals** | Settings, providers, approvals. | Centered over main content, elevated z-index. |

---

## 2. Non-Negotiable Rules

### A. No Unintentional Overlap
- UI panels must not overlap unless explicitly designed as a temporary floating modal or popover.
- Z-index must follow this strict hierarchy: `Modals > Popovers > Floating Tooltips > Workspace Content`.

### B. Scrolling Rules
- The main window (`html`, `body`, `#root`) must never scroll.
- The root layout must enforce `h-screen w-screen overflow-hidden`.
- Any container holding dynamic content (Chat, Editor, Terminal, Lists) must manage its own scrolling using `overflow-y-auto`.

### C. Accordion Default State
- File trees, log outputs, and long lists must use accordions and **must default to a collapsed state** to prevent information overload and cognitive fatigue.

### D. Modal Safety
- Modals must be horizontally and vertically centered.
- Modals must define a maximum height (`max-h-[90vh]`) and internal scrolling (`overflow-y-auto`) to ensure they do not break or become unusable on small screens.
- When using shadcn/ui or Base UI `DialogTrigger`, the trigger must use the `render={}` prop, **NOT** the `asChild` prop.

### E. Flexbox and Sizing
- Use `flex-1` for primary content areas to fill available space symmetrically.
- Use absolute or fixed positioning sparingly — reserve it for global overlays, toasts, and popovers.
- Resizable panels (via `react-resizable-panels` v4) must define strict `minSize` and `maxSize` props to prevent layout collapse.

### F. Responsiveness
- On mobile breakpoints, side panels (Explorer, Right Panel) must collapse into drawer menus.
- Horizontal arrangements of panels must stack vertically if the viewport is narrower than a configured threshold.
- Touch targets on mobile must be at least 44x44 pixels.
