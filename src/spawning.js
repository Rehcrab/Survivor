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
  return lerp(d.spawnIntervalMax, d.spawnIntervalMin, p);
}

function maxEnemies(game) {
  const d = CONFIG.difficulty;
  const p = clamp(game.time / 600, 0, 1);
  return Math.floor(lerp(d.maxEnemiesMin, d.maxEnemiesMax, p));
}

function chooseEnemyType(game) {
  const m = game.time / 60;
  const pool = [["basic", 10]];
  if (m >= 1) pool.push(["runner", Math.min(4 + m, 9)]);
  if (m >= 3) pool.push(["tank", Math.min(2 + m * 0.5, 6)]);
  if (m >= 4) pool.push(["ranged", Math.min(1.5 + m * 0.4, 5)]);
  if (m >= 2) pool.push(["swarm", 2]);
  if (m >= 8) pool.push(["ranged", 3], ["tank", 3]);

  let total = 0;
  for (const p of pool) total += p[1];
  let r = Math.random() * total;
  for (const p of pool) {
    r -= p[1];
    if (r <= 0) return p[0];
  }
  return "basic";
}

function spawnEnemy(game, type, x, y, elite) {
  if (game.enemies.length >= maxEnemies(game)) return;
  const mult = difficultyMult(game);
  const e = createEnemy(type, x, y, {
    hpMult: mult.hp,
    dmgMult: mult.dmg,
    speedMult: mult.speed,
    elite: elite,
  });
  game.enemies.push(e);
}

function spawnAtRandomEdge(game, type, elite) {
  const a = Math.random() * Math.PI * 2;
  const r = game.spawnRadius + rand(40, 140);
  const x = game.player.x + Math.cos(a) * r;
  const y = game.player.y + Math.sin(a) * r;
  spawnEnemy(game, type, x, y, elite);
}

function updateSpawner(game, dt) {
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
    const cx = game.player.x + Math.cos(a) * r;
    const cy = game.player.y + Math.sin(a) * r;
    for (let i = 0; i < 9; i++) {
      const sa = (i / 9) * Math.PI * 2;
      const sx = cx + Math.cos(sa) * 55;
      const sy = cy + Math.sin(sa) * 55;
      spawnEnemy(game, "swarm", sx, sy, false);
    }
  }
}
