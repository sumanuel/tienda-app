---
name: tienda-app-ui
description: "Retail-focused UI guidance for tienda-app. Use when redesigning or creating Expo React Native screens, navigation, dashboards, POS flows, forms, or reusable UI components for products, sales, inventory, customers, suppliers, exchange rates, and settings."
license: MIT
---

# tienda-app UI Skill

Project-specific guidance for improving the visual quality of tienda-app while keeping the app practical for day-to-day store operations.

## When to Apply

Use this skill when:

- redesigning an existing screen in tienda-app
- creating a new screen or reusable component
- improving dashboard, POS, inventory, or sales layouts
- refactoring repetitive visual patterns into shared UI pieces
- reviewing whether a new UI fits the app's product style

## Core Direction

- Optimize for speed and confidence. A cashier or store owner should understand the screen in a quick glance.
- Make operational priorities obvious: primary action first, key numbers second, supporting detail last.
- Prefer a clean commercial tone over decorative novelty. The app can feel modern without reducing clarity.
- Dense data is acceptable, but it must be chunked into sections, cards, or rows with visible hierarchy.
- Use color to encode importance, status, and action intent, not as decoration everywhere.

## Project Anchors

- Reuse the responsive system in `src/utils/responsive.js` for spacing, radius, icon sizing, and font scaling.
- Keep navigation changes aligned with `App.js`, where the main stack and tab structure live.
- Prefer shared primitives in `src/components/common` or domain component folders when the same pattern appears across multiple screens.
- Preserve existing business logic and data flow; UI work should sit on top of the current hooks, contexts, and services rather than bypassing them.

## Screen Guidelines

### Dashboard

- Lead with the most important daily signals: sales, inventory, exchange rate, and pending operational items.
- Separate summary cards from action shortcuts so the screen does not feel like one large button wall.
- Highlight one or two high-priority alerts only. Avoid turning every stat into an urgent badge.

### POS and Sales

- Keep totals, payment actions, and confirmation steps visually dominant.
- Minimize visual noise near price, quantity, tax, and payment fields.
- Dangerous or irreversible actions should be isolated and clearly labeled.

### Inventory and CRUD Screens

- Group fields by intent: identity, pricing, stock, notes, and status.
- Use repeated form sections and card patterns so edit and create screens feel related.
- When a list is data-heavy, expose the key fields first and move secondary metadata lower.

### Empty and Loading States

- Empty states should tell the user what to do next, such as adding a product, registering a supplier, or creating the first sale.
- Loading states should preserve layout structure when possible so the screen does not jump excessively.

## Copy and Tone

- Write UI copy in concise Spanish.
- Prefer plain operational language over technical wording.
- Buttons should start with clear verbs.
- Section titles should help the user orient quickly, not sound promotional.

## Implementation Heuristics

- Keep visual systems consistent before adding new visual ideas.
- Extract shared card, header, stat, and form-row patterns when duplication appears in three or more places.
- For new interactive UI, prefer touch targets and spacing that remain comfortable on phones and small tablets.
- If a visual improvement makes the flow less obvious, reject it.
