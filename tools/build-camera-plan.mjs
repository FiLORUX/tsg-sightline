// File: tools/build-camera-plan.mjs
// Builds a camera plan project file from a rigging list, so a standing camera
// build can be regenerated for a new venue instead of being re-entered by hand.
// Headings and working distances are derived from each position's target rather
// than typed in, which keeps them coherent when a position is moved.
//
// Usage: node tools/build-camera-plan.mjs <output.json>

import { writeFileSync } from 'node:fs';

const SCALE = 20;
const SHEET = { width: 2400, height: 1600 };

const STAGE = { x: 1200, y: 300 };
const CASTER_DESK = { x: 450, y: 950 };
const ANALYST_DESK = { x: 450, y: 1150 };

const LENSES = {
  'UA107x8.4 BESM': { wide: 8.4, tele: 900 },
  'UA24x7.8 BERD': { wide: 7.8, tele: 187 },
  'UA14x4.5 BERD': { wide: 4.5, tele: 63 }
};

// Reach is quoted from the post as the manufacturers list it. Tail is the
// distance the counterweight trolley sits behind the post and sweeps.
const ARMS = {
  mb45: { min: 2.43, max: 13.77, base: 1.60, tail: 2.38 },
  jjt: { min: 9.10, max: 9.10, base: 1.50, tail: 2.10 }
};

const bearing = (from, to) =>
  ((Math.atan2(to.x - from.x, from.y - to.y) * 180) / Math.PI + 360) % 360;

const spacing = (from, to) => Math.hypot(to.x - from.x, to.y - from.y) / SCALE;

const project = (from, headingDeg, metres) => ({
  x: from.x + metres * SCALE * Math.sin((headingDeg * Math.PI) / 180),
  y: from.y - metres * SCALE * Math.cos((headingDeg * Math.PI) / 180)
});

const POSITIONS = [
  { number: '1',  label: 'Centre',       mount: 'tripodHeavy', lens: 'UA107x8.4 BESM', vf: 'Large VF',  at: { x: 1200, y: 1160 }, target: STAGE, height: 1.45 },
  { number: '2',  label: 'Crane Left',   mount: 'crane',       lens: 'UA14x4.5 BERD',  vf: 'HDVF-EL20', at: { x: 860,  y: 1080 }, target: STAGE, arm: 'mb45', swing: 150, height: 2.20 },
  { number: '3',  label: 'Crane Right',  mount: 'crane',       lens: 'UA14x4.5 BERD',  vf: 'HDVF-EL20', at: { x: 1540, y: 1080 }, target: STAGE, arm: 'mb45', swing: 150, height: 2.20 },
  { number: '4',  label: 'Sideline L',   mount: 'tripodHeavy', lens: 'UA107x8.4 BESM', vf: 'Large VF',  at: { x: 640,  y: 880 },  target: STAGE, height: 1.45 },
  { number: '5',  label: 'Sideline R',   mount: 'tripodHeavy', lens: 'UA107x8.4 BESM', vf: 'Large VF',  at: { x: 1760, y: 880 },  target: STAGE, height: 1.45 },
  { number: '6',  label: 'Steadicam',    mount: 'steadicam',   lens: 'UA14x4.5 BERD',  vf: 'HDVF-EL20', at: { x: 1000, y: 740 },  target: STAGE, throw: 10, roam: 10, rf: true, height: 1.60,
    path: [{ x: 1150, y: 690 }, { x: 1330, y: 760 }] },
  { number: '7',  label: 'Mobile 1',     mount: 'tripodEng',   lens: 'UA14x4.5 BERD',  vf: 'HDVF-EL20', at: { x: 760,  y: 560 },  target: STAGE, throw: 12, height: 1.40 },
  { number: '8',  label: 'Mobile 2',     mount: 'tripodEng',   lens: 'UA14x4.5 BERD',  vf: 'HDVF-EL20', at: { x: 1640, y: 560 },  target: STAGE, throw: 12, height: 1.40 },
  { number: '9',  label: 'Mobile 3',     mount: 'tripodEng',   lens: 'UA14x4.5 BERD',  vf: 'HDVF-EL20', at: { x: 830,  y: 1330 }, target: STAGE, throw: 12, height: 1.40 },
  { number: '10', label: 'Mobile 4',     mount: 'tripodEng',   lens: 'UA14x4.5 BERD',  vf: 'HDVF-EL20', at: { x: 1570, y: 1330 }, target: STAGE, throw: 12, height: 1.40 },
  { number: '11', label: 'Beauty',       mount: 'tripodEng',   lens: 'UA14x4.5 BERD',  vf: 'Large VF',  at: { x: 1200, y: 1500 }, target: STAGE, height: 1.55 },
  { number: '12', label: 'Studio L',     mount: 'tripodDolly', lens: 'UA24x7.8 BERD',  vf: 'Large VF',  at: { x: 300,  y: 1290 }, target: ANALYST_DESK, height: 1.40 },
  { number: '13', label: 'Studio C Jib', mount: 'jib',         lens: 'UA14x4.5 BERD',  vf: 'HDVF-EL20', at: { x: 450,  y: 1480 }, target: ANALYST_DESK, arm: 'jjt', swing: 120, height: 2.60 },
  { number: '14', label: 'Studio R',     mount: 'tripodDolly', lens: 'UA24x7.8 BERD',  vf: 'Large VF',  at: { x: 600,  y: 1290 }, target: ANALYST_DESK, height: 1.40 },
  { number: '15', label: 'Casters',      mount: 'tripodDolly', lens: 'UA24x7.8 BERD',  vf: 'Large VF',  at: { x: 450,  y: 790 },  target: CASTER_DESK, height: 1.40 }
];

