# DataBoard visual refresh

![Dashboard preview](redesign-preview.jpg)

The interface uses white surfaces, a #fafafa canvas, black primary actions, gray
secondary accents and IBM Plex Sans. Character artwork and illustrated page
banners have been removed; further illustration work is deferred.

The original routes, forms, queries, persistence, exports and theme controls are
retained. Existing installations using the previous default purple/orange pair
receive a one-time upgrade to the neutral pair. Custom palettes remain available.

## Verification

- `npm run build` and `npm run lint`.
- Browser review of desktop and 320px/768px layouts; no page or calendar panel overflow.
- Existing note filtering, editor/export menu and command palette.
- Calendar navigation, selected-day timeline and event links.
- Calendar month navigation and selected-day timeline verified (2 events on the selected day, 1 on today).
- One-time palette upgrade and preservation of custom choices checked with a targeted runtime assertion.
- Native app icon files regenerated from the monochrome SVG.
- Native Tauri build and native notification/backup integrations were not run.
