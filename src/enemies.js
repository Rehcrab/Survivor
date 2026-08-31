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
    lastBladeHit: 0,
    lastBoomHit: 0,
    kbx: 0,
    kby: 0,
    flash: 0,
    hitFlash: 0,
    mods: [],
    shield: 0,
  };

  if (elite) {
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

    if (e.ranged) {
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

    if (now - e.lastBladeHit > 5) e.lastBladeHit = 0;
    if (now - e.lastBoomHit > 5) e.lastBoomHit = 0;
  }
}

function drawEnemy(ctx, e) {
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
