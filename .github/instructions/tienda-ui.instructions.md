---
description: "Use when designing or editing tienda-app mobile UI in screens, navigation, responsive layout, or reusable components. Covers visual direction, retail workflow hierarchy, dashboard and POS clarity, dense data cards, empty states, and touch-friendly actions for this Expo React Native project."
name: "tienda-app UI"
applyTo: "App.js,src/screens/**/*.js,src/components/**/*.js,src/utils/responsive.js"
---

# tienda-app UI Guidelines

- Design for fast retail operations. The app should feel reliable, legible, and efficient during checkout, product management, and inventory work.
- Prioritize high-frequency flows in the visual hierarchy: POS, dashboard, products, sales, inventory, customers, and suppliers.
- Keep one primary action clearly dominant per screen. Secondary actions should support the task, not compete with it.
- Use the existing responsive helpers from `src/utils/responsive.js` instead of hard-coded spacing and font sizes when practical.
- Prefer grouped cards, clear section headers, and short vertical chunks over long flat layouts that are hard to scan.
- Money, stock, and exchange-rate values should use strong contrast, stable alignment, and restrained decoration so they can be read at a glance.
- Empty states should feel operational, not generic: explain what is missing, why it matters, and provide a direct CTA.
- Forms should feel calm and predictable. Group related inputs, keep labels clear, and leave enough breathing room around save and delete actions.
- Keep copy short, practical, and friendly in Spanish. Avoid technical phrasing when a store owner or cashier would expect plain language.
- Destructive actions must be visually separated from the main submit flow and should never look like the safest default action.
- Favor consistency across CRUD screens so products, customers, suppliers, accounts, and inventory flows share the same spacing rhythm and card hierarchy.
