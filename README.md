# TSG Sightline

A camera plot and plan tool for broadcast and event production, part of the
TSG tool set. Drop a venue drawing in, set the scale once, and place camera
positions whose footprints, coverage and working envelopes are drawn to true
size. The output is a camera plan sheet a rigging crew can work from.

Everything lives in `index.html`. There is no build step, no dependency and no
network access at runtime. Open the file in a browser or host it on any static
server.

The name refers to what the tool draws that a general drawing program does not:
the line from each lens to what it covers, at scale, so a position can be judged
before anyone unloads a truck.

## What it does

- **Mount-accurate plan symbols.** Pedestal, heavy tripod, ENG tripod, tripod on
  pulley, telescopic crane, jib arm, Steadicam, handheld, robotic head, POV and
  rail dolly. Each footprint is drawn in metres from published equipment figures,
  so a position on the sheet occupies the floor it occupies in the venue.
- **Lens-driven camera silhouettes.** The barrel is sized from the fitted lens, so
  a box lens and a portable zoom on the same body read differently on the plan
  and in a monochrome plot.
- **Coverage from the front element.** Horizontal angle of view is computed from
  focal length and imager width and drawn as nested wide and tele sectors. On an
  arm the cone is projected from the head, not the post.
- **Working envelopes.** Reach annulus and counterweight tail sweep for cranes,
  arc for fixed jibs, working radius or move path for Steadicam and handheld.
- **Rotation about the real axis.** The stored position is the pan axis of the
  head, the crane post or the operator's own axis, so aiming a position turns
  the kit around the point that actually stays still.
- **Drawing furniture.** Title block headed CAMERA PLAN with a two-view legend,
  graphic scale bar with subdivided extension, dimension tool with architectural
  ticks. The tool name appears only as a small line in the title block margin, in
  the way CAD software records itself on a sheet; the heading names the document.
- **Output.** SVG with the base plan embedded, PNG at twice sheet resolution,
  print, and a tab-separated camera list for the rigging schedule.

## Using it

1. **Load image.** A PNG or JPEG of the venue plan. Plot from CAD to PDF with
   `monochrome.ctb`, then rasterise at roughly 4000 px wide.
2. **Set the scale.** Three ways, in order of preference:
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
5. **Save project.** A JSON file that embeds the base plan and carries every
   position, dimension and title-block field. Open it later to pick up where you
   left off.

Handling shortcuts are listed at the bottom of the side panel.

## Project files

Format identifier `camera-plan/4`. Earlier versions open and are migrated:
version 3 anchored positions on the front element and is moved back onto the
pan axis, single-axis type files are mapped onto the mount and lens model.

A project file without an embedded base plan carries positions that are only
meaningful in metres. Opening one over a loaded drawing keeps the drawing and
rescales the positions to preserve their spacing.

`examples/fifteen-camera-build.json` is a fifteen-position HDC-3500 build on a
blank 120 by 80 m grid, useful as a starting arrangement to drag onto a venue.

Venue drawings and production project files are deliberately not part of this
repository. They embed floor plans supplied under production agreements.

## Equipment figures

Symbol dimensions come from manufacturer or hire-house documentation where it
was available: Vinten Quattro-L wheel track, steering ring and wheel diameter;
MovieBird 45 chassis, retracted and extended reach from the post, and tail
length derived from back-to-nose minus post-to-nose. Angle of view for the
Fujinon UA107x8.4 matches the manufacturer's published figures to a tenth of a
degree. Where a figure is nominal it is marked as such in the source and should
be checked against the supplier rigging data before a position is committed.

## Hosting

The tool is one static file and runs from disk; hosting only adds an address.
The published address is `https://thåst.se/tsg/sightline/`, where the TSG
proxy in the `thast.se` repository mounts it beside the other TSG tools.

The origin behind that address is a Cloudflare Worker defined by
`wrangler.jsonc` and `worker/index.js`: the repository root is served as
static assets, `.assetsignore` keeps everything but the tool and the examples
off the edge, and a request that reaches the Worker's own `*.workers.dev`
name answers 308 to the canonical address so no duplicate is ever indexed.
Deploy with `npx wrangler deploy`; there is still no build step.

## Code standard

British English throughout code, comments and documentation. ES2023, no
transpilation, no framework. Comments explain why rather than what.
