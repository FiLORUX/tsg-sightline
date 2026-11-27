# Mount pictograms

Sightline uses two deliberately separate drawing conventions.

- Version 03 uses 64 × 48 filled elevation silhouettes, negative-space counters, shared payload geometry, complete labels and a high-contrast monochrome selected state. The editable registry is `assets/rig-pictograms-03.json`; the single-file app embeds the same registry.
- The plan and its legend use oriented plan-view schematic glyphs. Neutral linework improves contrast on CAD and in monochrome output. Camera numbers, RF and alternate-position state remain annotations; metric footprint and optical frustum remain independent.
- A wheeled tripod dolly is not a pulley. The stable mount IDs and all project coordinates, camera profiles, scale, optical calculations and share formats remain unchanged.

The sixteen symbols are original technical pictograms, not an asserted EBU/IEC standard or exact equipment drawings. Their geometry is deliberately schematic. Do not use them as mechanical dimensions or certified rigging envelopes.

Browser regression verifies all twelve distinct SVGs, bounds, labels and keyboard-accessible native buttons. The app's existing plan/export, context and optical tests remain release gates.

## Grip mechanics and evidence

Legacy mount IDs remain placement templates. Grip assembly metadata separates the selected support, head and supplier/installed configuration. Manufacturer links are references, not proof of a configured build. A new optional spatial boom model uses measured pivot-to-head length, elevation, pivot height, vertical head/lens offset and rear length; fixed jibs cannot telescope. Legacy projects preserve their horizontal reach. Plan projection, lens elevation and head pan are separated; the projected envelope is only a fixed-elevation slice, not a swept 3D volume. Free-roaming vehicles, cable cameras, gimbals and lift systems can be documented as custom supports but are not dynamically simulated. Unknown special supports have schematic point graphics only. No payload/CoG, cable tension, dynamic balance, braking, wind load or clearance sign-off is asserted.

Version 03 retains twelve existing placement templates. The four additional pictograms (gimbal, robotic dolly, cable camera and vertical lift) are displayed for their existing custom support-system selections in the grip editor and camera list. They do not silently introduce new mount IDs, dynamics, movement limits or certified footprints. Plan-view glyphs remain separate.