const cameras = POSITIONS.map((position, index) => {
  const lens = LENSES[position.lens];
  const arm = position.arm ? ARMS[position.arm] : ARMS.mb45;
  const heading = bearing(position.at, position.target);

  // An arm carries the glass out to the head, so the working distance is taken
  // from there and not from the post the base occupies.
  const origin = position.arm ? project(position.at, heading, arm.max) : position.at;

  return {
    id: `cam-plan-${String(index + 1).padStart(2, '0')}`,
    number: position.number,
    label: position.label,
    mount: position.mount,
    body: 'HDC-3500',
    control: position.rf ? 'RCP (RF shading)' : 'HDCU + RCP-3500/1500',
    viewfinder: position.vf,
    lensName: position.lens,
    x: position.at.x,
    y: position.at.y,
    heading: Math.round(heading),
    imagerId: 'b4',
    imagerWidth: 9.59,
    wide: lens.wide,
    tele: lens.tele,
    throwMetres: position.throw || Math.round(spacing(origin, position.target)),
    height: position.height,
    reachMin: arm.min,
    reachMax: arm.max,
    reach: arm.max,
    tail: arm.tail,
    swing: position.swing || 180,
    baseSize: arm.base,
    roam: position.roam || 4,
    path: position.path || [],
    rf: Boolean(position.rf)
  };
});

const plan = {
  format: 'camera-plan/5',
  meta: {
    production: '15 camera build',
    venue: 'Venue to be confirmed',
    date: new Date().toISOString().slice(0, 10),
    revision: 'A',
    author: ''
  },
  content: SHEET,
  pxPerMetre: SCALE,
  calibrated: false,
  plotRatio: null,
  background: null,
  vector: null,
  logo: null,
  sheet: { paper: 'A3', ratio: 'fit' },
  cameras,
  dimensions: [],
  nextNumber: cameras.length + 1
};

const target = process.argv[2];
if (!target) {
  process.stderr.write('Usage: node tools/build-camera-plan.mjs <output.json>\n');
  process.exit(1);
}

writeFileSync(target, `${JSON.stringify(plan, null, 2)}\n`);
process.stdout.write(`Wrote ${cameras.length} positions to ${target}\n`);
