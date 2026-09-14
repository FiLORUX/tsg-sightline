// File: tools/test-dxf-parser.mjs
// Exercises the DXF reader that lives inside index.html without a browser. The
// reader is written free of DOM references between the "#region dxf" markers
// precisely so it can be lifted out and run here, where a wrong bulge sign or
// a mis-ordered insert transform fails loudly instead of drawing a door on
// the wrong side of a wall.
//
// Run: node tools/test-dxf-parser.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Values built inside the vm context carry that realm's prototypes, which
// strict deep equality rejects, so structures are compared as JSON.
const same = (actual, expected, message) =>
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const start = html.indexOf('// #region dxf');
const end = html.indexOf('// #endregion dxf');
assert.ok(start > 0 && end > start, 'the dxf region markers must exist in index.html');

const region = html.slice(start, end);
const { parseDxf, flattenDxf, guessDxfUnits } = vm.runInNewContext(
  `${region}\n;({ parseDxf, flattenDxf, guessDxfUnits })`, {}
);

// A DXF is a list of group code / value pairs, one per line. This helper keeps
// the fixtures readable: each argument is one pair.
const dxf = (...pairs) => pairs.map(([code, value]) => `${code}\n${value}`).join('\n') + '\n';

const fixture = dxf(
  [0, 'SECTION'], [2, 'HEADER'],
  [9, '$ACADVER'], [1, 'AC1027'],
  [9, '$INSUNITS'], [70, '4'],
  [0, 'ENDSEC'],
  [0, 'SECTION'], [2, 'TABLES'],
  [0, 'TABLE'], [2, 'LAYER'], [70, '3'],
  [0, 'LAYER'], [2, 'WALLS'], [70, '0'], [62, '7'],
  [0, 'LAYER'], [2, 'FURNITURE'], [70, '1'], [62, '3'],
  [0, 'LAYER'], [2, 'DOORS'], [70, '0'], [62, '1'],
  [0, 'ENDTAB'],
  [0, 'ENDSEC'],
  [0, 'SECTION'], [2, 'BLOCKS'],
  [0, 'BLOCK'], [8, '0'], [2, 'DOOR'], [70, '0'], [10, '0'], [20, '0'],
  [0, 'LINE'], [8, '0'], [10, '0'], [20, '0'], [11, '10'], [21, '0'],
  [0, 'ENDBLK'], [8, '0'],
  [0, 'ENDSEC'],
  [0, 'SECTION'], [2, 'ENTITIES'],
  // A wall from the origin to the right.
  [0, 'LINE'], [8, 'WALLS'], [10, '0'], [20, '0'], [11, '5000'], [21, '0'],
  // A closed square with a semicircular bulge on its first edge.
  [0, 'LWPOLYLINE'], [8, 'WALLS'], [90, '4'], [70, '1'],
  [10, '0'], [20, '1000'], [42, '1'],
  [10, '1000'], [20, '1000'],
  [10, '1000'], [20, '2000'],
  [10, '0'], [20, '2000'],
  // A circle and an arc.
  [0, 'CIRCLE'], [8, 'WALLS'], [10, '3000'], [20, '3000'], [40, '500'],
  [0, 'ARC'], [8, 'WALLS'], [10, '4000'], [20, '1000'], [40, '200'], [50, '0'], [51, '90'],
  // The door block inserted with rotation and scale on the DOORS layer.
  [0, 'INSERT'], [8, 'DOORS'], [2, 'DOOR'], [10, '1000'], [20, '2000'], [41, '2'], [42, '2'], [50, '90'],
  // A frozen layer, a paper-space entity and a text: none may draw.
  [0, 'LINE'], [8, 'FURNITURE'], [10, '0'], [20, '0'], [11, '99999'], [21, '99999'],
  [0, 'LINE'], [8, 'WALLS'], [67, '1'], [10, '0'], [20, '0'], [11, '-99999'], [21, '0'],
  [0, 'TEXT'], [8, 'WALLS'], [10, '10'], [20, '10'], [1, 'IGNORED'],
  // An old-style POLYLINE with two vertices.
  [0, 'POLYLINE'], [8, 'WALLS'], [66, '1'], [70, '0'],
  [0, 'VERTEX'], [8, 'WALLS'], [10, '100'], [20, '100'],
  [0, 'VERTEX'], [8, 'WALLS'], [10, '200'], [20, '100'],
  [0, 'SEQEND'], [8, 'WALLS'],
  [0, 'ENDSEC'],
  [0, 'EOF']
);

