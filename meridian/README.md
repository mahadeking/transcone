# Meridian

A beautiful, modern web app for making maps on the internet — a design-forward alternative to Felt.
Built with **React + Vite + MapLibre GL**. Runs entirely in the browser (maps are saved to
IndexedDB on your device — no backend required for the editor core).

## Run it

```bash
cd meridian
npm install
npm run dev      # http://localhost:5180
```

Build for production: `npm run build` → static files in `dist/` (deploy anywhere).

> Note: the map is WebGL. Some embedded/preview screenshotters can't composite WebGL, so the
> map may look blank in a screenshot even though it renders perfectly in a real browser.

## What's built (editor core)

**Dashboard**
- Workspace sidebar, map card grid, search + sort, templates, duplicate/delete
- Light & dark theme

**Map editor**
- MapLibre canvas with 5 basemaps (Light, Dark, Streets, Satellite, Terrain)
- **Upload anything**: GeoJSON, CSV/spreadsheet (auto-maps `lat`/`lng`, geocodes addresses via
  OpenStreetMap Nominatim), KML, GPX, Shapefile (.zip) — plus paste GeoJSON/CSV
- **Data-driven cartography**: Simple, Categories, Color range (choropleth), Size range
  (graduated), Heatmap — with palettes/ramps, color, size, stroke, opacity, and labels
- **Annotations**: Pin, Line, Route, Polygon, Rectangle, Circle, Text, Note, Marker,
  Highlighter, Link, Video
- **Legend** (auto-generated, data-driven) + **List** panel with visibility toggles & zoom-to
- **Attribute table** with sort, filter, and click-row-to-fly
- Filters, place search (geocoding), keyboard shortcuts, auto-save
- **Share**: read-only view link, website embed (iframe), export to GeoJSON / CSV / PNG / map file

**Viewer** (`#/view/<id>`, `?embed` for iframes)
- Read-only interactive map with legend and feature popups

## Architecture

```
src/
  lib/          basemaps, geo parsing/geocoding, storage (IndexedDB),
                palettes, MapLibre style translation, drawing engine
  store/        Zustand store (maps, layers, annotations, auto-save)
  components/
    dashboard/  Dashboard, MapThumb
    editor/     Editor, TopBar, MapCanvas, LeftPanel, DetailPanel,
                DataTable, UploadModal, ShareModal, BasemapPicker
    viewer/     read-only shared/embed view
```

## Roadmap (to fully match Felt)

- User accounts + cloud-saved maps (needs a backend)
- Real-time multi-user editing, presence & comments (websockets)
- Spatial analysis (join/clip/buffer), H3, raster/GeoTIFF
- AI "map from a prompt", Field App, developer API
