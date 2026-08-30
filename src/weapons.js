function createWeapon(id) {
  return {
    id: id,
    level: 1,
    cooldown: 0,
    angle: 0,
  };
}

function weaponStats(id, level) {
  const def = CONFIG.weapons[id];
  return def.levels[Math.min(level, def.maxLevel) - 1];
}

function effectiveStats(game, id, level) {
  const base = weaponStats(id, level);
  const p = game.player;
  const rm = p.rangeMult;
  const sm = p.sizeMult;
  if (rm === 1 && sm === 1) return base;
  const out = Object.assign({}, base);
  const rangeFields = ["explosionRadius", "radius", "orbitRadius", "aoeRadius", "range"];
  const sizeFields = ["projectileRadius", "bladeRadius"];
  for (const f of rangeFields) if (out[f] !== undefined) out[f] *= rm;
  for (const f of sizeFields) if (out[f] !== undefined) out[f] *= sm;
  return out;
}

function weaponDef(id) {
  return CONFIG.weapons[id];
}

function nearestEnemy(game, x, y, maxDist) {
  let best = null;
  let bestD = maxDist == null ? Infinity : maxDist * maxDist;
  const arr = game.enemies;
  for (let i = 0; i < arr.length; i++) {
    const e = arr[i];
    const d = dist2(x, y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}

function updateWeapons(game, dt) {
  const player = game.player;
  for (let i = 0; i < player.weapons.length; i++) {
    const w = player.weapons[i];
    const st = effectiveStats(game, w.id, w.level);

    if (w.id === "blades") {
      w.angle += st.rotationSpeed * dt;
      updateBlades(game, w, st, dt);
      continue;
    }

    w.cooldown -= dt;
    if (w.cooldown <= 0) {
      const fired = fireWeapon(game, w, st);
      if (fired) w.cooldown = (st.cooldown * player.cooldownMult) / 1000;
    }
  }
}

function fireWeapon(game, w, st) {
  const player = game.player;
  switch (w.id) {
    case "magic_bolt": {
      const t = nearestEnemy(game, player.x, player.y, 900);
      if (!t) return false;
      for (let i = 0; i < st.projectileCount; i++) {
        const spread = st.projectileCount > 1 ? (i - (st.projectileCount - 1) / 2) * 0.14 : 0;
        const a = angleTo(player.x, player.y, t.x, t.y) + spread;
        game.projectiles.push(createProjectile({
          x: player.x, y: player.y,
          vx: Math.cos(a) * st.projectileSpeed, vy: Math.sin(a) * st.projectileSpeed,
          radius: st.projectileRadius, damage: st.damage, pierce: st.pierce,
          lifetime: 1.8, color: "#8ff0ff", kind: "bolt",
        }));
      }
      game.audio.play("shoot");
      return true;
    }
    case "fireball": {
      const t = nearestEnemy(game, player.x, player.y, 900);
      if (!t) return false;
      for (let i = 0; i < st.projectileCount; i++) {
        const spread = st.projectileCount > 1 ? (i - (st.projectileCount - 1) / 2) * 0.2 : 0;
        const a = angleTo(player.x, player.y, t.x, t.y) + spread;
        const travel = dist(player.x, player.y, t.x, t.y) + 40;
        const life = clamp(travel / st.projectileSpeed, 0.6, 2.5);
        game.projectiles.push(createProjectile({
          x: player.x, y: player.y,
          vx: Math.cos(a) * st.projectileSpeed, vy: Math.sin(a) * st.projectileSpeed,
          radius: st.projectileRadius, damage: st.damage, pierce: 0,
          lifetime: life, color: "#ff8c42", kind: "fireball",
          explosionRadius: st.explosionRadius,
        }));
      }
      game.audio.play("fireball");
      return true;
    }
    case "lightning": {
      const targets = nearestNEnemies(game, player.x, player.y, st.strikeCount, 800);
      if (targets.length === 0) return false;
      const struck = new Set();
      for (let i = 0; i < targets.length; i++) {
        const e = targets[i];
        strikeEnemy(game, e, st.damage, st.aoeRadius, st.chainCount, struck, 0);
      }
      game.audio.play("lightning");
      return true;
    }
    case "boomerang": {
      for (let i = 0; i < st.projectileCount; i++) {
        const base = player.facing;
        const spread = st.projectileCount > 1 ? (i - (st.projectileCount - 1) / 2) * 0.55 : 0;
        const a = base + spread;
        game.projectiles.push(createProjectile({
          x: player.x, y: player.y,
          vx: Math.cos(a) * st.projectileSpeed, vy: Math.sin(a) * st.projectileSpeed,
          radius: st.projectileRadius, damage: st.damage, pierce: st.pierce,
          lifetime: 6, color: "#ffe066", kind: "boomerang",
          range: st.range, spin: 0, owner: player,
        }));
      }
      game.audio.play("shoot");
      return true;
    }
    case "nova": {
      const targets = game.enemies;
      for (let i = targets.length - 1; i >= 0; i--) {
        const e = targets[i];
        const d = dist(player.x, player.y, e.x, e.y);
        if (d <= st.radius + e.radius) {
          game.damageEnemy(e, st.damage);
          if (st.knockback > 0 && e.ranged === false) {
            const a = angleTo(player.x, player.y, e.x, e.y);
            e.kbx += Math.cos(a) * st.knockback;
            e.kby += Math.sin(a) * st.knockback;
          }
        }
      }
      if (game.boss && game.boss.hp > 0) {
        const b = game.boss;
        if (dist(player.x, player.y, b.x, b.y) <= st.radius + b.radius) {
          game.hitBoss(st.damage);
        }
      }
      Particles.ring(player.x, player.y, "#7ae8ff", st.radius, 0.35, 5);
      game.addShake(5);
      game.audio.play("nova");
      return true;
    }
    case "aura": {
      const enemies = game.enemies;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const d = dist(player.x, player.y, e.x, e.y);
        if (d <= st.radius + e.radius) {
          const prox = clamp(1 - d / st.radius, 0.25, 1);
          game.damageEnemy(e, st.damage * prox);
        }
      }
      if (game.boss && game.boss.hp > 0) {
        const d = dist(player.x, player.y, game.boss.x, game.boss.y);
        if (d <= st.radius + game.boss.radius) {
          const prox = clamp(1 - d / st.radius, 0.25, 1);
          game.hitBoss(st.damage * prox);
        }
      }
      if (st.heal > 0) {
        player.hp = Math.min(player.hp + st.heal, player.maxHp);
      }
      Particles.ring(player.x, player.y, "#5dff9a", st.radius, 0.4, 4);
      return true;
    }
    case "deflector": {
      let cleared = 0;
      const projs = game.projectiles;
      for (let i = projs.length - 1; i >= 0; i--) {
        const pr = projs[i];
        if (!pr.active || pr.friendly) continue;
        if (dist2(player.x, player.y, pr.x, pr.y) < st.radius * st.radius) {
          pr.active = false;
          Particles.burst(pr.x, pr.y, "#9ad8ff", 4, 90, 2);
          cleared++;
          if (cleared >= st.maxClear) break;
        }
      }
      if (cleared > 0) {
        Particles.ring(player.x, player.y, "#9ad8ff", st.radius, 0.45, 5);
        Particles.burst(player.x, player.y, "#9ad8ff", 8, 120, 3);
        game.audio.play("nova");
      } else {
        Particles.ring(player.x, player.y, "#9ad8ff", st.radius * 0.45, 0.3, 2);
      }
      return true;
    }
    case "plasma": {
      const t = nearestEnemy(game, player.x, player.y, 800);
      if (!t) return false;
      for (let i = 0; i < st.projectileCount; i++) {
        const a = angleTo(player.x, player.y, t.x, t.y);
        game.projectiles.push(createProjectile({
          x: player.x, y: player.y,
          vx: Math.cos(a) * st.projectileSpeed, vy: Math.sin(a) * st.projectileSpeed,
          radius: 8, damage: st.damage, pierce: 0,
          lifetime: st.lifetime, color: "#b56bff", kind: "plasma",
          speed: st.projectileSpeed, bounces: st.bounces, bounceBonus: st.bounceBonus,
        }));
      }
      game.audio.play("shoot");
      return true;
    }
  }
  return false;
}

function updateBlades(game, w, st, dt) {
  const player = game.player;
  const now = game.time;
  for (let i = 0; i < st.bladeCount; i++) {
    const a = w.angle + (i / st.bladeCount) * Math.PI * 2;
    const bx = player.x + Math.cos(a) * st.orbitRadius;
    const by = player.y + Math.sin(a) * st.orbitRadius;
    const enemies = game.enemies;
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (now < e.lastBladeHit) continue;
      const rr = st.bladeRadius + e.radius;
      if (dist2(bx, by, e.x, e.y) < rr * rr) {
        e.lastBladeHit = now + 0.4;
        game.damageEnemy(e, st.damage);
      }
    }
    const boss = game.boss;
    if (boss && boss.hp > 0 && now >= boss.lastBladeHit) {
      const rr = st.bladeRadius + boss.radius;
      if (dist2(bx, by, boss.x, boss.y) < rr * rr) {
        boss.lastBladeHit = now + 0.4;
        game.hitBoss(st.damage);
      }
    }
  }
}

