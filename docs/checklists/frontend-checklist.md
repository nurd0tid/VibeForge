# Frontend Checklist

This checklist covers all frontend-facing requirements for any page, component, or feature implemented in VibeForge.

---

## 1. Layout & Responsiveness

- [ ] **Desktop-first layout**: The page is designed for a minimum viewport of 1280×720 and looks optimal at 1920×1080.
- [ ] **Resizable panels**: Where applicable, panels use `react-resizable-panels` v4 (`Group`, `Panel`, `Separator`) with `minSize`, `maxSize`, `defaultSize`, and `autoSaveId` correctly configured.
- [ ] **Collapsible sections**: Sidebar and bottom panels are collapsible with smooth animations.
- [ ] **No overflow**: Content does not overflow horizontally. Long text is truncated with ellipsis or wrapped.
- [ ] **Scroll containers**: Scrollable areas use proper overflow-y-auto with styled scrollbars.
- [ ] **No blank screens**: Every visible region has content or a meaningful placeholder.

---

## 2. Page States

- [ ] **Loading state**: Skeleton placeholders matching the page layout shape are shown while data is being fetched. Not a generic spinner.
- [ ] **Empty state**: When no data exists, a meaningful message and a primary CTA button are displayed (e.g., "Create your first project").
- [ ] **Error state**: A descriptive error message with a "Retry" button is shown on API failure.
- [ ] **Retry mechanism**: The Retry button re-triggers the data fetch without requiring a page refresh.
- [ ] **Toast feedback**: All mutations (create, update, delete) produce a toast notification via Sonner.
- [ ] **Confirmation dialogs**: All destructive actions (delete, overwrite, reset) show a SweetAlert2 confirmation before proceeding.

---

## 3. Forms & Validation

- [ ] **Client-side validation**: All forms use React Hook Form + Zod v4 for schema-based validation.
- [ ] **Server-side validation**: API routes independently validate input (never trust client-only validation).
- [ ] **Error display**: Validation errors appear inline below the relevant field.
- [ ] **Submit state**: The submit button is disabled while the form is submitting and shows a loading indicator.
- [ ] **Success redirect**: On successful submission, the user is redirected or the UI updates immediately (optimistic update).

---

## 4. Component Quality

- [ ] **shadcn/ui consistency**: All buttons, inputs, selects, badges, cards, and dialogs use shadcn/ui components.
- [ ] **No raw HTML inputs**: Do not use `<input>`, `<select>`, or `<button>` directly. Use the shadcn/ui wrappers.
- [ ] **Icon consistency**: Use a single icon library consistently (e.g., `lucide-react`).
- [ ] **Color consistency**: All colors come from the Tailwind CSS theme. No hardcoded hex values.
- [ ] **Dark theme compatibility**: All components render correctly in both light and dark themes.

---

## 5. Accessibility Basics

- [ ] **Focus management**: Interactive elements are focusable and have visible focus indicators.
- [ ] **Keyboard navigation**: All primary actions are accessible via keyboard (Tab, Enter, Escape).
- [ ] **ARIA labels**: Icon-only buttons and interactive elements have `aria-label` attributes.
- [ ] **Semantic HTML**: Use `<nav>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>` where appropriate.
- [ ] **Color contrast**: Text meets WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text).

---

## 6. Performance

- [ ] **No unnecessary re-renders**: Components are memoized where appropriate (`React.memo`, `useMemo`, `useCallback`).
- [ ] **Lazy loading**: Heavy components (Monaco Editor, xterm.js) use `dynamic` import with `ssr: false`.
- [ ] **Image optimization**: All images use Next.js `<Image>` component with appropriate `width`, `height`, and `alt`.
- [ ] **Bundle size**: No large dependencies imported on the client side without justification.

---

## 7. Design Identity

- [ ] **VS Code + Linear feel**: The page feels like a professional development tool, not a generic admin dashboard.
- [ ] **Information density**: Content is compact and useful. No large empty cards or excessive padding.
- [ ] **No decorative clutter**: No random gradients, abstract illustrations, or placeholder images.
