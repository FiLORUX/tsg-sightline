# TSG Sightline

A camera plot and plan tool for broadcast and event production, part of the
TSG tool set. Drop a venue drawing in, set the scale once, and place camera
positions whose footprints, coverage and working envelopes are drawn to true
size. The output is a camera plan sheet a rigging crew can work from.

The plan editor runs from `index.html` without a build step. Open it in a browser
for local projects. The hosted application also supports publishing and live updates.

[Open Sightline](https://tsg.thast.live/sightline/) · [Operator handbook](https://docs.xn--thst-roa.se/tsg-sightline/) · [Illustrated rig and RF guide](docs/MOUNT-PICTOGRAMS.md)

The name refers to what the tool draws that a general drawing program does not:
the line from each lens to what it covers, at scale, so a position can be judged
before anyone unloads a truck.

## What it does

- **Rig plan symbols.** The Vinten HP 419 I pedestal, heavy tripod, ENG tripod,
  tripod dolly, telescopic crane, Jimmy Jib Triangle, Steadicam, Handheld,
  Easyrig, robotic head, POV and rail dolly have distinct plan symbols. Metric footprints
  use nominal equipment profiles and the position's configured geometry.
- **Lens-driven camera silhouettes.** The barrel is sized from the fitted lens, so
  a box lens and a portable zoom on the same body read differently on the plan
  and in a monochrome plot.
- **Coverage from the front element.** Horizontal angle of view is computed from
  focal length and imager width and drawn as nested wide and tele sectors. On an
  arm the cone is projected from the head, not the post.
- **Working envelopes.** Reach annulus and counterweight tail sweep for cranes,
  arc for fixed jibs, working radius or move path for Steadicam, Handheld and Easyrig.
- **RF camera links.** Choose RF under Signal link when placing any rig, or
  set the selected chain’s transport and TX/RX assignment in the position editor.
- **Rotation about the real axis.** The stored position is the pan axis of the
  head, the crane post or the operator's own axis, so aiming a position turns
  the kit around the point that actually stays still.
- **Drawing furniture.** Title block headed CAMERA PLAN with a two-view legend,
  graphic scale bar with subdivided extension, dimension tool with architectural
  ticks. The tool name appears only as a small line in the title block margin, in
  the way CAD software records itself on a sheet; the heading names the document.
- **CAD plans read directly.** A DXF straight from AutoCAD, BricsCAD or
  Vectorworks loads as vector linework with its scale taken from the file, so
  the drawing plots sharply; declared or inferred units need confirmation before dimensioned export. Layers
  can be shown or hidden; text, hatches and dimensions are left out on purpose.
- **True-scale output.** Choose a paper size and a ratio, or let the sheet pick
  the largest standard ratio that fits, and the title block states it. Print at
  100 % and a rule laid on the paper reads real metres; the browser's "Save as
  PDF" is the PDF export. SVG exports carry the same physical dimensions.
- **Output.** SVG with the base plan embedded, PNG at twice sheet resolution,
  print, and a tab-separated camera list for the rigging schedule.
- **Saving and sharing.** Save local keeps the full project and camera-chain
  assignments. Copy share link can carry a position study in the URL. Publish
  & save creates an unlisted hosted view with the assets you approve. TX/RX
  assignments are available in the local project and chain schedule.

## Using it

1. **Load plan.** A DXF exported from CAD is best: the scale comes with it and
   the linework stays vector. Check the drawing units the panel reports; if the
   extent reads a thousand times off, pick the right unit. Otherwise a PNG or
   JPEG of the plan: plot from CAD to PDF with `monochrome.ctb`, then rasterise
   at roughly 4000 px wide.
2. **Set the scale** for a raster plan. Three ways, in order of preference:
   - *Derive from plot scale* if the sheet was plotted at a known ratio on a
     known paper size. No measuring involved.
   - *Set scale* and drag between two points whose real distance is known from
     the CAD file or from a dimension string.
   - Type pixels per metre directly if it is known from a previous revision.
3. **Place positions.** Pick a mount in the palette and click the plan, or
   double-click. Drag the number to move, drag the ring to aim, Shift plus
   wheel for working distance, Alt plus wheel for crane extension.
4. **Check.** Use *Measure* against something of known size before trusting any
   clearance. The panel shows how many metres the sheet covers.
5. **Choose the output.** Paper size and ratio under Output. The readout says
   what the sheet prints at and whether it fits. Print at 100 %, never "fit to
   page", or the stated scale is a lie.
6. **Save project.** A JSON file that embeds the base plan and carries every
   position, dimension and title-block field. In Chromium browsers Save writes
   back to the file you opened; elsewhere it downloads. Ctrl+S saves, Ctrl+Shift+S
   chooses a new file. The browser also keeps an autosave and offers it back
   after a crash or a closed tab.
7. **Share.** Copy share link puts the positions and title block in a URL a
   few kilobytes long. The recipient sees them on a blank sheet at the right
   scale and loads the venue plan themselves; the drawing never travels.

Handling shortcuts are listed at the bottom of the side panel.

## Project files

Format identifier `camera-plan/6` adds calibration evidence and optical pose/registration parameters. Version 5 added vector plans, production logos and output sheet settings. Legacy scale claims are estimated until confirmed. Earlier versions open and are migrated:
version 4 lacks those three fields, version 3 anchored positions on the front
element and is moved back onto the pan axis, single-axis type files are mapped
onto the mount and lens model.

A project file without an embedded base plan carries positions that are only
meaningful in metres. Opening one over a loaded drawing keeps the drawing and
rescales the positions to preserve their spacing.

`examples/fifteen-camera-build.json` is a fifteen-position HDC-3500 build on a
blank 120 by 80 m grid, useful as a starting arrangement to drag onto a venue.

Venue drawings and production project files are deliberately not part of this
repository. They embed floor plans supplied under production agreements.

## Equipment figures

Symbol dimensions come from manufacturer or hire-house documentation where
available. The pedestal template retains its nominal planning dimensions, originally
based on the Quattro-L. The HP 419 I outline depicts its three wheel housings
and steering ring. MovieBird 45 dimensions include the chassis, retracted
and extended reach from the post, and tail length derived from back-to-nose
minus post-to-nose. Angle of view for the
Fujinon UA107x8.4 matches the manufacturer's published figures to a tenth of a
degree. Where a figure is nominal it is marked as such in the source and should
be checked against the supplier rigging data before a position is committed.

## Hosting

The tool is one static file and runs from disk; hosting only adds an address.
The published address is `https://tsg.thast.live/sightline/`, where the TSG
proxy in the `thast.se` repository mounts it beside the other TSG tools.

The origin behind that address is a Cloudflare Worker defined by
`wrangler.jsonc` and `worker/index.js`: the repository root is served as
static assets, `.assetsignore` keeps everything but the tool and the examples
off the edge, and a request that reaches the Worker's own `*.workers.dev`
name answers 308 to the canonical address so no duplicate is ever indexed.
Deploy with `npx wrangler deploy`; there is still no build step.

## Spatial previsualisation (engineering preview)

Open **3D previs** in the plan toolbar. The venue overview and selected camera frame share the 2D camera state. Drag to orbit, Shift-drag or right-drag to pan, scroll to zoom, or use the labelled controls; on touch screens, drag to orbit and pinch to zoom and pan. Click a camera marker to select it; selection can include cameras hidden behind geometry. **Expand** enlarges the viewport, **Focus camera** frames the selected position and **Fit view** returns to an overview. The raster plan, if present, appears as a flat reference at the plan datum, not as venue geometry; it can be hidden, and a vector-only plan is not currently shown in 3D. Set mount datum, lens height, tilt, roll, focal length and relative head pan on arm positions. Load an uncompressed, self-contained, static GLB 2.0 export locally; nothing is uploaded. The viewport renders opaque triangle geometry with WebGL 2; model textures are not rendered. Set model origin and yaw manually or fit two paired XY control points, then use an independent third point and check the vertical datum before confirming registration. Reported endpoint residual is half the baseline length discrepancy, not an independent validation. Point checks distinguish frame inclusion from finite-ray intersection with loaded opaque triangles; they are not rigging or clearance approvals. Missing intersections in a partial model or a model of unknown completeness are indeterminate, not proof of a clear sightline.

The project file keeps registration parameters but not the 3D model or its confirmation. Reattach the local model after opening a project. Native DWG/SKP conversion is an authorised external workflow. See [ROADMAP.md](ROADMAP.md) for production scope and release gates.

## Camera-chain schedule

A plotted position is not necessarily a distinct source. Use **Create linked alternate position** for an alternative position of the same chain; its director number and chain metadata remain shared. **Duplicate as new chain** creates an independent source. Chain renumbering operates on chain identity, not physical positions. The position TSV has one row per position; the chain schedule TSV has one row per chain and reports identity conflicts, missing or multiple primary positions and inconsistent common fields. Shared links omit interface details. A conflict-free chain schedule is not a technical or director approval.

For source mapping, independent scale, position and pose checks, site survey
and issue controls, see [Camera placement review](docs/PLACEMENT-REVIEW.md).

The GLB parser uses an isolated local worker with cancellation when Worker is available. The native drawing and model are not transmitted. CAD linework is cached independently of camera movement.

## Equipment and optical frame

The registry separates the camera body, acquisition mode, lens, active lens-side aperture, native focal length, optical extender, optical adapter and digital/window crop. It includes 82 camera entries and 86 lens entries, with manufacturer references and explicit nominal or variant-confirmation status. It does not represent an exhaustive or individually measured rental inventory.

The optical kernel supplies the XY projection of the frustum, camera-frame projection and position TSV from the same active aperture. Published integrated-lens horizontal endpoints anchor the PTZ model; intermediate focal positions and vertical output crop are estimates. Unknown apertures and incompatible lens interfaces block the coverage result. The glyph is a nominal planning footprint unless a specific manufacturer dimension is recorded; verify the actual lens support, head and build. Lens distortion, focus breathing and exact optical-centre offset require separate measurement.

Legacy portable links retain the URL fragment and stored optical configuration. A link does not carry CAD, a 3D mesh, interface metadata or verified registration. Reattach authorised venue files locally.

## Release

Keep the canonical URL and Worker name unchanged. The public proxy allows the same-origin geometry-worker.js. Run all regressions, install the pinned browser test dependency and run tools/render-og.mjs before Wrangler deployment to produce the generic 1200 × 630 PNG social card. The author link names the estate's canonical Person page; rel=me remains confined to that page. See [ROADMAP.md](ROADMAP.md) for unimplemented production gates.

## Testing

The DXF reader is written without DOM references so it can run in Node:

```bash
node tools/test-dxf-parser.mjs
node tools/test-spatial.mjs
node tools/test-chain.mjs
node tools/test-equipment.mjs
node tools/check-spatial-embed.mjs
```

The rest of the tool is exercised in a browser. There is no build step to break.

## Code standard

British English throughout code, comments and documentation. ES2023, no
transpilation, no framework. Comments explain why rather than what.

## Licence

MIT. See `LICENSE`.
