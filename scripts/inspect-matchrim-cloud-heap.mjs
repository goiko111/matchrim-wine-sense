import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw Error('Pass a local Chrome heap snapshot and summary path');
const heap = JSON.parse(readFileSync(input, 'utf8'));
const { nodes, edges, strings, snapshot: { meta } } = heap;
const nodeWidth = meta.node_fields.length, edgeWidth = meta.edge_fields.length;
const field = Object.fromEntries(meta.node_fields.map((name, i) => [name, i]));
const edgeField = Object.fromEntries(meta.edge_fields.map((name, i) => [name, i]));
const types = meta.node_types[field.type], edgeTypes = meta.edge_types[edgeField.type];
const incoming = new Map(), counts = {}, targets = new Map(), detachedCounts = {};
const interesting = new Set(['HTMLLIElement', 'HTMLDivElement', 'HTMLInputElement', 'HTMLImageElement', 'HTMLCanvasElement', 'FileReader', 'FiberNode', 'EventListener', 'V8EventListener']);
for (let offset = 0, edgeOffset = 0; offset < nodes.length; offset += nodeWidth) {
  const name = strings[nodes[offset + field.name]], type = types[nodes[offset + field.type]];
  if (interesting.has(name)) {
    const key = type + ':' + name;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const nativeTag = type === 'native' && name.startsWith('<') ? name.match(/^<([a-zA-Z0-9]+)/)?.[1] : null;
  if ((interesting.has(name) || nativeTag) && ['object','native'].includes(type)) {
    const detachedness = field.detachedness === undefined ? 'unknown' : nodes[offset + field.detachedness];
    const key = type + ':' + (nativeTag ? '<' + nativeTag + '>' : name) + ':detached=' + detachedness;
    detachedCounts[key] = (detachedCounts[key] ?? 0) + 1;
    const samples = targets.get(key) ?? [];
    if (samples.length < 3) samples.push(offset);
    targets.set(key, samples);
  }
  for (let edge = 0; edge < nodes[offset + field.edge_count]; edge++, edgeOffset += edgeWidth) {
    const kind = edgeTypes[edges[edgeOffset + edgeField.type]];
    if (kind === 'weak') continue;
    const target = edges[edgeOffset + edgeField.to_node];
    const rawName = edges[edgeOffset + edgeField.name_or_index];
    const edgeName = ['element', 'hidden'].includes(kind) ? String(rawName) : strings[rawName];
    const refs = incoming.get(target) ?? [];
    refs.push({ source: offset, kind, name: edgeName }); incoming.set(target, refs);
  }
}
const node = offset => ({ offset, type: types[nodes[offset + field.type]], name: strings[nodes[offset + field.name]], detachedness: nodes[offset + field.detachedness] });
const retainerPath = start => {
  const queue = [{ offset: start, path: [node(start)] }], visited = new Set([start]);
  for (let index = 0; index < queue.length && index < 50000; index++) {
    const current = queue[index];
    if (current.offset === 0 || node(current.offset).name === '(GC roots)') return current.path;
    if (current.path.length > 14) continue;
    for (const ref of incoming.get(current.offset) ?? []) {
      if (visited.has(ref.source)) continue;
      visited.add(ref.source);
      queue.push({ offset: ref.source, path: [...current.path, { ...node(ref.source), edgeToPrevious: { type: ref.kind, name: ref.name } }] });
    }
  }
  return [{ ...node(start), rootPathNotFoundWithinBound: true, immediateRetainers: (incoming.get(start) ?? []).slice(0, 8).map(ref => ({ ...node(ref.source), edge: ref.name })) }];
};
const summary = { scope: 'Structured Chrome heap, strong edges only; not native memory certification', counts, detachedCounts, samplesByType: Object.fromEntries([...targets].map(([key, offsets]) => [key, offsets.map(retainerPath)])) };
writeFileSync(output, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