function nearestNEnemies(game, x, y, n, maxDist) {
  const result = [];
  const arr = game.enemies.slice();
  arr.sort((a, b) => dist2(x, y, a.x, a.y) - dist2(x, y, b.x, b.y));
  for (let i = 0; i < arr.length && result.length < n; i++) {
    if (maxDist == null || dist2(x, y, arr[i].x, arr[i].y) <= maxDist * maxDist) {
      result.push(arr[i]);
    }
  }
  return result;
}

function strikeEnemy(game, e, damage, aoeRadius, chainCount, struck, depth) {
  if (struck.has(e.id)) return;
  struck.add(e.id);
  game.damageEnemy(e, damage);
  game.addLightningBolt(e.x, e.y - 420, e.x, e.y);
  Particles.burst(e.x, e.y, "#ffe9a8", 6, 140, 3);
  if (e.hp > 0 && chainCount > 0 && depth < 3) {
    let next = null;
    let bestD = aoeRadius * 1.5 * (aoeRadius * 1.5);
    for (const c of game.enemies) {
      if (struck.has(c.id)) continue;
      const d = dist2(e.x, e.y, c.x, c.y);
      if (d < bestD) { bestD = d; next = c; }
    }
    if (next) {
      strikeEnemy(game, next, damage * 0.7, aoeRadius, chainCount - 1, struck, depth + 1);
    }
  }
}
