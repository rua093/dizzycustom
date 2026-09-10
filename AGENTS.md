# DizzyCustom Codex Rules

This repository is a Shopify Dawn 12 theme. You must keep changes stable, scoped, SEO-safe, responsive and easy for the team to review.

## 1. Before Editing

- Read this file first.
- Check `git status` and preserve all unrelated user/team changes.
- Inspect the real code before proposing or editing: relevant sections, snippets, assets, templates, settings and callers.
- Confirm the expected behavior, affected pages, responsive behavior and acceptance criteria when the request is ambiguous.
- Keep each task small. Do not mix redesign, cleanup, dependency changes, formatting and bug fixes in one diff.

## 2. Debugging Protocol

For bugs, work in this order:

1. Reproduce the issue.
2. Identify where and under what conditions it happens.
3. Inspect the related Liquid, CSS, JavaScript, DOM, console and settings.
4. Find the root cause.
5. Make the smallest maintainable fix.
6. Retest the original case and nearby behavior.
7. Remove temporary/debug code.
8. Review the final diff.

Do not randomly change values until the symptom disappears.

## 3. No Fragile Shortcuts

Avoid:

- stacking CSS overrides instead of fixing the source
- broad global selectors for local problems
- `!important` as a shortcut
- arbitrary negative margins, `z-index` escalation or `overflow: hidden` to hide layout bugs
- `setTimeout()` or delayed class toggles to mask rendering issues
- duplicate desktop/mobile content only for layout convenience
- JavaScript layout work that CSS can handle reliably
- rewriting unrelated code to make the task easier

If a workaround is unavoidable, explain why, isolate it and document the risk.

## 4. Shopify/Dawn Architecture

- Prefer existing Dawn sections, snippets, CSS variables, breakpoints and JavaScript helpers.
- Keep merchant-editable content in section/block settings when appropriate.
- Preserve schema setting IDs, app blocks, dynamic sources, translations and existing Shopify commerce behavior.
- Keep critical content server-rendered in Liquid; do not move SEO/product content to JavaScript-only rendering.
- Scope new CSS to the owning component/section. Shared files such as `assets/base.css`, `sections/header.liquid`, layout files and theme config require extra caution.
- JavaScript must handle Shopify Theme Editor reloads safely: avoid duplicate listeners and clean observers, timers and subscriptions when needed.

## 5. UI Quality

Every UI change must be checked beyond one desktop viewport.

Check relevant mobile, tablet, laptop, desktop and large desktop widths, including breakpoint-adjacent widths when responsive CSS changes.

Verify:

- no horizontal overflow
- no clipped or overlapping text
- usable menus, buttons, inputs and touch targets
- stable image/media sizing
- no visible flicker, flashing, jumping or layout shift
- sticky header, drawers, search, cart and focus behavior where affected
- reduced-motion behavior for animation changes

Animations should enhance a layout that already works. Prefer `transform` and `opacity`; avoid layout-heavy animation.

## 6. SEO, Accessibility And Performance

- Preserve canonical tags, metadata, heading hierarchy, crawlable links, JSON-LD and product/variant/price/availability semantics.
- Use meaningful `alt` text for content images and empty alt text for decorative images.
- Use semantic HTML: buttons for actions, links for navigation.
- Keep controls keyboard accessible with visible focus states and accessible names.
- Avoid unnecessary ARIA when native HTML is enough.
- Reserve media dimensions where possible and avoid heavy scripts/media without a clear need.
- Do not knowingly worsen LCP, CLS or interaction responsiveness.

## 7. Git And Shopify Boundaries

- Never reset, clean, force push, rewrite history or restore unrelated files unless the user explicitly asks.
- Git is the source of truth. Theme Editor changes must be inspected as a diff before integration.
- Do not bulk pull, push to a shared/live theme, publish a theme or change remote Shopify configuration unless explicitly requested.
- Do not commit credentials, private QA config, browser sessions, customer data or generated reports.

## 8. Completion Report

At the end of a coding task, report briefly:

- what changed
- root cause or implementation reason
- files touched
- what was checked, including pages and viewport sizes for UI work
- what was not checked and why
- remaining risks or assumptions

Do not claim “passed”, “done” or “no regression” unless it was actually verified.

Looks good on desktop is never enough.
