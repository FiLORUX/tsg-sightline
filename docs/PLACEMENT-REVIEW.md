# Camera placement review

A camera plan is a production proposal until its sources, position, pose and
physical constraints have been checked by the responsible people. A published
link, a revision label, a calibrated scale or a conflict-free chain schedule
is not evidence that any camera is in the correct place. Do not infer camera
positions from a generic example or move a position to match a label without a
traceable source. Record unknowns explicitly; do not turn an assumption into an
approval.

## 1. Establish the source and coordinate frame

- Identify the approved venue plan and its actual drawing revision, issue date,
  units, orientation, dimensions and coordinate datum. Compare the revision
  shown **on the drawing** with the project metadata; a project revision may
  describe a camera-plan issue rather than a venue-drawing issue. Resolve any
  discrepancy with the drawing owner before claiming that they match.
- Keep the native source and production evidence in an authorised location.
  Verify that any raster or model derivative is authorised and corresponds to
  the identified source. Record an unambiguous source reference, derivative
  revision and checksum in the controlled review record, not in a public link
  or repository containing private material.
- Identify what point each plotted coordinate represents. A ground camera's
  pan axis, a crane's post, a remote head and a roaming operator are different
  references. For a crane, review both the post location and the head position
  for the specified boom configuration. The camera number badge is an
  annotation, not a survey point.
- When transferring a position between drawings, establish the units and
  transformation using identifiable common control points distributed across
  the relevant area. Check additional independent points and the vertical
  datum; record residuals and the accepted tolerance. A visually plausible
  overlay, a single scale measurement, or the fit residual at the same points
  used to fit a transformation does not independently validate registration.
  Investigate cropping, rotation, mirroring, distortion and drawing changes.
  Do not apply a transformation where the source relationship is unknown.

## 2. Map identities before moving cameras

Create a controlled cross-reference with one row per **physical position**.
Include the director camera number, chain/source identity, primary or alternate
role, coverage call, supplier drawing identifier where known, source revision,
physical reference point and evidence. Supplier CAD numbers, equipment IDs,
position labels and director camera numbers are different namespaces; the same
number does not establish a match. A label such as “centre” is a coverage or
intent description, not proof of a particular geometric centre. Resolve
ambiguous mappings with the director, engineer and drawing owner.

One chain may have multiple mutually exclusive positions. Use **Create linked
alternate position** for an alternate of the same source; use **Duplicate as
new chain** or **Detach as new chain** only for a genuinely independent source.
Review primary/alternate assignments and the chain schedule against the actual
production schedule. Neither renumbering nor an automatically passing schedule
confirms the mapping. Keep superseded positions and their rationale in the
controlled revision record, rather than silently overwriting the evidence.

Record the physical support per position and the RF transport and TX/RX assignment per camera chain. [Rig and RF guide](MOUNT-PICTOGRAMS.md#place-a-rig-and-assign-its-link)

## 3. Review scale, position and pose separately

For each position, record the evidence, reviewer, date, status and any open
question for each of these independent checks:

| Check | Required evidence and decision |
| --- | --- |
| Plan scale and frame | Confirm units and a known dimension against the approved drawing, then check an independent dimension and coordinate reference. Record the method and tolerance. Scale confirmation alone does not locate a camera. |
| Position and role | Match the plotted reference point to the source and chain cross-reference; confirm primary or alternate and the planned physical location. Record offsets, assumptions and any change from the previous issue. |
| Pose and coverage | Confirm intended target, heading, lens height relative to the stated mount datum, floor elevation, tilt and roll. For moving supports include the relevant head and boom configuration. Check camera mode, active aperture, lens, extender, crop and focal length against the actual build. Defaults and nominal equipment figures are not measurements. |
| Physical feasibility | Review access, sightlines, obstructions, audience and production interfaces, support and operating envelopes, power and cable routes with the responsible teams. Obtain the appropriate venue, rigging and safety approvals separately. |

A useful review record states **unreviewed**, **proposed**, **verified against
identified evidence**, or **approved for a defined issue** for each check,
with the approving person's identity and the scope and date. It should also
record any rejection, uncertainty, tolerance and required follow-up. These are
workflow states in the controlled record; do not assume the application
persists per-position approval or an audit trail. Re-review affected checks when
the drawing, equipment, pose, source mapping or venue layout changes.

## 4. Survey and reconcile on site

Before installation, locate each axis or support datum against current surveyed
venue references. Independently verify coordinates, heights and accessible
space, and reconcile discrepancies with the drawing owner and production team.
Record actual as-built positions, lens heights and relevant boom settings in a
new controlled issue. Check moving paths and swept envelopes against the actual
installed environment; a plan glyph or an unclipped 3D ray is not a clearance or
rigging sign-off. Escalate conflicts instead of silently moving an approved
position. Confirm the director's shot and the operator's working position after
setup, since a geometric target is not a creative shot approval.

## 5. Use 3D and outputs responsibly

3D is an engineering preview, not a substitute for an up-to-date venue survey.
Without an appropriate venue model it cannot show the actual arena or prove a
sightline. With a model, record its source and revision, check its registration
against independent points and vertical datum, and check the camera pose and
optics independently. Omitted, transparent, moving or outdated objects may not
be represented. A frame inclusion or model intersection result applies only to
the supplied geometry and inputs; it does not approve visibility, rigging,
clearance or the final shot.

Before distribution, compare the issue, position and chain schedules, drawing
revision, visible labels and assumptions with the controlled review record.
Identify unreviewed content and missing models on the deliverable itself or in
an accompanying controlled issue note. Confirm output scale and print at 100%
when scale is required; a screenshot, resized image or printer fit-to-page can
invalidate a stated ratio. Share only approved derivatives through authorised
channels. A portable share link does not contain the venue drawing, 3D model,
chain interface details or verified model registration. An unlisted public link
is not a confidentiality boundary, and publishing a revision does not revoke
copies already distributed.
