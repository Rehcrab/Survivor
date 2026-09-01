class Projectile {
  constructor() {
    this.active = false;
    this.friendly = true;
    this.kind = "bolt";
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 6;
    this.damage = 10;
    this.pierce = 0;
    this.remainingHits = 1;
    this.lifetime = 1;
    this.age = 0;
    this.color = "#39d0ff";
    this.hit = {};
    this.explosionRadius = 0;
    this.spin = 0;
    this.range = 0;
    this.returning = false;
    this.startX = 0;
    this.startY = 0;
    this.speed = 0;
    this.bounces = 0;
    this.bounceBonus = 0;
    this.weaponId = null;
    this.returnMult = 1;
  }

  reset(props) {
    this.active = true;
    this.friendly = props.friendly !== false;
    this.kind = props.kind || "bolt";
    this.x = props.x;
    this.y = props.y;
    this.vx = props.vx || 0;
    this.vy = props.vy || 0;
    this.radius = props.radius || 6;
    this.damage = props.damage || 10;
    this.pierce = props.pierce || 0;
    this.remainingHits = (props.pierce || 0) + 1;
    this.lifetime = props.lifetime || 2;
    this.age = 0;
    this.color = props.color || "#39d0ff";
    this.hit = {};
    this.explosionRadius = props.explosionRadius || 0;
    this.spin = props.spin || 0;
    this.range = props.range || 0;
    this.returning = false;
    this.startX = props.x;
    this.startY = props.y;
    this.owner = props.owner || null;
    this.speed = props.speed || Math.hypot(this.vx, this.vy) || 0;
    this.bounces = props.bounces || 0;
    this.bounceBonus = props.bounceBonus || 0;
    this.weaponId = props.weaponId || null;
    this.returnMult = props.returnMult || 1;
  }
}

const ProjPool = [];

function createProjectile(props) {
  let p = ProjPool.length ? ProjPool.pop() : new Projectile();
  p.reset(props);
  return p;
}

function releaseProjectile(p) {
  p.active = false;
  if (ProjPool.length < 600) ProjPool.push(p);
}

function updateProjectiles(game, dt) {
  const arr = game.projectiles;
  const player = game.player;
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    if (!p.active) { releaseProjectile(p); arr[i] = arr[arr.length - 1]; arr.pop(); continue; }

    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.kind === "boomerang") {
      p.spin += dt * 12;
      if (!p.returning) {
        const traveled = dist(p.startX, p.startY, p.x, p.y);
        if (traveled >= p.range) {
          p.returning = true;
        }
      } else {
        const a = angleTo(p.x, p.y, player.x, player.y);
        p.vx = Math.cos(a) * Math.hypot(p.vx, p.vy);
        p.vy = Math.sin(a) * Math.hypot(p.vx, p.vy);
        if (dist(p.x, p.y, player.x, player.y) < player.radius + 20) {
          p.active = false;
        }
      }
    }

    if (p.kind === "plasma") {
      let tgt = null, bestD = Infinity;
      for (let j = 0; j < game.enemies.length; j++) {
        const e = game.enemies[j];
        if (p.hit[e.id]) continue;
        const d = dist2(p.x, p.y, e.x, e.y);
        if (d < bestD) { bestD = d; tgt = e; }
      }
      if (game.boss && game.boss.hp > 0 && !p.hit[game.boss.id]) {
        const d = dist2(p.x, p.y, game.boss.x, game.boss.y);
        if (d < bestD) { bestD = d; tgt = game.boss; }
      }
      if (tgt) {
        const a = angleTo(p.x, p.y, tgt.x, tgt.y);
        p.vx = Math.cos(a) * p.speed;
        p.vy = Math.sin(a) * p.speed;
      }
    }

    if (p.age >= p.lifetime) {
      if (p.kind === "fireball" && p.friendly) {
        game.explode(p.x, p.y, p.explosionRadius, p.damage, p.weaponId);
      }
      p.active = false;
    }

    if (!p.active) {
      releaseProjectile(p);
      arr[i] = arr[arr.length - 1];
      arr.pop();
    }
  }
}
