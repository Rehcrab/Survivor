let enemyIdCounter = 0;

function createEnemy(type, x, y, opts) {
  opts = opts || {};
  const base = CONFIG.enemies[type];
  const elite = opts.elite || false;
  const hpMult = (opts.hpMult || 1) * (elite ? CONFIG.elite.hpMult : 1);
  const dmgMult = (opts.dmgMult || 1) * (elite ? CONFIG.elite.damageMult : 1);
  const radius = base.radius * (elite ? CONFIG.elite.radiusMult : 1);

  return {
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
  };
}

function updateEnemies(game, dt) {
  const arr = game.enemies;
  const player = game.player;
  const now = game.time;
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];

    e.x += e.kbx * dt;
    e.y += e.kby * dt;
    e.kbx *= Math.pow(0.0001, dt);
    e.kby *= Math.pow(0.0001, dt);
    if (e.hitFlash > 0) e.hitFlash -= dt;

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
      e.x += moveX * e.speed * dt;
      e.y += moveY * e.speed * dt;

      e.fireTimer -= dt;
      if (e.fireTimer <= 0 && d < 480) {
        e.fireTimer = e.fireCooldown;
        const a = angleTo(e.x, e.y, player.x, player.y) + rand(-0.12, 0.12);
        game.fireEnemyProjectile(e.x, e.y, Math.cos(a), Math.sin(a), e.projSpeed, e.projDamage);
      }
    } else {
      e.x += nx * e.speed * dt;
      e.y += ny * e.speed * dt;
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

  ctx.restore();
}
