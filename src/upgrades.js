function existingWeight(level) {
  return Math.max(1.2, 3 - (level - 1) * 0.35);
}

function generateChoices(player) {
  const candidates = [];

  for (const w of player.weapons) {
    const def = weaponDef(w.id);
    if (w.level < def.maxLevel) {
      candidates.push({ type: "weapon", id: w.id, isNew: false, weight: existingWeight(w.level) });
    }
  }

  for (const w of player.weapons) {
    const def = weaponDef(w.id);
    if (def.evo && w.level >= def.maxLevel && !w.evolved && player.skillLevel(def.evo.requires) > 0) {
      candidates.push({ type: "evo", id: w.id, weight: 6 });
    }
  }

  for (const s of player.passives) {
    const def = skillDef(s.id);
    if (s.level < def.maxLevel) {
      candidates.push({ type: "skill", id: s.id, isNew: false, weight: existingWeight(s.level) });
    }
  }

  const ownedWeapons = player.weapons.map(w => w.id);
  if (player.weapons.length < CONFIG.player.maxWeapons) {
    for (const id in CONFIG.weapons) {
      if (!ownedWeapons.includes(id)) {
        candidates.push({ type: "weapon", id: id, isNew: true, weight: 2 });
      }
    }
  }

  const ownedSkills = player.passives.map(s => s.id);
  if (player.passives.length < CONFIG.player.maxPassives) {
    for (const id in CONFIG.skills) {
      if (!ownedSkills.includes(id)) {
        candidates.push({ type: "skill", id: id, isNew: true, weight: 2 });
      }
    }
  }

  const choices = [];
  const pool = candidates.slice();
  while (choices.length < 3 && pool.length > 0) {
    let total = 0;
    for (const c of pool) total += c.weight;
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= pool[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    const picked = pool.splice(idx, 1)[0];
    choices.push(enrichChoice(player, picked));
  }

  return choices;
}

function enrichChoice(player, c) {
  if (c.type === "evo") {
    return { type: "evo", id: c.id, isNew: false };
  }
  if (c.isNew) {
    return { type: c.type, id: c.id, isNew: true, currentLevel: 0, nextLevel: 1 };
  }
  const existing = c.type === "weapon"
    ? player.weapons.find(w => w.id === c.id)
    : player.passives.find(s => s.id === c.id);
  return {
    type: c.type, id: c.id, isNew: false,
    currentLevel: existing.level,
    nextLevel: existing.level + 1,
  };
}

function applyUpgrade(game, choice) {
  const player = game.player;
  if (choice.type === "evo") {
    const w = player.weapons.find(w => w.id === choice.id);
    if (w) w.evolved = true;
  } else if (choice.type === "weapon") {
    if (choice.isNew) {
      player.weapons.push(createWeapon(choice.id));
    } else {
      const w = player.weapons.find(w => w.id === choice.id);
      if (w) w.level++;
    }
  } else {
    if (choice.isNew) {
      player.passives.push(createSkill(choice.id));
    } else {
      const s = player.passives.find(s => s.id === choice.id);
      if (s) s.level++;
    }
    if (choice.id === "toughness") {
      player.hp = Math.min(player.hp + 30, player.maxHp);
    }
  }
  player.applyMaxHpChange();
  UI.refreshBuild(game);
}
