class Boss {
  constructor(cfg, time) {
    const hpScale = 1 + time / 60 * CONFIG.difficulty.bossHpScale;
    this.name = cfg.name;
    this.color = cfg.color;
    this.radius = cfg.radius;
    this.x = 0;
    this.y = 0;
    this.maxHp = cfg.hp * hpScale * ChallengeRun.bossHpMult();
    this.hp = this.maxHp;
    this.speed = cfg.speed;
    this.damage = cfg.damage;
    this.xp = cfg.xp;
    this.attacks = cfg.attacks;
    this.final = cfg.final || false;
    this.tier = cfg.tier || 1;
    this.special = cfg.special || null;
    this.state = "approach";
    this.stateTimer = 1.0;
    this.pendingAttack = null;
    this.burstPulse = 0;
    this.chargeDirX = 0;
    this.chargeDirY = 0;
    this.chargeSpeed = 0;
    this.flash = 0;
    this.spin = 0;
    this.hitFlash = 0;
    this.lastBladeHit = [];
    this.lastBoomHit = 0;
    this.id = "boss";

    // special ability state
    this.shieldActive = false;
    this.shield = 0;
    this.shieldTimer = 3;
    this.dangerZones = [];
    this.zoneTimer = 4;
    this.gravityTimer = 6;
    this.gravityPulse = 0;
    this.portalPairs = [];
    this.portalTimer = 5;
  }

  placeNear(game) {
    const a = Math.random() * Math.PI * 2;
    const r = game.spawnRadius - 60;
    this.x = game.player.x + Math.cos(a) * r;
    this.y = game.player.y + Math.sin(a) * r;
  }

  phase() {
    const frac = this.hp / this.maxHp;
    if (frac > 0.66) return 1;
    if (frac > 0.33) return 2;
    return 3;
  }

  damageMult() {
    const ph = this.phase();
    return ph === 1 ? 1.0 : ph === 2 ? 1.1 : 1.25;
  }

  getDamage() {
    return this.damage * this.damageMult() * ChallengeRun.bossDamageMult();
  }

  attackInterval() {
    const ph = this.phase();
    if (ph === 1) return [1.7, 2.3];
    if (ph === 2) return [1.0, 1.5];
    return [0.6, 1.0];
  }

  telegraphDuration() {
    const ph = this.phase();
    return ph === 1 ? 0.9 : ph === 2 ? 0.7 : 0.5;
  }

  nextApproach() {
    const iv = this.attackInterval();
    this.stateTimer = rand(iv[0], iv[1]);
  }

  pickAttack(game) {
    const options = [];
    if (this.attacks.burst) options.push("burst");
    if (this.attacks.charge) options.push("charge");
    if (this.attacks.summon && this.phase() >= 2) {
      let minions = 0;
      for (const e of game.enemies) if (e.isBossMinion) minions++;
      if (minions < CONFIG.bossArena.maxMinions) options.push("summon");
    }
    return pick(options);
  }