const parsed = parseDxf(fixture);
assert.equal(parsed.units, 4, 'header units are read');
assert.equal(parsed.layers.size, 3, 'three layers in the table');
assert.equal(parsed.layers.get('FURNITURE').frozen, true, 'frozen flag is read');
assert.equal(parsed.blocks.get('DOOR').entities.length, 1, 'block content is read');
assert.equal(parsed.entities.filter((e) => e.type === 'TEXT').length, 0, 'text is not an entity we keep');

const flat = flattenDxf(parsed);
const layer = (name) => flat.layers.find((item) => item.name === name);

same(flat.layers.map((item) => item.name), ['DOORS', 'FURNITURE', 'WALLS'], 'layers sorted by name');
assert.equal(layer('FURNITURE').visible, false, 'frozen layer starts hidden');
assert.equal(layer('WALLS').visible, true);
assert.equal(flat.units, 'mm', 'unit code 4 is millimetres');
assert.equal(guessDxfUnits(flat), 'mm');

// Paper-space entity was skipped: nothing on WALLS reaches x = -99999.
const wallsMinX = Math.min(...layer('WALLS').paths.flatMap((p) => p.filter((_, i) => i % 2 === 0)));
assert.equal(wallsMinX, 0, 'paper space geometry is ignored');

// The bulge: from (0,1000) to (1000,1000) with bulge 1 is an anticlockwise
// semicircle, so it passes below the chord through (500, 500).
const square = layer('WALLS').paths.find((p) => p[0] === 0 && p[1] === 1000);
assert.ok(square, 'the polyline starts at its first vertex');
const midIndex = square.findIndex((v, i) => i % 2 === 0 && Math.abs(v - 500) < 1);
assert.ok(midIndex >= 0, 'the arc passes x = 500');
assert.ok(Math.abs(square[midIndex + 1] - 500) < 1, `arc midpoint y should be 500, got ${square[midIndex + 1]}`);
assert.equal(square[square.length - 2], 0, 'closed polyline returns to its start x');
assert.equal(square[square.length - 1], 1000, 'closed polyline returns to its start y');

// The insert: the block line from (0,0) to (10,0), scaled 2 and rotated 90
// degrees anticlockwise, lands from (1000,2000) to (1000,2020).
const door = layer('DOORS').paths[0];
same(door.slice(0, 2), [1000, 2000], 'insert start point');
assert.ok(Math.abs(door[2] - 1000) < 1e-6 && Math.abs(door[3] - 2020) < 1e-6,
  `insert end point should be (1000, 2020), got (${door[2]}, ${door[3]})`);

// Circle and arc tessellate to closed and quarter runs of the right radius.
const circle = layer('WALLS').paths.find((p) => p.length > 60 && Math.abs(p[0] - 3500) < 1e-6);
assert.ok(circle, 'circle starts at angle zero on its radius');
assert.ok(Math.abs(circle[circle.length - 2] - 3500) < 1e-6, 'circle closes on itself');
const arc = layer('WALLS').paths.find((p) => Math.abs(p[0] - 4200) < 1e-6 && Math.abs(p[1] - 1000) < 1e-6);
assert.ok(arc, 'arc starts at its start angle');
assert.ok(Math.abs(arc[arc.length - 2] - 4000) < 1e-6 && Math.abs(arc[arc.length - 1] - 1200) < 1e-6,
  'arc ends at ninety degrees');

// The old POLYLINE/VERTEX form is read as a polyline.
assert.ok(layer('WALLS').paths.some((p) => p[0] === 100 && p[1] === 100 && p[2] === 200), 'POLYLINE vertices are read');

// Bounds cover only the visible layers.
same(flat.bounds, { minX: 0, minY: 0, maxX: 5000, maxY: 3500 }, 'bounds from visible geometry');

// Binary files and empty files are refused with a reason.
assert.throws(() => parseDxf('AutoCAD Binary DXF\r\n\x1a\x00'), /Binary DXF/);
assert.throws(() => flattenDxf(parseDxf(dxf([0, 'SECTION'], [2, 'ENTITIES'], [0, 'ENDSEC'], [0, 'EOF']))), /No visible linework/);

process.stdout.write('DXF reader: all assertions passed\n');
