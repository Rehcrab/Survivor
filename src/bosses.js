class Boss {
  constructor(cfg, time) {
    const hpScale = 1 + time / 60 * CONFIG.difficulty.bossHpScale;
    this.name = cfg.name;
    this.color = cfg.color;
    this.radius = cfg.radius;
    this.x = 0;
    this.y = 0;
    this.maxHp = cfg.hp * hpScale;
    this.hp = this.maxHp;
    this.speed = cfg.speed;
    this.damage = cfg.damage;
    this.xp = cfg.xp;
    this.attacks = cfg.attacks;
    this.final = cfg.final || false;
    this.tier = cfg.tier || 1;
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
    this.lastBladeHit = 0;
    this.lastBoomHit = 0;
    this.id = "boss";
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
    return this.damage * this.damageMult();
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
    if (this.attacks.summon && this.phase() >= 2) options.push("summon");
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
    if (ph === 2) count += 2;
    else if (ph === 3) { count += 4; speed += 30; }
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
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = this.x + Math.cos(a) * (this.radius + 30);
      const y = this.y + Math.sin(a) * (this.radius + 30);
      let type = "basic";
      if (ph === 2) type = pick(["tank", "tank", "basic"]);
      else type = pick(["tank", "tank", "tank", "basic"]);
      const elite = ph === 3 && chance(0.35);
      game.enemies.push(createEnemy(type, x, y, { hpMult, dmgMult: mult.dmg, speedMult: mult.speed, elite }));
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

    ctx.restore();
  }
}

function createBoss(type, time) {
  const cfg = CONFIG.bosses[type];
  return new Boss(cfg, time);
}