  update(game, dt) {
    this.spin += dt;
    const p = game.player;
    this.flash -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    switch (this.state) {
      case "approach": {
        const d = dist(this.x, this.y, p.x, p.y) || 1;
        if (d > this.radius + p.radius + 40) {
          this.x += (p.x - this.x) / d * this.speed * dt;
          this.y += (p.y - this.y) / d * this.speed * dt;
        }
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.pendingAttack = this.pickAttack(game);
          this.state = "telegraph";
          this.stateTimer = this.telegraphDuration();
        }
        break;
      }
      case "telegraph": {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.beginAttack(game);
        break;
      }
      case "burst": {
        this.burstPulse -= dt;
        if (this.burstPulse <= 0) {
          this.burstPulse = 0.22;
          this.fireBurst(game);
        }
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "approach";
          this.nextApproach();
        }
        break;
      }
      case "charge": {
        this.x += this.chargeDirX * this.chargeSpeed * dt;
        this.y += this.chargeDirY * this.chargeSpeed * dt;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "approach";
          this.nextApproach();
        }
        break;
      }
      case "summon": {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = "approach";
          this.nextApproach();
        }
        break;
      }
    }

    this.updateSpecial(game, dt);
  }

  updateSpecial(game, dt) {
    const p = game.player;
    switch (this.special) {
      case "shield": {
        if (!this.shieldActive) {
          this.shieldTimer -= dt;
          if (this.shieldTimer <= 0) {
            this.shieldActive = true;
            this.shield = this.maxHp * 0.22;
            Particles.ring(this.x, this.y, "#c9d6ff", this.radius * 1.5, 0.45, 5);
            game.audio.play("nova");
          }
        }
        break;
      }
      case "zone": {
        this.zoneTimer -= dt;
        if (this.zoneTimer <= 0) {
          this.zoneTimer = rand(4, 6);
          const count = this.phase() >= 2 ? 5 : 3;
          for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = rand(60, this.radius * 3.5);
            this.dangerZones.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, radius: rand(46, 70), state: "telegraph", timer: 1.0, tick: 0 });
          }
        }
        for (let i = this.dangerZones.length - 1; i >= 0; i--) {
          const z = this.dangerZones[i];
          z.timer -= dt;
          if (z.state === "telegraph") {
            if (z.timer <= 0) { z.state = "active"; z.timer = 3.0; z.tick = 0; }
          } else {
            if (dist2(p.x, p.y, z.x, z.y) < z.radius * z.radius) {
              z.tick -= dt;
              if (z.tick <= 0) { z.tick = 0.5; game.hitPlayer(this.damage * 0.6); }
            }
            if (z.timer <= 0) this.dangerZones.splice(i, 1);
          }
        }
        break;
      }
      case "gravity": {
        if (this.gravityPulse > 0) {
          this.gravityPulse -= dt;
          if (this.gravityPulse > 0.5) {
            const a = angleTo(p.x, p.y, this.x, this.y);
            p.x += Math.cos(a) * 110 * dt;
            p.y += Math.sin(a) * 110 * dt;
          }
        } else {
          this.gravityTimer -= dt;
          if (this.gravityTimer <= 0) {
            this.gravityTimer = rand(6, 9);
            this.gravityPulse = 2.0;
            game.audio.play("bossSpawn");
          }
        }
        break;
      }
      case "phase": {
        if (this.phase() >= 3) {
          this.portalTimer -= dt;
          if (this.portalTimer <= 0) {
            this.portalTimer = rand(2.5, 4);
            if (game.cage) {
              const pairs = this.phase() >= 3 && this.hp < this.maxHp * 0.18 ? 2 : 1;
              for (let k = 0; k < pairs; k++) {
                const a1 = Math.random() * Math.PI * 2;
                const a2 = a1 + Math.PI * 0.5;
                const d = game.cage.radius * 0.55;
                this.portalPairs.push({
                  x1: game.cage.x + Math.cos(a1) * d, y1: game.cage.y + Math.sin(a1) * d,
                  x2: game.cage.x + Math.cos(a2) * d, y2: game.cage.y + Math.sin(a2) * d,
                  timer: 7,
                });
              }
            }
          }
        }
        for (let i = this.portalPairs.length - 1; i >= 0; i--) {
          const pp = this.portalPairs[i];
          pp.timer -= dt;
          const rr = 26 * 26;
          if (dist2(p.x, p.y, pp.x1, pp.y1) < rr) {
            p.x = pp.x2; p.y = pp.y2;
            pp.timer = 0;
            Particles.ring(p.x, p.y, "#ff3d8d", 30, 0.3, 4);
          } else if (dist2(p.x, p.y, pp.x2, pp.y2) < rr) {
            p.x = pp.x1; p.y = pp.y1;
            pp.timer = 0;
            Particles.ring(p.x, p.y, "#ff3d8d", 30, 0.3, 4);
          }
          if (pp.timer <= 0) this.portalPairs.splice(i, 1);
        }
        break;
      }
    }
  }

  beginAttack(game) {
    switch (this.pendingAttack) {
      case "burst":
        this.state = "burst";
        this.stateTimer = 1.4;
        this.burstPulse = 0;
        break;
      case "charge":
        this.state = "charge";
        this.stateTimer = 0.7;
        const a = angleTo(this.x, this.y, game.player.x, game.player.y);
        this.chargeDirX = Math.cos(a);
        this.chargeDirY = Math.sin(a);
        this.chargeSpeed = this.speed * 6;
        game.audio.play("bossSpawn");
        break;
      case "summon":
        this.state = "summon";
        this.stateTimer = 0.6;
        this.spawnMinions(game);
        break;
    }
  }

  fireBurst(game) {
    const ph = this.phase();
    let count = 8 + this.tier * 3;
    let speed = 185 + this.tier * 15;
    if (this.final) { count += 6; speed += 25; }
    if (ph === 2) count += 2;
    else if (ph === 3) { count += 6; speed += 35; }
    const dmg = this.getDamage() * 0.5;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.spin * 0.5;
      game.fireEnemyProjectile(this.x, this.y, Math.cos(a), Math.sin(a), speed, dmg);
    }
    game.audio.play("fireball");
  }

  spawnMinions(game) {
    const ph = this.phase();
    const count = ph === 3 ? 6 : 5;
    const mult = difficultyMult(game);
    const hpMult = mult.hp * CONFIG.bossArena.minionHpMult;
    const isOverlord = this.special === "phase";
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = this.x + Math.cos(a) * (this.radius + 30);
      const y = this.y + Math.sin(a) * (this.radius + 30);
      let type = "basic";
      if (ph === 2) type = pick(["tank", "tank", "basic"]);
      else type = pick(["tank", "tank", "tank", "basic"]);
      let elite = ph === 3 && chance(0.35);
      if (isOverlord && ph >= 2) {
        type = "tank";
        elite = ph === 3 ? chance(0.7) : chance(0.3);
      }
      const m = createEnemy(type, x, y, { hpMult, dmgMult: mult.dmg, speedMult: mult.speed, elite });
      m.isBossMinion = true;
      game.enemies.push(m);
    }
  }

  draw(ctx) {
    const r = this.radius;
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.state === "telegraph") {
      ctx.globalAlpha = 0.35 + Math.sin(performance.now() / 40) * 0.25;
      ctx.strokeStyle = "#ff4d8d";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, r + 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.3, this.color);
    grad.addColorStop(1, "#1a0a20");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.25, r * 0.18, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.25, r * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff2d55";
    ctx.beginPath();
    ctx.arc(0, r * 0.15, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    const ph = this.phase();
    if (ph >= 2) {
      ctx.fillStyle = ph === 3 ? "rgba(255, 60, 60, 0.20)" : "rgba(255, 60, 60, 0.08)";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.hitFlash > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.shieldActive && this.shield > 0) {
      ctx.strokeStyle = "#c9d6ff";
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, r + 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    this.drawSpecial(ctx);
  }

  drawSpecial(ctx) {
    for (const z of this.dangerZones) {
      if (z.state === "telegraph") {
        ctx.strokeStyle = "rgba(255, 77, 109, 0.7)";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = "rgba(255, 77, 109, 0.35)";
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 77, 109, 0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    if (this.gravityPulse > 0.5) {
      ctx.strokeStyle = "rgba(120, 220, 255, 0.4)";
      ctx.fillStyle = "rgba(120, 220, 255, 0.4)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + this.spin * 0.5;
        const d = this.radius + 70;
        const ax = this.x + Math.cos(a) * d;
        const ay = this.y + Math.sin(a) * d;
        const dir = angleTo(ax, ay, this.x, this.y);
        ctx.beginPath();
        ctx.moveTo(ax - Math.cos(dir) * 14, ay - Math.sin(dir) * 14);
        ctx.lineTo(ax + Math.cos(dir) * 6, ay + Math.sin(dir) * 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ax + Math.cos(dir) * 16, ay + Math.sin(dir) * 16);
        ctx.lineTo(ax + Math.cos(dir + 2.6) * 12, ay + Math.sin(dir + 2.6) * 12);
        ctx.lineTo(ax + Math.cos(dir - 2.6) * 12, ay + Math.sin(dir - 2.6) * 12);
        ctx.closePath();
        ctx.fill();
      }
    }

    for (const pp of this.portalPairs) {
      this.drawPortal(ctx, pp.x1, pp.y1);
      this.drawPortal(ctx, pp.x2, pp.y2);
    }
  }

  drawPortal(ctx, x, y) {
    ctx.strokeStyle = "#ff3d8d";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff3d8d";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255, 61, 141, 0.15)";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
  }
}

function createBoss(type, time) {
  const cfg = CONFIG.bosses[type];
  return new Boss(cfg, time);
}
