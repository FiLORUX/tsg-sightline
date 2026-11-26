# Spatial camera planning and previsualisation

The earlier roadmap (2026-09-30, scale assurance follow-up 2026-11-25) becomes an evidence-led implementation, not a generic CAD editor. The browser tool must remain local-first, offline-capable and production-specific CAD must not enter the public repository.

## P0 — scale and drawing evidence
Separate nominal, inferred/declared, operator-confirmed and reference-dimension calibrated scales. Record the source; invalidate evidence on plan/unit/scale changes. Dimensioned outputs require confirmed scale; otherwise label drafts NOT TO SCALE. INSUNITS and an operator-entered dimension are not independent survey data. Preserve v5 migration and share links without drawings.

## P1 — spatial core
Use a right-handed metric frame: sheet +X right, +Y up, +Z elevation; sheet north is not geographic north. Store mount pivot, mount datum, lens height, nominal optical origin, pan, tilt, roll and current focal length independently. On arms, separate boom heading from remote head pan; distinguish horizontal reach from actual boom length and the optical centre from the front-element proxy. Use active image aperture and aspect ratio for rectilinear pinhole HFOV/VFOV. Real lens distortion, breathing and extender/crop must be explicitly modelled or remain unknown.

Ingest static self-contained GLB 2.0 geometry (metres, Y-up; convert to Z-up), including hierarchical transforms and indexed triangles. Rigid registration against paired plan control points, report residuals without silently stretching the model. Validate against independent known dimensions and vertical datum. Native SKP/DWG/VWX conversion remains an authorised external workflow. See [Khronos glTF 2.0](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html). Never publish venue files or raw geometry in source control. Distinguish the source revision from the camera plot revision.

## P2 — views and geometry-based visibility
Synchronise 2D plot, venue overview and selected camera view. Render with a depth buffer, target frustum test and finite optical ray intersection against opaque model triangles. Missing geometry, audience, set changes and transparent surfaces invalidate any claim of real-world clearance. Optical visibility is not RF propagation. Validate model registration before showing an occlusion result. Use worker parsing, instanced GPU geometry, spatial index/BVH and measured performance budgets for large CAD exports; preserve WebGL 2 fallback. No photoreal or collision certification claims.

## P3 — production planning
Separate camera-chain identity, director camera number / UMD, coverage call and physical position or alternate. Track camera body, lens, mount, viewfinder, CCU, RCP/shading assignment, RF link, tally, return, intercom and handover format. Alternate handheld locations share the same chain, not additional concurrent feeds. Separate camera list, signal/interface schedule, source manifest, equipment provenance and open confirmations. ISO 8601 dates. Version-controlled plot and schedule; project-specific format (e.g. 1080p59.94 3G-SDI) is not a universal default.

Provide target volumes and sampled framing, camera paths, measured lens-height profiles, remote head orientation, crane extension, boom angle, counterweight sweep and supplier-specified base/outrigger geometry. Working envelope is not a load case. Separate optical, physical, RF, cable and egress evaluation. Supplier/rigging approval and venue access are authoritative, not software predictions.

## P4 — interoperability and release
GDTF/MVR interchange with UUIDs and transforms; distinguish fixture focus from camera coverage. Controlled private asset bundles, hashes, named coordinate frames, revision lineage and permission-scoped review. Keep original CAD immutable. Add browser regression, accessibility, offline/context-loss tests, real private venue benchmarks and production acceptance.

## Gates
- Numerical regression and DXF regression; malformed/unsupported asset tests; scale evidence and migration.
- Desktop/mobile browser smoke and interaction tests, including resize, keyboard, save/reopen, printing, GLB errors, cancellation, GPU context loss.
- Independent control points, lens/rig data and real model validation before production release.
- No customer data in public source, tests, logs, or CI artifacts.
