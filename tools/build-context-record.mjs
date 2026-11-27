// Build the private context record for an authorised revision migration.
//
// Usage:
//   node tools/build-context-record.mjs <shared-link-or-fragment> <later-revision-project.json> <out-dir> [--scale <px/m>] [--chains <n>] [--positions <n>]
//
// Output (in <out-dir>, never inside the repository):
//   <digest>.json   the record served at /sightline/context/<digest>.json
//
// The digest is the SHA-256 of the exact text after "#plan=", the same key the
// browser derives. The record names the exact frame of the distributed link it
// may replace; the viewer refuses any other. Nothing here is committed: the
// later project holds the venue drawing and stays private.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args.splice(i, 2)[1]; };
const expectedScale = option('--scale'), expectedChains = option('--chains'), expectedPositions = option('--positions');
const [linkArg, projectPath, outDir] = args;
if (!linkArg || !projectPath || !outDir) { console.error('Usage: build-context-record.mjs <link> <project.json> <out-dir> [--scale n] [--chains n] [--positions n]'); process.exit(2); }

const fail = (message) => { console.error('FAIL: ' + message); process.exit(1); };
const payload = linkArg.includes('#plan=') ? linkArg.split('#plan=')[1] : linkArg.replace(/^#?plan=/, '');
if (!/^d\.[A-Za-z0-9_-]+$/.test(payload)) fail('The link does not carry a compressed d. plan fragment');
const digest = createHash('sha256').update(payload).digest('hex');

const earlier = JSON.parse(inflateRawSync(Buffer.from(payload.slice(2), 'base64url')).toString('utf8'));
const later = JSON.parse(await readFile(projectPath, 'utf8'));
const source = later.format === 'sightline-context/1' || later.format === 'sightline-context/2' ? later.project : later;

if (!/^camera-plan\/[1-6]$/.test(source?.format)) fail('Not a Sightline project');
if (!(Number(source.pxPerMetre) > 0)) fail('The later project has no scale');
if (expectedScale && Math.abs(Number(source.pxPerMetre) - Number(expectedScale)) > 1e-8) fail(`Scale ${source.pxPerMetre} differs from the expected ${expectedScale}`);
if (String(source.meta?.revision) === String(earlier.meta?.revision)) fail('The later project has the same revision as the link');
for (const key of ['production', 'venue']) if (String(source.meta?.[key]) !== String(earlier.meta?.[key])) fail(`Drawing identity differs: ${key}`);
if (!source.background && !source.vector) fail('The later project carries no drawing');

const laterIds = new Map(source.cameras.map((c) => [String(c.id), c]));
for (const camera of earlier.cameras) if (!laterIds.has(String(camera.id))) fail(`Position ${camera.id} is missing from the later project`);
const earlierIds = new Set(earlier.cameras.map((c) => String(c.id)));
for (const camera of source.cameras) if (!earlierIds.has(String(camera.id)) && camera.positionRole !== 'alternate') fail(`Unexpected position ${camera.id}`);
const chains = new Set(source.cameras.map((c) => String(c.chainId || c.id)));
if (expectedChains && chains.size !== Number(expectedChains)) fail(`${chains.size} chains, expected ${expectedChains}`);
if (expectedPositions && source.cameras.length !== Number(expectedPositions)) fail(`${source.cameras.length} positions, expected ${expectedPositions}`);

const record = {
  format: 'sightline-context/2',
  migration: {
    from: { revision: earlier.meta.revision, content: earlier.content, pxPerMetre: earlier.pxPerMetre },
    to: { revision: source.meta.revision, pxPerMetre: source.pxPerMetre },
  },
  project: source,
};
const text = JSON.stringify(record);
if (Buffer.byteLength(text) > 24 * 1024 * 1024) fail('Record exceeds the 24 MiB limit enforced by the origin');
await writeFile(join(outDir, digest + '.json'), text);
console.log(JSON.stringify({
  digest, bytes: Buffer.byteLength(text), from: record.migration.from.revision, to: record.migration.to.revision,
  pxPerMetre: source.pxPerMetre, chains: chains.size, positions: source.cameras.length,
  alternates: source.cameras.filter((c) => c.positionRole === 'alternate').length,
}, null, 2));
