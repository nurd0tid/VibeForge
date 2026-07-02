# Skill: UI/UX Review

## Purpose
Review UI/UX changes to ensure visual consistency, accessibility, responsive behavior, dark mode compliance, and overall layout integrity.

## When to Use
- After modifying or creating frontend components
- User requests visual review or design QA
- Before final testing of user-facing features

## Pre-Conditions (Read Before Acting)
- [ ] Read AGENTS.md
- [ ] Read memory bank (`activeContext.md`, `progress.md`)
- [ ] Check relevant docs (`CLAUDE.md`, `.clinerules`)
- [ ] Read the tailwind configuration and global CSS files
- [ ] Verify the component uses Tailwind v4 and shadcn/ui correctly

## Steps
1. Check Layout: Verify flex/grid structures, alignment, spacing, padding, and margins
2. Verify Dialogs: DialogTrigger must use `render={}` prop, NOT `asChild`
3. Check Responsiveness: Test at mobile, tablet, and desktop breakpoints
4. Check Dark Mode: Verify classes (like `dark:bg-slate-900`) look correct
5. Check Accessibility: Verify contrast, ARIA labels, tab index, keyboard navigation
6. Check for Overlaps: Ensure text, buttons, and panels do not overlap on resize
7. Verify Panels: Group/Panel/Separator must export correctly from `react-resizable-panels`

## Anti-Rationalization Rules
| Excuse | Rebuttal |
|--------|----------|
| "I'll do X later" | No. Do it now or log it as a blocker. |
| "It looks fine on my screen" | Test other screen widths and dark/light modes. |
| "Accessibility isn't critical right now" | Accessibilty must be built in, not bolted on. |
| "I used asChild on DialogTrigger because it's standard shadcn" | Read project rules: DialogTrigger uses `render={}` prop. |

## Verification (Definition of Done)
- [ ] Layout is verified at multiple breakpoints
- [ ] DialogTrigger uses `render={}` instead of `asChild`
- [ ] Dark mode styling verified
- [ ] Build passes
- [ ] No undefined/null errors in component rendering
- [ ] Memory bank updated with UI check status

## Output Format
Markdown UI/UX review checklist showing status (Pass/Fail/Not Applicable) for layout, responsiveness, dark mode, accessibility, and dialog usage.

## Files Affected
- Frontend components (`src/components/`, `src/app/`)
- `.vibeforge/memory-bank/progress.md`

## Failure Handling
If visual issues are found, resolve them in the code before claiming completion. Do not leave layout bugs to be fixed later.
