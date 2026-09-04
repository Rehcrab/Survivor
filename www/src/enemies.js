let enemyIdCounter = 0;

function assignEliteMods() {
  const pool = Object.keys(CONFIG.eliteMods);
  const mods = [];
  const count = 1;
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    mods.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return mods;
}

function createEnemy(type, x, y, opts) {
  opts = opts || {};
  const base = CONFIG.enemies[type];
  const elite = opts.elite || false;
  const hpMult = (opts.hpMult || 1) * (elite ? CONFIG.elite.hpMult : 1);
  const dmgMult = (opts.dmgMult || 1) * (elite ? CONFIG.elite.damageMult : 1);
  const radius = base.radius * (elite ? CONFIG.elite.radiusMult : 1);

  const e = {
    id: enemyIdCounter++,
    type: type,
    x: x,
    y: y,
    elite: elite,
    hp: base.hp * hpMult,
    maxHp: base.hp * hpMult,
    speed: (base.speed || 80) * (opts.speedMult || 1),
    damage: (base.damage || 10) * dmgMult,
    radius: radius,
    xpValue: (base.xp || 5) * (elite ? CONFIG.elite.xpMult : 1),
    color: elite ? CONFIG.elite.color : base.color,
    ranged: !!base.ranged,
    knockbackResist: elite ? CONFIG.elite.knockbackResist : (base.knockbackResist || 1),
    fireCooldown: base.fireCooldown ? base.fireCooldown / 1000 : 0,
    fireTimer: base.fireCooldown ? (base.fireCooldown / 1000) * rand(0.4, 0.9) : 0,
    projSpeed: base.projSpeed || 0,
    projDamage: base.projDamage || 0,
    lastBladeHit: [],
    lastBoomHit: 0,
    kbx: 0,
    kby: 0,
    flash: 0,
    hitFlash: 0,
    mods: [],
    shield: 0,
    isBossMinion: false,
    homeX: null,
    homeY: null,
    leashRange: 0,
    wanderAngle: 0,
    wanderTimer: 0,
  };

  if (elite && type === "tank" && chance(CONFIG.elite.modChance)) {
    e.mods = assignEliteMods();
    for (const m of e.mods) {
      if (m === "swift") e.speed *= 1.4;
      else if (m === "fortified") e.knockbackResist = 0.1;
      else if (m === "armored") e.shield = e.maxHp * 0.5;
    }
  }

  return e;
}

function updateEnemies(game, dt) {
  const arr = game.enemies;
  const player = game.player;
  const now = game.time;
  const slow = game.enemySlow > 0 ? 0.5 : 1;
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    if (e.isSpawner) continue;

    e.x += e.kbx * dt;
    e.y += e.kby * dt;
    e.kbx *= Math.pow(0.0001, dt);
    e.kby *= Math.pow(0.0001, dt);
    if (e.hitFlash > 0) e.hitFlash -= dt;

    let speedMult = 1;
    if (e.mods && e.mods.includes("berserk") && e.hp < e.maxHp * 0.5) speedMult = 1.5;
    if (e.mods && e.mods.includes("regenerating") && e.hp < e.maxHp) {
      e.hp = Math.min(e.hp + e.maxHp * 0.02 * dt, e.maxHp);
    }

    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / d, ny = dy / d;

    if (e.homeX != null && dist2(player.x, player.y, e.homeX, e.homeY) > e.leashRange * e.leashRange) {
      e.wanderTimer = (e.wanderTimer || 0) - dt;
      if (e.wanderTimer <= 0) {
        e.wanderTimer = rand(1, 2.5);
        e.wanderAngle = rand(0, Math.PI * 2);
      }
      e.x += Math.cos(e.wanderAngle) * e.speed * slow * speedMult * 0.6 * dt;
      e.y += Math.sin(e.wanderAngle) * e.speed * slow * speedMult * 0.6 * dt;
      if (dist2(e.x, e.y, e.homeX, e.homeY) > e.leashRange * e.leashRange) {
        const ha = angleTo(e.x, e.y, e.homeX, e.homeY);
        e.x = e.homeX + Math.cos(ha) * e.leashRange;
        e.y = e.homeY + Math.sin(ha) * e.leashRange;
      }
    } else if (e.ranged) {
      let moveX = 0, moveY = 0;
      if (d > 280) { moveX = nx; moveY = ny; }
      else if (d < 170) { moveX = -nx; moveY = -ny; }
      else {
        moveX = -ny;
        moveY = nx;
      }
      e.x += moveX * e.speed * slow * speedMult * dt;
      e.y += moveY * e.speed * slow * speedMult * dt;

      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && d < 480) {
        e.fireTimer = e.fireCooldown;
        const a = angleTo(e.x, e.y, player.x, player.y) + rand(-0.12, 0.12);
        game.fireEnemyProjectile(e.x, e.y, Math.cos(a), Math.sin(a), e.projSpeed, e.projDamage);
      }
    } else {
      e.x += nx * e.speed * slow * speedMult * dt;
      e.y += ny * e.speed * slow * speedMult * dt;
    }

    e.x = clamp(e.x, -game.arenaHalfW + e.radius, game.arenaHalfW - e.radius);
    e.y = clamp(e.y, -game.arenaHalfH + e.radius, game.arenaHalfH - e.radius);

    if (game.cage && !e.isBossMinion) {
      const cdx = e.x - game.cage.x, cdy = e.y - game.cage.y;
      const cd = Math.hypot(cdx, cdy);
      const minDist = game.cage.radius + e.radius + 20;
      if (cd < minDist) {
        const s = minDist / (cd || 1);
        e.x = game.cage.x + cdx * s;
        e.y = game.cage.y + cdy * s;
      }
    }

    if (now - e.lastBoomHit > 5) e.lastBoomHit = 0;
  }
}

function drawEnemy(ctx, e) {
  if (e.isSpawner) { drawSpawner(ctx, e); return; }
  const r = e.radius;
  ctx.save();
  ctx.translate(e.x, e.y);

  if (e.elite) {
    ctx.strokeStyle = CONFIG.elite.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : e.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  if (e.shield > 0) {
    ctx.strokeStyle = "#c9d6ff";
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.25, r * 0.22, 0, Math.PI * 2);
  ctx.arc(r * 0.28, -r * 0.25, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (e.mods && e.mods.length) {
    for (let i = 0; i < e.mods.length; i++) {
      const mod = CONFIG.eliteMods[e.mods[i]];
      ctx.strokeStyle = mod.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(0, 0, r + 11 + i * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = mod.color;
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(mod.icon, 0, -r - 13 - i * 16);
    }
  }

  ctx.restore();
}

function drawSpawner(ctx, e) {
  const r = e.radius;
  const now = performance.now();
  ctx.save();
  ctx.translate(e.x, e.y);

  ctx.fillStyle = e.hitFlash > 0 ? "#ffffff" : "#2a1f35";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  const pulse = 0.55 + Math.sin(now / 280) * 0.3;
  ctx.strokeStyle = "#ff8a3d";
  ctx.lineWidth = 3;
  ctx.globalAlpha = pulse;
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "#ff8a3d";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, now / 300, now / 300 + 4.2, false);
  ctx.stroke();

  ctx.restore();

  const barW = r * 2.8;
  const barH = 5;
  const bx = e.x - barW / 2;
  const by = e.y - r - 16;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
  ctx.fillStyle = "#ff4d6d";
  ctx.fillRect(bx, by, barW * clamp(e.hp / e.maxHp, 0, 1), barH);
}
