// Exporta las esculturas de la app como archivos GLB editables para Blender.
const fs = require('node:fs');
const path = require('node:path');
for (const file of [
  'miniature-mesh',
  'miniature-ancestries',
  'miniature-wardrobe',
  'miniatures',
  'campaign-mini-models',
  'campaign-miniatures',
  'creature-miniatures',
])
  require('../' + file);
const { Miniatures, CreatureMiniatures } = globalThis;
const samples = require('./miniature-samples.json');
const sizes = CreatureMiniatures.footprints;

const linear = byte => {
  const s = byte / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
function align(buffer, pad) {
  return Buffer.concat([buffer, Buffer.alloc((4 - (buffer.length % 4)) % 4, pad)]);
}
function exportModel(record) {
  const { miniature, modelKey = record.id, ...metadata } = record;
  if (miniature) metadata.appearance = Miniatures.appearanceKey(miniature);
  const sections = [new Map(), new Map(), new Map()];
  const ctx = {
    miniBoard: true,
    captureMesh(points, material, base) {
      const surface = typeof material === 'string' ? { color: material } : material;
      const { color, shine = 0, alpha = 1, emission = 0, metallic = 0, roughness = shine ? 0.48 : 0.86 } = surface;
      const key = JSON.stringify([color, metallic, Math.round(alpha * 100) / 100, emission, roughness]);
      const section = sections[base ? 0 : surface.stand ? 2 : 1];
      const vertices = section.get(key) || [];
      if (!section.has(key)) section.set(key, vertices);
      for (let i = 1; i < points.length - 1; i++) {
        const tri = [points[0], points[i], points[i + 1]];
        for (const p of tri) vertices.push(...p);
      }
    },
  };
  if (miniature) Miniatures.draw(ctx, miniature, Miniatures.boardCell);
  else CreatureMiniatures.draw(ctx, modelKey, Miniatures.boardCell, record);

  const gltf = {
    asset: { version: '2.0', generator: 'Cuaderno de aventura' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [
      { name: record.name, extras: metadata, children: [1, 2] },
      { name: 'Base', mesh: 0, extras: { role: 'base' } },
      { name: 'Figure', mesh: 1, extras: record.id === 'ghost' ? { no_contact_shadow: true } : {} },
    ],
    meshes: [],
    materials: [],
    accessors: [],
    bufferViews: [],
    buffers: [],
  };
  if (sections[2].size) {
    gltf.nodes[0].children.push(3);
    gltf.nodes.push({ name: 'Stand', mesh: 2, extras: { role: 'stand' } });
  } else sections.pop();
  const chunks = [];
  let byteLength = 0;
  for (const section of sections) {
    const primitives = [];
    for (const [key, vertices] of section) {
      if (!vertices.length) continue;
      const data = Buffer.alloc(vertices.length * 4);
      const min = [Infinity, Infinity, Infinity],
        max = [-Infinity, -Infinity, -Infinity];
      for (let j = 0; j < vertices.length; j++) {
        const axis = j % 3,
          value = Math.fround(vertices[j]);
        min[axis] = Math.min(min[axis], value);
        max[axis] = Math.max(max[axis], value);
        data.writeFloatLE(value, j * 4);
      }
      const view =
        gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: data.length, target: 34962 }) - 1;
      chunks.push(data);
      byteLength += data.length;
      const position =
        gltf.accessors.push({
          bufferView: view,
          componentType: 5126,
          count: vertices.length / 3,
          type: 'VEC3',
          min,
          max,
        }) - 1;
      const [color, metallic, alpha, emission, roughness] = JSON.parse(key);
      const rgb = [1, 3, 5].map(offset => linear(parseInt(color.slice(offset, offset + 2), 16)));
      const finish = {
        name: color,
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [...rgb, alpha],
          metallicFactor: metallic,
          roughnessFactor: roughness,
        },
        ...(alpha < 1 ? { alphaMode: 'BLEND' } : {}),
        ...(emission ? { emissiveFactor: rgb.map(value => Math.min(1, value * emission)) } : {}),
      };
      const material = gltf.materials.push(finish) - 1;
      primitives.push({ attributes: { POSITION: position }, material });
    }
    if (!primitives.length) throw Error('Modelo incompleto: ' + record.id);
    gltf.meshes.push({ primitives });
  }
  gltf.buffers.push({ byteLength });
  const body = align(Buffer.from(JSON.stringify(gltf)), 32);
  const header = Buffer.alloc(12);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + body.length + byteLength, 8);
  const jsonChunk = Buffer.alloc(8),
    binChunk = Buffer.alloc(8);
  jsonChunk.writeUInt32LE(body.length, 0);
  jsonChunk.write('JSON', 4);
  binChunk.writeUInt32LE(byteLength, 0);
  binChunk.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonChunk, body, binChunk, ...chunks]);
}

const folder = path.resolve(process.argv[2] || '.tmp-test/mini-models');
fs.mkdirSync(folder, { recursive: true });
const expandForms = id => [
  CreatureMiniatures.metadata(id),
  ...CreatureMiniatures.forms(id)
    .filter(({ age }) => age !== 'young')
    .map(form => ({
      ...CreatureMiniatures.metadata(id, form),
      id: id + '-' + (form.age || form.variant),
      modelKey: id,
    })),
];
const models = process.argv.includes('--dragons')
  ? CreatureMiniatures.groups.Dragones.flatMap(expandForms)
  : process.argv.includes('--catalogue')
    ? [
        ...samples.filter(model => model.miniature),
        ...Object.keys(CreatureMiniatures.options)
          .filter(id => id !== 'sigil')
          .flatMap(expandForms),
      ]
    : samples;
for (const model of models) {
  if (!sizes[model.size]) throw Error('Escala desconocida: ' + model.id);
  fs.writeFileSync(path.join(folder, model.id + '.glb'), exportModel(model));
}
console.log('GLB:', models.length, folder);
