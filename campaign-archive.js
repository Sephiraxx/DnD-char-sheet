/* Copia de preparación del DM. Los ids de los mapas se regeneran al importar. */
(function (root) {
  'use strict';
  const format = 'dnd-campaign-archive';
  const MAX_FILE = 128 * 1024 * 1024;
  const MAX_IMAGE = 10 * 1024 * 1024;
  const imagePattern = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
  const object = x => x && typeof x === 'object' && !Array.isArray(x);
  const text = (x, max) => typeof x === 'string' && x.length <= max;
  const array = (x, max) => Array.isArray(x) && x.length <= max;
  const mapFields = m => ({ name: m.name, grid: m.grid, terrain: m.terrain, fog: m.fog, sort: m.sort });
  const homebrewFields = h => ({ kind: h.kind, name: h.name, data: h.data });
  const tokenFields = t => ({
    map_id: t.map_id,
    kind: t.kind,
    name: t.name,
    label: t.label,
    color: t.color,
    x: t.x,
    y: t.y,
    size: t.size,
    hidden: t.hidden,
    stage: t.stage || null,
    elev: t.elev || 0,
  });

  function validate(archive) {
    const invalid = () => {
      throw Error('El archivo no es una copia de campaña válida.');
    };
    if (
      !object(archive) ||
      archive.format !== format ||
      archive.version !== 1 ||
      !text(archive.name, 100) ||
      !archive.name.trim() ||
      !object(archive.settings) ||
      !array(archive.maps, 200) ||
      !array(archive.tokens, 2000) ||
      !array(archive.homebrew, 500) ||
      !array(archive.prepared, 500)
    )
      invalid();
    const npcIds = new Set();
    if (!array(archive.npcs ?? [], 500)) invalid();
    for (const npc of archive.npcs || []) {
      if (
        !object(npc) ||
        !text(npc.id, 100) ||
        !npc.id ||
        npcIds.has(npc.id) ||
        !object(npc.data) ||
        (npc.data.friendlyNpc === true) === (npc.data.enemyNpc === true)
      )
        invalid();
      root.Rules.validate(structuredClone(npc.data));
      npcIds.add(npc.id);
    }
    const ids = new Set();
    for (const m of archive.maps) {
      if (
        !object(m) ||
        !text(m.id, 100) ||
        !m.id ||
        ids.has(m.id) ||
        !text(m.name, 100) ||
        !m.name.trim() ||
        !object(m.grid) ||
        !object(m.terrain) ||
        !object(m.fog) ||
        !Number.isInteger(m.sort)
      )
        invalid();
      ids.add(m.id);
      if (m.image != null) {
        const match = text(m.image, Math.ceil(MAX_IMAGE / 3) * 4 + 40) && imagePattern.exec(m.image);
        if (!match || atob(match[2]).length > MAX_IMAGE) invalid();
      }
    }
    if (archive.active != null && !ids.has(archive.active)) invalid();
    for (const t of archive.tokens)
      if (
        !object(t) ||
        !ids.has(t.map_id) ||
        !['npc', 'object', 'monster'].includes(t.kind) ||
        (t.kind === 'monster' && !t.stage?.startsWith?.('enc:')) ||
        !text(t.name, 100) ||
        !t.name.trim() ||
        !text(t.label, 8) ||
        !text(t.color, 20) ||
        ![t.x, t.y, t.size].every(Number.isFinite) ||
        typeof t.hidden !== 'boolean' ||
        (t.stage != null && !text(t.stage, 120)) ||
        !Number.isInteger(t.elev)
      )
        invalid();
    for (const h of archive.homebrew)
      if (
        !object(h) ||
        !['item', 'spell', 'rule'].includes(h.kind) ||
        !text(h.name, 150) ||
        !h.name.trim() ||
        !object(h.data)
      )
        invalid();
    for (const e of archive.prepared)
      if (
        !object(e) ||
        !text(e.id, 100) ||
        !e.id ||
        !text(e.name, 80) ||
        !e.name.trim() ||
        !text(e.notes ?? '', 16000) ||
        !array(e.monsters, 500) ||
        e.monsters.some(
          m => !object(m) || !text(m.name, 100) || !text(m.uid, 100) || (m.npcId != null && !npcIds.has(m.npcId)),
        )
      )
        invalid();
    return archive;
  }

  function imageData(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error('No se pudo leer una imagen del tablero.'));
      reader.readAsDataURL(blob);
    });
  }

  async function build(id, prepared) {
    const p = await root.Cloud.party(id);
    if (!p.viewerIsDM) throw Error('Solo el DM puede descargar esta copia.');
    const b = await root.Cloud.board(id);
    const npcs = [...(p.characters || []), ...(p.enemyNpcs || [])]
      .filter(
        row => row.owner_id === p.campaign.dm_id && (row.data?.friendlyNpc === true || row.data?.enemyNpc === true),
      )
      .map(row => ({ id: row.id, data: row.data }));
    const npcIds = new Set(npcs.map(npc => npc.id));
    const encounters = prepared.map(e => ({ ...e, monsters: e.monsters.filter(m => !m.npcId || npcIds.has(m.npcId)) }));
    const stages = new Set(encounters.flatMap(e => e.monsters.map(m => 'enc:' + e.id + ':' + m.uid)));
    const maps = [];
    for (const m of b.maps) {
      const image = m.image_path ? await imageData(await root.Cloud.downloadMapImage(m.image_path)) : null;
      maps.push({ id: m.id, ...mapFields(m), image });
    }
    return validate({
      format,
      version: 1,
      name: p.campaign.name,
      settings: { ...p.campaign.settings, session: null },
      maps,
      active: b.board?.map_id || null,
      tokens: b.tokens.flatMap(t => {
        if (t.stage?.startsWith('enc:'))
          return stages.has(t.stage) ? [{ ...tokenFields(t), kind: 'monster', hidden: true }] : [];
        if (t.character_id) return [];
        return !t.combatant_id && ['npc', 'object'].includes(t.kind) ? [tokenFields(t)] : [];
      }),
      homebrew: p.homebrew.map(homebrewFields),
      prepared: encounters,
      npcs,
    });
  }

  async function restore(archive, name) {
    validate(archive);
    if (!text(name, 100) || !name.trim()) throw Error('Elegí un nombre para la mesa nueva.');
    const cloud = root.Cloud;
    const campaign = await cloud.createCampaign(name.trim(), 'DM');
    const ids = new Map(archive.maps.map(m => [m.id, crypto.randomUUID()]));
    const images = [];
    const preparedKey = 'dnd-dm-prepared-' + campaign.id;
    try {
      const maps = [];
      for (const m of archive.maps) {
        let image_path = null;
        if (m.image) {
          const [, ext, base64] = imagePattern.exec(m.image);
          const blob = new Blob([Uint8Array.from(atob(base64), c => c.charCodeAt(0))], { type: 'image/' + ext });
          image_path = await cloud.uploadMapImage(campaign.id, blob, ext);
          images.push(image_path);
        }
        const links = Object.fromEntries(
          Object.entries(m.terrain.links || {})
            .filter(([, id]) => ids.has(id))
            .map(([cell, id]) => [cell, ids.get(id)]),
        );
        maps.push({ id: ids.get(m.id), ...mapFields(m), terrain: { ...m.terrain, links }, image_path });
      }
      await cloud.restoreCampaignArchive(campaign.id, {
        settings: { ...cloud.cleanSettings(archive.settings), session: null },
        maps,
        tokens: archive.tokens.map(t => ({ ...tokenFields(t), map_id: ids.get(t.map_id) })),
        homebrew: archive.homebrew.map(homebrewFields),
        active: ids.get(archive.active) || null,
      });
      const npcIds = new Map();
      for (const npc of archive.npcs || []) {
        const data = root.Rules.validate(structuredClone(npc.data));
        data.combatState = root.Combat.fresh();
        delete data.dmCommandsApplied;
        const id = data.enemyNpc
          ? await cloud.createEnemyNpc(campaign, data)
          : (await cloud.createFriendlyNpc(campaign, data)).id;
        npcIds.set(npc.id, id);
      }
      localStorage.setItem(
        preparedKey,
        JSON.stringify(
          archive.prepared.map(e => ({
            ...e,
            launched: false,
            monsters: e.monsters.map(m => (m.npcId ? { ...m, npcId: npcIds.get(m.npcId) } : m)),
          })),
        ),
      );
      return campaign;
    } catch (error) {
      try {
        localStorage.removeItem(preparedKey);
        if (images.length) await cloud.removeMapImages(images);
        await cloud.deleteCampaign(campaign.id);
      } catch {
        throw Error(error.message + ' Quedó una copia incompleta de la mesa nueva: ' + name + '.');
      }
      throw error;
    }
  }

  root.CampaignArchive = { MAX_FILE, validate, build, restore };
})(typeof window !== 'undefined' ? window : globalThis);
