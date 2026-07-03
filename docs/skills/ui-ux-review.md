---
name: ui-ux-review
description: Review UI/UX changes to ensure visual consistency, accessibility, responsive behavior, dark mode compliance, and overall layout integrity.
---

# Overview
Inspects frontend component code for layout correctness, proper shadcn/ui API usage, responsive breakpoints, dark mode styling, accessibility compliance, and panel structure.

# When to Use
- After modifying or creating frontend components
- User requests visual review or design QA
- Before final testing of user-facing features

# Process
1. Check Layout: Verify flex/grid structures, alignment, spacing, padding, and margins
2. Verify Dialogs: `DialogTrigger` must use `render={}` prop, NOT `asChild`
3. Check Responsiveness: Test at mobile, tablet, and desktop breakpoints
4. Check Dark Mode: Verify dark variant classes (like `dark:bg-slate-900`) are applied
5. Check Accessibility: Verify contrast, ARIA labels, tab index, keyboard navigation
6. Check for Overlaps: Ensure text, buttons, and panels do not overlap on resize
7. Verify Panels: `Group`, `Panel`, `Separator` must export correctly from `react-resizable-panels`
8. Update memory bank with UI check status

# Rationalizations
| Excuse | Rebuttal |
|--------|----------|
| "It looks fine on my screen" | Test other screen widths and dark/light modes. |
| "Accessibility isn't critical right now" | Accessibility must be built in, not bolted on. |
| "I used asChild on DialogTrigger because it's standard shadcn" | Read project rules: DialogTrigger uses `render={}` prop. |
| "Panel resizing edge cases are unlikely" | Resize failures break the entire workspace layout. Test them. |

# Red Flags
- `DialogTrigger` using `asChild` instead of `render={}`
- No dark mode variant classes on visible elements
- Missing ARIA labels or keyboard navigation paths
- Panel imports using old API instead of `Group`/`Panel`/`Separator`

# Verification
- [ ] Layout verified at multiple breakpoints
- [ ] `DialogTrigger` uses `render={}` instead of `asChild`
- [ ] Dark mode styling verified
- [ ] Build passes
- [ ] No undefined/null errors in component rendering
- [ ] Memory bank updated with UI check status
