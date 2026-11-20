# Succulents & Cacti Offline Explorer — Version 1.0

An offline-first, installable web app for Windows and Android. Records are stored in the browser (IndexedDB) on each device.

## Features
- Genus sections are collapsible (large genera start collapsed), with Expand all / Collapse all, and a Cards / List view toggle for long genera. Searching or filtering opens matching sections.
- **Learn section**: a summary of the author's preferred growing medium (drainage first, 10 ingredients, quantities), with an optional photo of the mix that you add yourself.
- Plants grouped Family → Genus → Species (collapsible), with family and genus filters; family auto-suggested for known succulent and cactus genera.
- Extra fields: **plant tag number**, **flowering season**, **date acquired** and **acquired from** (shown on cards and searchable).
- Pest & fungus treatments on each plant's edit page (kept per genus): what, product, date treated, next due.
- Photos are resized on upload and can be removed; a delete can be undone.
- Backup reminder after 14 days, persistent-storage request, storage usage display, Export library (JSON) and Export CSV.
- Import JSON or CSV; plants are matched by scientific name, so re-importing does not create duplicates.
- Update prompt when a new version is available.
- `config.js` holds all collection-specific settings.

## Notes
- The three starting plants are demonstration records only.
- Fonts (Playfair Display, Inter) load from Google Fonts on the first online visit and are then cached; a system font is used until then.
- Serve over HTTPS (or localhost) to install. Use a separate web address for each app so libraries stay separate.
- Each device has its own database; move data with Export / Import.

## Import fields
JSON: array, `{ "plants": [...], "treatments": [...] }` or `{ "records": [...] }`. Plant fields: `id`, `family`, `scientificName` (or `name`), `genus`, `acceptedName`, `locality`, `tagNumber`, `floweringSeason`, `acquiredDate` (YYYY-MM-DD), `acquiredFrom`, `notes`, optional `photo` data URL.
CSV header example: `family,scientificName,genus,acceptedName,locality,tagNumber,floweringSeason,acquiredDate,acquiredFrom,notes`.

## Offline support
The app now has a working offline cache (`sw.js`). Open the hosted link once while online, then install it; after that it opens without internet. When you change any file, raise `VERSION` in `sw.js` so installed copies update.

© 2026 Henry van der Schyff. All rights reserved.
