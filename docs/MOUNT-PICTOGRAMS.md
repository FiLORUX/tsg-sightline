# Mount pictograms

Sightline uses two deliberately separate drawing conventions.

- The mount picker and camera-list pictograms use 64 × 48 elevation-style drawings, with a consistent 2.2-unit line weight, restrained tonal fill, complete labels and a high-contrast selected state. Hue is a secondary family cue.
- The plan and its legend use oriented plan-view schematic glyphs. Neutral linework improves contrast on CAD and in monochrome output. Camera numbers, RF and alternate-position state remain annotations; metric footprint and optical frustum remain independent.
- A wheeled tripod dolly is not a pulley. The stable mount IDs and all project coordinates, camera profiles, scale, optical calculations and share formats remain unchanged.

The twelve symbols are original technical pictograms, not an asserted EBU/IEC standard or exact equipment drawings. Their geometry is deliberately schematic. Do not use them as mechanical dimensions or certified rigging envelopes.

Browser regression verifies all twelve distinct SVGs, bounds, labels and keyboard-accessible native buttons. The app's existing plan/export, context and optical tests remain release gates.

## Grip mechanics and evidence

Legacy mount IDs remain placement templates. Grip assembly metadata separates the selected support, head and supplier/installed configuration. Manufacturer links are references, not proof of a configured build. A new optional spatial boom model uses measured pivot-to-head length, elevation, pivot height, vertical head/lens offset and rear length; fixed jibs cannot telescope. Legacy projects preserve their horizontal reach. Plan projection, lens elevation and head pan are separated; the projected envelope is only a fixed-elevation slice, not a swept 3D volume. Free-roaming vehicles, cable cameras, gimbals and lift systems can be documented as custom supports but are not dynamically simulated. Unknown special supports have schematic point graphics only. No payload/CoG, cable tension, dynamic balance, braking, wind load or clearance sign-off is asserted.
