# Phase 8 Summary - Case Queue and Duty Roster

## Delivered

- Replaced the generic `/cases` page with a URL-synchronized case queue. Status cards, table header tint, scoped rows, and browser query-parameter changes stay aligned.
- Added standalone case navigation plus permission-gated closed-case Reopen and Archive mutations.
- Replaced the generic `/duty-roster` page with subscribed and available roster cards, shift status lists, and permission-gated subscription controls.
- Added the `scope=mine` queue filter using the authenticated professional's subscribed roster IDs. Repository signal mutations immediately update roster membership and the navbar shift-label source.
- Added English, French, and German translations and focused Jest coverage for URL state, history restoration, permission-gated mutations, roster persistence, and header shifts.

## Validation

- Changed-file Prettier check, lint, focused Jest suites, full Jest suite, and production build were run after implementation.
