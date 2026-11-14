# DataBoard visual refresh

![Dashboard preview](redesign-preview.jpg)

The existing IBM Plex Sans font, configurable purple/orange accents, routes,
queries, forms, persistence, theme selection, and export actions are retained.
The refresh changes presentation and adds decorative editorial artwork.

## Artwork

`public/illustrations/workspace-scenes.webp` contains three equal horizontal
scenes: calendar planning, writing notes, and reviewing a portfolio. CSS selects
the appropriate row and fades the left edge for readable HTML labels. All live
names and counts remain HTML rather than text embedded in the image.

Art direction: flat editorial characters and studio objects, purple and lavender
with orange accents, soft neutral backgrounds, no lettering or UI in the art.
The image is optimized as WebP and is shared by cards and module page headings.

## Verification

- `npm run build` and `npm run lint`.
- Desktop dashboard, notes, note editor/export menu, collections and portfolio.
- Existing note label filtering and command palette navigation.
- 390px mobile and 768px tablet frames: no horizontal page overflow.
- Mobile event form and collection blueprint form.
- Theme switching in the browser preview, returned to the original system setting.

Browser checks use the existing browser data source and its sample data.
The native Tauri build and native notification/backup integrations were not run.
