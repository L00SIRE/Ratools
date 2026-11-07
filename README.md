# RA Tools

Browser tools I built for my Resident Assistant job. Every month I'm supposed to put up a bulletin board and make door decs for my residents, and most of that time went into resizing images and fighting the printer. These two tools handle that part.

Everything runs client-side in plain HTML, CSS and JavaScript. No build step and no backend.

## Tools

### Bulletin board designer

You give it one image and the size of the board. It gives you back a set of printable A4 tiles.

- Upscales the image to the target print size with bilinear, bicubic or Lanczos resampling (`js/imageProcessor.js`). Lanczos is the default because it holds up best on large prints.
- Splits the result into a grid of A4 tiles with a configurable overlap (`js/gridSplitter.js`).
- Draws cut lines, glue zones, registration marks and alignment points on each tile so they line up on the wall.
- Exports a ZIP of PNGs or a single PDF. The PDF includes an assembly guide page showing where each tile goes (`js/printExporter.js`).

### Door dec generator

This one makes name tags for residents' doors in batches.

- A canvas designer for the base shape and style of the tag.
- "Smart pencil": you sketch a rough shape and it snaps it to a circle, square, star or hexagon. The detection is a set of heuristics (aspect ratio, closed-loop check, radial variance from the centre, corner count). There's no model behind it. See `js/smartPencil.js`.
- Paste in a list of names and it lays them out on printable PDF sheets, either combined or as separate layers for the shape and the name.

## Run it

```bash
git clone https://github.com/L00SIRE/Ratools.git
cd Ratools
python3 -m http.server 8000   # or open index.html directly
```

The PDF and ZIP export libraries come from cdnjs: jsPDF, JSZip and FileSaver.

## Layout

```
index.html                  landing page
bulletin-board-designer/    image → tiled A4 print set
door-dec-generator/         name tag designer + batch export
```
