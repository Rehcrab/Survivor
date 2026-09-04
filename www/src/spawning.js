function difficultyMult(game) {
  const t = game.time;
  const min = t / 60;
  const d = CONFIG.difficulty;
  return {
    hp: 1 + min * d.hpGrowth,
    dmg: 1 + min * d.damageGrowth,
    speed: 1 + Math.min(min, 6) * d.speedGrowth,
    eliteChance: Math.min(0.05 + min * 0.012, 0.16),
  };
}

function spawnInterval(game) {
  const d = CONFIG.difficulty;
  const p = clamp(game.time / 600, 0, 1);
  return lerp(d.spawnIntervalMax, d.spawnIntervalMin, p) / ChallengeRun.spawnRateMult();
}

function maxEnemies(game) {
  const d = CONFIG.difficulty;
  const p = clamp(game.time / 600, 0, 1);
  return Math.floor(lerp(d.maxEnemiesMin, d.maxEnemiesMax, p) * ChallengeRun.enemyCapMult());
}

function chooseEnemyType(game) {
  const m = game.time / 60;
  const pool = [["basic", 10]];
  if (m >= 1) pool.push(["runner", Math.min(4 + m, 9)]);
  if (m >= 3) pool.push(["tank", Math.min(2 + m * 0.5, 6)]);
  if (m >= 4) pool.push(["ranged", Math.min(1.5 + m * 0.4, 5)]);
  if (m >= 2) pool.push(["swarm", 2]);
  if (m >= 8) pool.push(["ranged", 3], ["tank", 3]);

  for (const p of CONFIG.progression) {
    if (game.time >= p.time) pool.push([p.type, p.weight]);
  }

  let total = 0;
  for (const p of pool) total += p[1];
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p[1];
    if (r <= 0) return p[0];
  }
  return "basic";
}

function zoneAt(game, x, y) {
  const nx = (x - game.arenaHalfW) / (2 * game.arenaHalfW);
  const ny = (y + game.arenaHalfH) / (2 * game.arenaHalfH);
  const t = Math.hypot(nx, ny);
  if (t < CONFIG.world.zoneHard) return "hard";
  if (t < CONFIG.world.zoneMedium) return "medium";
  return "easy";
}

function zoneModifiers(zone) {
  switch (zone) {
    case "easy": return { hp: 0.9, dmg: 0.95 };
    case "medium": return { hp: 1.1, dmg: 1.05 };
    case "hard": return { hp: 1.25, dmg: 1.15 };
    default: return { hp: 1, dmg: 1 };
  }
}

function spawnerEnemyType(game, zone) {
  const m = game.time / 60;
  const intro = zone === "hard" ? 0.6 : zone === "medium" ? 0.8 : 1;
  const pool = [["basic", 10]];
  if (m >= 0.8 * intro) pool.push(["runner", 3]);
  if (m >= 2 * intro) pool.push(["swarm", 2]);
  if (m >= 2.5 * intro) pool.push(["tank", 2 + (zone === "hard" ? 2 : 0)]);
  if (m >= 3.5 * intro) pool.push(["ranged", 2 + (zone === "hard" ? 1 : 0)]);
  if (zone === "hard") {
    if (m >= 15) pool.push(["warden", 1]);
    if (m >= 20) pool.push(["tyrant", 1]);
    if (m >= 25) pool.push(["leviathan", 1]);
    if (m >= 30) pool.push(["overlord", 1]);
  }
  let total = 0;
  for (const p of pool) total += p[1];
  let r = Math.random() * total;
  for (const p of pool) { r -= p[1]; if (r <= 0) return p[0]; }
  return "basic";
}

function spawnerEliteChance(game, zone) {
  const base = difficultyMult(game).eliteChance;
  if (zone === "easy") return base * 0.5;
  if (zone === "medium") return base;
  return Math.min(base * 1.6, 0.3);
}

function spawnEnemy(game, type, x, y, opts) {
  opts = opts || {};
  if (game.enemies.length >= maxEnemies(game)) return null;
  const d = difficultyMult(game);
  const z = zoneModifiers(zoneAt(game, x, y));
  const e = createEnemy(type, x, y, {
    hpMult: d.hp * z.hp * (opts.hpMult || 1),
    dmgMult: d.dmg * z.dmg * (opts.dmgMult || 1),
    speedMult: d.speed * (opts.speedMult || 1),
    elite: !!opts.elite,
  });
  game.enemies.push(e);
  return e;
}

function spawnAtRandomEdge(game, type, elite) {
  const a = Math.random() * Math.PI * 2;
  const r = game.spawnRadius + rand(40, 140);
  let x = game.player.x + Math.cos(a) * r;
  let y = game.player.y + Math.sin(a) * r;
  x = clamp(x, -game.arenaHalfW + 30, game.arenaHalfW - 30);
  y = clamp(y, -game.arenaHalfH + 30, game.arenaHalfH - 30);
  spawnEnemy(game, type, x, y, { elite: elite });
}

function updateSpawner(game, dt) {
  if (game.boss) return;

  game.spawnTimer -= dt;

  if (game.spawnTimer <= 0) {
    game.spawnTimer = spawnInterval(game) / 1000;
    const batch = 1 + Math.floor(game.time / 120);
    for (let i = 0; i < batch; i++) {
      const type = chooseEnemyType(game);
      const elite = chance(difficultyMult(game).eliteChance);
      spawnAtRandomEdge(game, type, elite);
    }
  }

  game.swarmTimer -= dt;
  if (game.swarmTimer <= 0) {
    game.swarmTimer = 16;
    const a = Math.random() * Math.PI * 2;
    const r = game.spawnRadius + 60;
    const cx = clamp(game.player.x + Math.cos(a) * r, -game.arenaHalfW + 60, game.arenaHalfW - 60);
    const cy = clamp(game.player.y + Math.sin(a) * r, -game.arenaHalfH + 60, game.arenaHalfH - 60);
    for (let i = 0; i < 9; i++) {
      const sa = (i / 9) * Math.PI * 2;
      const sx = cx + Math.cos(sa) * 55;
      const sy = cy + Math.sin(sa) * 55;
      spawnEnemy(game, "swarm", sx, sy, {});
    }
  }
}
