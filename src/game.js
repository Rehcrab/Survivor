class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.camera = new Camera();
    this.state = "MENU";
    this.time = 0;
    this.speedMult = 1;
    this.screenW = window.innerWidth;
    this.screenH = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.audio = AudioMan;

    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.gems = [];
    this.heals = [];
    this.magnets = [];
    this.chests = [];
    this.goldDrops = [];
    this.lightningBolts = [];
    this.boss = null;
    this.bossWarning = 0;
    this.cage = null;

    this.spawnTimer = 1;
    this.swarmTimer = 12;
    this.healTimer = 60;
    this.magnetTimer = 100;
    this.magnetBurst = 0;
    this.spawnRadius = 600;

    this.chestRewards = [];
    this.chestFallback = 0;
    this.chestSegments = [];
    this.chestSpin = 0;
    this.chestRotation = 0;
    this.chestSpinFrom = 0;
    this.chestSpinTo = 0;
    this.chestSpinTime = 0;
    this.chestSpinDuration = 1.1;
    this.chestApplied = [];
    this.chestDone = false;
    this.chestDoneTimer = 0;

    this.pendingLevelUps = 0;
    this.currentChoices = [];

    this.midBossSpawned = false;
    this.finalBossSpawned = false;

    this.stats = {};
    this.weaponDamage = {};
    this.lastRunGold = 0;
    this.resetStats();
  }

  resetStats() {
    this.stats = {
      enemiesKilled: 0,
      bossesKilled: 0,
      damageDealt: 0,
      xpCollected: 0,
    };
  }

  resize() {
    this.screenW = window.innerWidth;
    this.screenH = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(this.screenW * this.dpr);
    this.canvas.height = Math.floor(this.screenH * this.dpr);
    this.canvas.style.width = this.screenW + "px";
    this.canvas.style.height = this.screenH + "px";
    this.spawnRadius = Math.hypot(this.screenW / 2, this.screenH / 2) + 70;
  }

  startRun() {
    this.player = new Player();
    this.player.weapons.push(createWeapon(Settings.startingWeapon || "magic_bolt"));
    this.enemies.length = 0;
    this.projectiles.length = 0;
    this.gems.length = 0;
    this.heals.length = 0;
    this.magnets.length = 0;
    this.chests.length = 0;
    this.goldDrops.length = 0;
    this.lightningBolts.length = 0;
    Particles.reset();
    this.boss = null;
    this.bossWarning = 0;
    this.cage = null;
    this.time = 0;
    this.spawnTimer = 1;
    this.swarmTimer = 12;
    this.healTimer = 60;
    this.magnetTimer = 100;
    this.magnetBurst = 0;
    this.pendingLevelUps = 0;
    this.currentChoices = [];
    this.midBossSpawned = false;
    this.finalBossSpawned = false;
    this.resetStats();
    this.weaponDamage = {};
    this.lastRunGold = 0;
    this.camera.snapTo(this.player.x, this.player.y);
    this.state = "PLAYING";
    UI.hideAll();
    UI.refreshBuild(this);
    this.audio.resume();
    this.audio.startMusic();
  }

  toMenu() {
    this.state = "MENU";
    this.boss = null;
    UI.show("menu");
    UI.updateBestScore();
    UI.updateGold();
  }

  togglePause() {
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
      UI.populatePauseBuild(this);
      UI.show("pause");
      this.audio.play("click");
    } else if (this.state === "PAUSED") {
      this.resume();
    }
  }

  resume() {
    if (this.state !== "PAUSED") return;
    this.state = "PLAYING";
    UI.hideAll();
    this.audio.play("click");
  }

  selectUpgrade(index) {
    if (this.state !== "LEVEL_UP") return;
    const choice = this.currentChoices[index];
    if (!choice) return;
    applyUpgrade(this, choice);
    this.audio.play("levelup");
    this.pendingLevelUps--;

    if (this.pendingLevelUps > 0) {
      this.currentChoices = generateChoices(this.player);
      UI.showUpgrades(this, this.currentChoices);
    } else {
      this.state = "PLAYING";
      UI.hideAll();
    }
  }

  addShake(amount) {
    if (Settings.shake) this.camera.addShake(amount);
  }

  fireEnemyProjectile(x, y, dx, dy, speed, dmg) {
    this.projectiles.push(createProjectile({
      x, y, vx: dx * speed, vy: dy * speed,
      radius: 7, damage: dmg, pierce: 0,
      lifetime: 5, color: "#ff5f6d", kind: "enemy", friendly: false,
    }));
  }

  addLightningBolt(x1, y1, x2, y2) {
    this.lightningBolts.push({ x1, y1, x2, y2, age: 0, life: 0.22 });
  }

  trackDamage(sourceId, amount) {
    if (!sourceId) return;
    this.weaponDamage[sourceId] = (this.weaponDamage[sourceId] || 0) + amount;
  }

  damageEnemy(e, baseDamage, sourceId) {
    const crit = chance(this.player.critChance);
    const mult = this.player.damageMultiplier();
    const dmg = baseDamage * mult * (crit ? CONFIG.player.critDamage : 1);
    e.hp -= dmg;
    e.hitFlash = 0.08;
    this.stats.damageDealt += dmg;
    this.trackDamage(sourceId, dmg);
    if (crit) Particles.text(e.x, e.y - e.radius - 4, Math.round(dmg) + "!", "#ffd166", 17);
    else if (chance(0.18)) Particles.text(e.x, e.y - e.radius - 4, Math.round(dmg), "#e8ecf8", 12);
    if (e.hp <= 0) this.killEnemy(e);
  }

  hitBoss(baseDamage, sourceId) {
    const b = this.boss;
    const crit = chance(this.player.critChance);
    const dmg = baseDamage * this.player.damageMultiplier() * (crit ? CONFIG.player.critDamage : 1);
    b.hp -= dmg;
    b.hitFlash = 0.08;
    this.stats.damageDealt += dmg;
    this.trackDamage(sourceId, dmg);
    if (crit) Particles.text(b.x, b.y - b.radius - 10, Math.round(dmg) + "!", "#ffd166", 18);
    else Particles.text(b.x, b.y - b.radius - 10, Math.round(dmg), "#e8ecf8", 13);
    if (b.hp <= 0) this.killBoss();
  }

  killEnemy(e) {
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) {
      this.enemies[idx] = this.enemies[this.enemies.length - 1];
      this.enemies.pop();
    }
    this.stats.enemiesKilled++;
    this.dropGem(e.x, e.y, e.xpValue);
    if (chance(CONFIG.gold.enemyChance)) this.dropGold(e.x, e.y, CONFIG.gold.enemyAmount);
    Particles.burst(e.x, e.y, e.elite ? "#ff8a3d" : e.color, e.elite ? 18 : 8, e.elite ? 200 : 120, e.elite ? 5 : 3);
    if (chance(0.5)) this.audio.play("enemyDie");
    if (e.elite) {
      this.addShake(2);
      Particles.ring(e.x, e.y, "#ff8a3d", e.radius * 4, 0.3, 3);
    }
  }

  dropGem(x, y, value) {
    this.gems.push({
      x: x + rand(-6, 6),
      y: y + rand(-6, 6),
      value: value,
      r: value >= 40 ? 9 : value >= 15 ? 7 : 5,
      magnetized: false,
      vx: 0,
      vy: 0,
      bob: rand(0, Math.PI * 2),
    });
  }

  dropHeal(x, y, amount) {
    this.heals.push({
      x: x + rand(-4, 4),
      y: y + rand(-4, 4),
      amount: amount,
      bob: rand(0, Math.PI * 2),
    });
  }

  dropMagnet(x, y) {
    this.magnets.push({
      x: x + rand(-4, 4),
      y: y + rand(-4, 4),
      bob: rand(0, Math.PI * 2),
    });
  }

  dropChest(x, y) {
    this.chests.push({
      x: x,
      y: y,
      bob: rand(0, Math.PI * 2),
    });
  }

  dropGold(x, y, amount) {
    this.goldDrops.push({
      x: x + rand(-3, 3),
      y: y + rand(-3, 3),
      amount: amount,
      bob: rand(0, Math.PI * 2),
    });
  }

  healPlayer(amount) {
    const p = this.player;
    const before = p.hp;
    p.hp = Math.min(p.hp + amount, p.maxHp);
    const healed = Math.round(p.hp - before);
    Particles.text(p.x, p.y - p.radius - 8, "+" + healed, "#6dff9a", 17);
    Particles.burst(p.x, p.y, "#6dff9a", 10, 140, 3);
    this.audio.play("xp");
  }

  activateMagnet() {
    this.magnetBurst = CONFIG.magnet.burstDuration;
    Particles.ring(this.player.x, this.player.y, "#e55dff", 120, 0.4, 5);
    Particles.burst(this.player.x, this.player.y, "#e55dff", 16, 220, 4);
    this.audio.play("nova");
  }

  handleHeals(dt) {
    const p = this.player;
    const heals = this.heals;
    for (let i = heals.length - 1; i >= 0; i--) {
      const h = heals[i];
      h.bob += dt;
      const rr = p.radius + CONFIG.heal.radius;
      if (dist2(h.x, h.y, p.x, p.y) < rr * rr) {
        heals[i] = heals[heals.length - 1];
        heals.pop();
        this.healPlayer(h.amount);
      }
    }
  }

  handleMagnets(dt) {
    const p = this.player;
    const magnets = this.magnets;
    for (let i = magnets.length - 1; i >= 0; i--) {
      const m = magnets[i];
      m.bob += dt;
      const rr = p.radius + CONFIG.magnet.radius;
      if (dist2(m.x, m.y, p.x, p.y) < rr * rr) {
        magnets[i] = magnets[magnets.length - 1];
        magnets.pop();
        this.activateMagnet();
      }
    }
  }

  handleChests(dt) {
    const p = this.player;
    const chests = this.chests;
    for (let i = chests.length - 1; i >= 0; i--) {
      const c = chests[i];
      c.bob += dt;
      const rr = p.radius + 16;
      if (dist2(c.x, c.y, p.x, p.y) < rr * rr) {
        chests[i] = chests[chests.length - 1];
        chests.pop();
        this.openChest();
      }
    }
  }

  handleGold(dt) {
    const p = this.player;
    const gold = this.goldDrops;
    for (let i = gold.length - 1; i >= 0; i--) {
      const g = gold[i];
      g.bob += dt;
      const rr = p.radius + 12;
      if (dist2(g.x, g.y, p.x, p.y) < rr * rr) {
        gold[i] = gold[gold.length - 1];
        gold.pop();
        Settings.gold += g.amount;
        Settings.save();
        Particles.text(p.x, p.y - p.radius - 8, "+" + g.amount + " gold", "#ffd166", 15);
        Particles.burst(p.x, p.y, "#ffd166", 6, 120, 3);
        this.audio.play("xp");
      }
    }
  }

  clampToCage(e) {
    const c = this.cage;
    const dx = e.x - c.x, dy = e.y - c.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    const max = c.radius - e.radius;
    if (d > max) {
      const s = max / d;
      e.x = c.x + dx * s;
      e.y = c.y + dy * s;
    }
  }

  eligibleItems() {
    const items = [];
    for (const w of this.player.weapons) {
      const def = weaponDef(w.id);
      if (w.level < def.maxLevel) {
        items.push({ type: "weapon", id: w.id, level: w.level, maxLevel: def.maxLevel });
      }
    }
    for (const s of this.player.passives) {
      const def = skillDef(s.id);
      if (s.level < def.maxLevel) {
        items.push({ type: "skill", id: s.id, level: s.level, maxLevel: def.maxLevel });
      }
    }
    return items;
  }

  grantChestGold() {
    if (chance(CONFIG.gold.chestChance)) {
      Settings.gold += CONFIG.gold.chestAmount;
      Settings.save();
      Particles.text(this.player.x, this.player.y - this.player.radius - 20, "+" + CONFIG.gold.chestAmount + " gold", "#ffd166", 16);
    }
  }

  openChest() {
    this.grantChestGold();
    const eligible = this.eligibleItems();
    if (eligible.length === 0) {
      for (let i = 0; i < 4; i++) {
        this.dropGem(this.player.x + rand(-60, 60), this.player.y + rand(-60, 60), CONFIG.bossArena.crystalValue);
      }
      Particles.burst(this.player.x, this.player.y, "#ffd166", 20, 200, 4);
      this.audio.play("levelup");
      return;
    }

    const rewards = [];
    const pool = eligible.slice();
    while (rewards.length < 3 && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      rewards.push(pool.splice(idx, 1)[0]);
    }

    this.chestRewards = rewards;
    this.chestFallback = 3 - rewards.length;
    this.chestSegments = eligible;
    this.chestSpin = 0;
    this.chestRotation = 0;
    this.chestApplied = [];
    this.chestDone = false;
    this.chestDoneTimer = 0;
    this.startChestSpin(rewards[0], eligible);
    this.state = "CHEST";
    this.audio.play("levelup");
  }

  startChestSpin(reward, segments) {
    const idx = segments.indexOf(reward);
    const segAngle = (idx + 0.5) * (Math.PI * 2 / segments.length);
    const targetMod = -Math.PI / 2 - segAngle;
    const currentMod = ((this.chestRotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let delta = (targetMod - currentMod) % (Math.PI * 2);
    if (delta < 0) delta += Math.PI * 2;
    this.chestSpinFrom = this.chestRotation;
    this.chestSpinTo = this.chestRotation + Math.PI * 2 * 3 + delta;
    this.chestSpinTime = 0;
    this.chestSpinDuration = 1.1;
  }

  applyChestUpgrade(reward) {
    const p = this.player;
    if (reward.type === "weapon") {
      const w = p.weapons.find(w => w.id === reward.id);
      if (w && w.level < reward.maxLevel) w.level++;
    } else {
      const s = p.passives.find(s => s.id === reward.id);
      if (s && s.level < reward.maxLevel) {
        s.level++;
        if (reward.id === "toughness") p.hp = Math.min(p.hp + 30, p.maxHp);
      }
    }
    p.applyMaxHpChange();
    UI.refreshBuild(this);
    this.chestApplied.push(reward);
  }

  updateChest(dt) {
    this.chestSpinTime += dt;
    const t = Math.min(this.chestSpinTime / this.chestSpinDuration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    this.chestRotation = this.chestSpinFrom + (this.chestSpinTo - this.chestSpinFrom) * eased;

    if (t >= 1 && !this.chestDone) {
      const reward = this.chestRewards[this.chestSpin];
      if (reward) {
        this.applyChestUpgrade(reward);
        this.chestSpin++;
        if (this.chestSpin < this.chestRewards.length) {
          this.startChestSpin(this.chestRewards[this.chestSpin], this.chestSegments);
        } else {
          this.chestDone = true;
          this.chestDoneTimer = 2.2;
        }
      } else {
        this.chestDone = true;
        this.chestDoneTimer = 2.2;
      }
    } else if (this.chestDone) {
      this.chestDoneTimer -= dt;
      if (this.chestDoneTimer <= 0) {
        for (let i = 0; i < this.chestFallback; i++) {
          this.dropGem(this.player.x + rand(-60, 60), this.player.y + rand(-60, 60), CONFIG.bossArena.crystalValue);
        }
        this.state = "PLAYING";
        UI.hideAll();
      }
    }
  }

  updatePickupSpawning(dt) {
    this.healTimer -= dt;
    if (this.healTimer <= 0) {
      this.healTimer = rand(CONFIG.heal.spawnMin, CONFIG.heal.spawnMax);
      this.spawnNaturalPickup("heal");
      if (this.magnetTimer < 5) this.magnetTimer = 5;
    }
    this.magnetTimer -= dt;
    if (this.magnetTimer <= 0) {
      this.magnetTimer = rand(CONFIG.magnet.spawnMin, CONFIG.magnet.spawnMax);
      this.spawnNaturalPickup("magnet");
      if (this.healTimer < 5) this.healTimer = 5;
    }
  }

  spawnNaturalPickup(kind) {
    const a = Math.random() * Math.PI * 2;
    const d = rand(150, 330);
    const x = this.player.x + Math.cos(a) * d;
    const y = this.player.y + Math.sin(a) * d;
    if (kind === "heal") {
      this.dropHeal(x, y, CONFIG.heal.amount);
      Particles.ring(x, y, "#6dff9a", 40, 0.4, 3);
    } else {
      this.dropMagnet(x, y);
      Particles.ring(x, y, "#e55dff", 40, 0.4, 3);
    }
  }

  explode(x, y, radius, dmg, sourceId) {
    const enemies = this.enemies;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const rr = radius + e.radius;
      if (dist2(x, y, e.x, e.y) < rr * rr) {
        this.damageEnemy(e, dmg, sourceId);
      }
    }
    if (this.boss && this.boss.hp > 0) {
      const rr = radius + this.boss.radius;
      if (dist2(x, y, this.boss.x, this.boss.y) < rr * rr) {
        this.hitBoss(dmg, sourceId);
      }
    }
    Particles.ring(x, y, "#ff8c42", radius, 0.35, 5);
    Particles.burst(x, y, "#ffb066", 12, 200, 5);
    this.addShake(3);
  }

  hitPlayer(dmg) {
    const p = this.player;
    if (p.invulnTimer > 0) return;
    const applied = p.takeDamage(dmg);
    if (!applied) return;
    Particles.burst(p.x, p.y, "#ff5f6d", 12, 180, 4);
    this.addShake(7);
    this.audio.play("playerHit");
    if (p.hp <= 0) {
      p.hp = 0;
      this.endRun(false);
    }
  }

  spawnBoss(type) {
    const boss = createBoss(type, this.time);
    const cageRadius = Math.min(CONFIG.bossArena.cageRadius, Math.max(300, Math.min(this.screenW, this.screenH) * 0.55));
    const a = Math.random() * Math.PI * 2;
    const d = cageRadius * 0.5;
    boss.x = this.player.x + Math.cos(a) * d;
    boss.y = this.player.y + Math.sin(a) * d;
    this.boss = boss;
    this.enemies.length = 0;
    this.cage = { x: this.player.x, y: this.player.y, radius: cageRadius };
    this.bossWarning = 2.2;
    this.audio.play("bossSpawn");
    this.addShake(8);
  }

  killBoss() {
    const boss = this.boss;
    const per = Math.round(boss.xp / 3);
    for (let i = 0; i < CONFIG.bossArena.chestCrystals; i++) {
      this.dropGem(boss.x + rand(-80, 80), boss.y + rand(-80, 80), per);
    }
    this.dropChest(boss.x, boss.y);
    this.dropMagnet(boss.x + rand(-30, 30), boss.y + rand(-30, 30));
    const heals = randInt(CONFIG.bossArena.bossHealsMin, CONFIG.bossArena.bossHealsMax);
    for (let i = 0; i < heals; i++) {
      this.dropHeal(boss.x + rand(-50, 50), boss.y + rand(-50, 50), CONFIG.heal.amount);
    }
    const isFinalBoss = boss.name === "Void Tyrant";
    const goldTotal = isFinalBoss ? CONFIG.gold.bossAmountFinal : CONFIG.gold.bossAmountMid;
    if (isFinalBoss) {
      Settings.gold += goldTotal;
      Settings.save();
      this.lastRunGold = goldTotal;
    } else {
      const coins = 4;
      for (let i = 0; i < coins; i++) {
        this.dropGold(boss.x + rand(-70, 70), boss.y + rand(-70, 70), Math.round(goldTotal / coins));
      }
    }
    Particles.burst(boss.x, boss.y, boss.color, 40, 320, 6);
    Particles.ring(boss.x, boss.y, boss.color, boss.radius * 3, 0.5, 6);
    this.addShake(12);
    this.audio.play("bossDie");
    this.stats.bossesKilled++;
    const isFinal = boss.name === "Void Tyrant";
    this.boss = null;
    this.cage = null;
    if (isFinal) {
      this.endRun(true);
    }
  }

  endRun(victory) {
    this.state = victory ? "VICTORY" : "GAME_OVER";
    if (Settings.bestTime < this.time) {
      Settings.bestTime = this.time;
      Settings.save();
    }
    const stats = [
      { label: "Time Survived", value: formatTime(this.time) },
      { label: "Level", value: this.player.level },
      { label: "Enemies Defeated", value: this.stats.enemiesKilled },
      { label: "XP Collected", value: Math.floor(this.stats.xpCollected) },
    ];
    if (victory) {
      stats.push({ label: "Bosses Defeated", value: this.stats.bossesKilled });
      stats.push({ label: "Damage Dealt", value: Math.floor(this.stats.damageDealt) });
      stats.push({ label: "Gold Earned", value: "+" + this.lastRunGold });
    }
    UI.showStats(UI.el["stats-" + (victory ? "victory" : "gameover")], stats);
    UI.show(victory ? "victory" : "gameover");
    UI.updateBestScore();
    if (victory) this.audio.play("victory");
    else this.audio.play("defeat");
  }

  updatePlaying(dt) {
    this.time += dt;
    const p = this.player;

    this.camera.follow(p.x, p.y, dt);

    const move = Input.getMoveVector();
    p.move(dt, move);
    if (this.cage) this.clampToCage(p);

    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    updateWeapons(this, dt);
    updateProjectiles(this, dt);
    updateEnemies(this, dt);

    if (this.boss) {
      this.boss.update(this, dt);
      if (this.cage) this.clampToCage(this.boss);
      if (dist(p.x, p.y, this.boss.x, this.boss.y) < this.boss.radius + p.radius) {
        this.hitPlayer(this.boss.getDamage());
      }
    }

    updateSpawner(this, dt);

    this.handlePlayerProjectileCollisions();
    if (this.state !== "PLAYING") return;
    this.handleEnemyProjectileCollisions();
    this.handleEnemyContact();
    if (this.state !== "PLAYING") return;
    this.handleGems(dt);
    this.handleHeals(dt);
    this.handleMagnets(dt);
    this.handleChests(dt);
    this.handleGold(dt);
    if (this.state !== "PLAYING") return;
    if (this.magnetBurst > 0) this.magnetBurst -= dt;
    this.updatePickupSpawning(dt);

    if (this.bossWarning > 0) this.bossWarning -= dt;

    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      this.lightningBolts[i].age += dt;
      if (this.lightningBolts[i].age >= this.lightningBolts[i].life) {
        this.lightningBolts[i] = this.lightningBolts[this.lightningBolts.length - 1];
        this.lightningBolts.pop();
      }
    }

    if (!this.midBossSpawned && this.time >= 300) {
      this.midBossSpawned = true;
      this.spawnBoss("mid");
    }
    if (!this.finalBossSpawned && this.time >= 600) {
      this.finalBossSpawned = true;
      this.spawnBoss("final");
    }

    this.checkLevelUp();

    Particles.update(dt);
    this.camera.update(dt);
    UI.updateHUD(this);
  }

  handlePlayerProjectileCollisions() {
    const enemies = this.enemies;
    const projs = this.projectiles;
    const now = this.time;
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i];
      if (!p.active || !p.friendly) continue;

      const boss = this.boss;
      if (boss && boss.hp > 0) {
        const rr = p.radius + boss.radius;
        if (dist2(p.x, p.y, boss.x, boss.y) < rr * rr) {
          if (p.kind === "fireball") {
            this.explode(p.x, p.y, p.explosionRadius, p.damage, p.weaponId);
            p.active = false;
            continue;
          }
          if (p.kind === "boomerang") {
            if (now >= boss.lastBoomHit) {
              boss.lastBoomHit = now + 0.35;
              this.hitBoss(p.damage, p.weaponId);
              p.remainingHits--;
              if (p.remainingHits <= 0) { p.active = false; continue; }
            }
          } else if (p.kind === "plasma") {
            if (!p.hit[boss.id]) {
              p.hit[boss.id] = true;
              this.hitBoss(p.damage, p.weaponId);
              p.damage += p.bounceBonus;
              p.bounces--;
              if (p.bounces <= 0) { p.active = false; continue; }
            }
          } else {
            if (!p.hit[boss.id]) {
              p.hit[boss.id] = true;
              this.hitBoss(p.damage, p.weaponId);
              this.audio.play("hit");
              p.remainingHits--;
              if (p.remainingHits <= 0) { p.active = false; continue; }
            }
          }
        }
      }

      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        const rr = p.radius + e.radius;
        if (dist2(p.x, p.y, e.x, e.y) > rr * rr) continue;

        if (p.kind === "fireball") {
          this.explode(p.x, p.y, p.explosionRadius, p.damage, p.weaponId);
          p.active = false;
          break;
        }

        if (p.kind === "boomerang") {
          if (now < e.lastBoomHit) continue;
          e.lastBoomHit = now + 0.35;
          this.damageEnemy(e, p.damage, p.weaponId);
          p.remainingHits--;
          if (p.remainingHits <= 0) { p.active = false; break; }
          continue;
        }

        if (p.kind === "plasma") {
          if (p.hit[e.id]) continue;
          p.hit[e.id] = true;
          this.damageEnemy(e, p.damage, p.weaponId);
          p.damage += p.bounceBonus;
          p.bounces--;
          if (p.bounces <= 0) { p.active = false; break; }
          continue;
        }

        if (p.hit[e.id]) continue;
        p.hit[e.id] = true;
        this.damageEnemy(e, p.damage, p.weaponId);
        this.audio.play("hit");
        p.remainingHits--;
        if (p.remainingHits <= 0) {
          p.active = false;
          break;
        }
      }
    }
  }

  handleEnemyProjectileCollisions() {
    const p = this.player;
    const projs = this.projectiles;
    for (let i = projs.length - 1; i >= 0; i--) {
      const pr = projs[i];
      if (!pr.active || pr.friendly) continue;
      const rr = pr.radius + p.radius;
      if (dist2(pr.x, pr.y, p.x, p.y) < rr * rr) {
        pr.active = false;
        this.hitPlayer(pr.damage);
      }
    }
  }

  handleEnemyContact() {
    const p = this.player;
    const enemies = this.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      const rr = e.radius + p.radius;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        this.hitPlayer(e.damage);
      }
    }
  }

  handleGems(dt) {
    const p = this.player;
    const gems = this.gems;
    const pr = p.pickupRadius;
    const bursting = this.magnetBurst > 0;
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      g.bob += dt;
      const d2 = dist2(g.x, g.y, p.x, p.y);

      if (!g.magnetized && d2 < pr * pr) {
        g.magnetized = true;
      }

      if (g.magnetized || bursting) {
        const d = Math.sqrt(d2) || 1;
        const speed = bursting ? CONFIG.magnet.burstSpeed : CONFIG.magnet.pullSpeed;
        g.x += (p.x - g.x) / d * speed * dt;
        g.y += (p.y - g.y) / d * speed * dt;
      }

      if (d2 < (p.radius + g.r + 4) * (p.radius + g.r + 4)) {
        gems[i] = gems[gems.length - 1];
        gems.pop();
        p.addXp(g.value);
        this.stats.xpCollected += g.value;
        Particles.burst(p.x, p.y - 10, "#6adcff", 3, 60, 2);
        this.audio.play("xp");
      }
    }
  }

  checkLevelUp() {
    const p = this.player;
    while (p.xp >= p.xpToNext) {
      p.gainLevel();
      this.pendingLevelUps++;
    }
    if (this.pendingLevelUps > 0 && this.state === "PLAYING") {
      this.currentChoices = generateChoices(p);
      if (this.currentChoices.length === 0) {
        this.pendingLevelUps = 0;
        p.hp = Math.min(p.hp + 20, p.maxHp);
        return;
      }
      this.state = "LEVEL_UP";
      UI.showUpgrades(this, this.currentChoices);
    }
  }

  update(dt) {
    if (this.state === "PLAYING") {
      this.updatePlaying(dt * this.speedMult);
    } else if (this.state === "LEVEL_UP" || this.state === "PAUSED") {
      Particles.update(dt);
    } else if (this.state === "CHEST") {
      this.updateChest(dt);
      Particles.update(dt);
    }
  }

  cycleSpeed() {
    this.speedMult = this.speedMult >= 4 ? 1 : this.speedMult * 2;
    UI.updateSpeedLabel(this);
    this.audio.play("click");
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = "#0b0d17";
    ctx.fillRect(0, 0, this.screenW, this.screenH);

    const halfW = this.screenW / 2;
    const halfH = this.screenH / 2;
    const ox = this.camera.getOffsetX();
    const oy = this.camera.getOffsetY();
    ctx.save();
    ctx.translate(halfW - this.camera.x + ox, halfH - this.camera.y + oy);

    this.drawBackground(ctx, halfW, halfH);
    if (this.cage) this.drawCage(ctx);

    for (const g of this.gems) this.drawGem(ctx, g);
    for (const h of this.heals) {
      if (this.inView(h.x, h.y, halfW, halfH)) this.drawHeal(ctx, h);
    }
    for (const m of this.magnets) {
      if (this.inView(m.x, m.y, halfW, halfH)) this.drawMagnet(ctx, m);
    }
    for (const c of this.chests) {
      if (this.inView(c.x, c.y, halfW, halfH)) this.drawChest(ctx, c);
    }
    for (const g of this.goldDrops) {
      if (this.inView(g.x, g.y, halfW, halfH)) this.drawGold(ctx, g);
    }
    for (const e of this.enemies) {
      if (this.inView(e.x, e.y, halfW, halfH)) drawEnemy(ctx, e);
    }
    if (this.boss) this.boss.draw(ctx);
    this.drawProjectiles(ctx, halfW, halfH);
    this.drawLightning(ctx);
    if (this.player) this.drawPlayer(ctx);
    Particles.draw(ctx);

    ctx.restore();

    if (this.bossWarning > 0) {
      ctx.globalAlpha = clamp(this.bossWarning, 0, 1);
      ctx.fillStyle = "#ff4d8d";
      ctx.font = "bold 42px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠ WARNING ⚠", this.screenW / 2, this.screenH * 0.3);
      ctx.globalAlpha = 1;
    }

    if (this.state === "CHEST") {
      this.drawChestWheel(ctx);
    }
  }

  inView(x, y, halfW, halfH) {
    const dx = x - this.camera.x;
    const dy = y - this.camera.y;
    return dx > -halfW - 80 && dx < halfW + 80 && dy > -halfH - 80 && dy < halfH + 80;
  }

  drawBackground(ctx, halfW, halfH) {
    const gs = CONFIG.arena.gridSize;
    const left = Math.floor((this.camera.x - halfW) / gs) * gs;
    const right = this.camera.x + halfW;
    const top = Math.floor((this.camera.y - halfH) / gs) * gs;
    const bottom = this.camera.y + halfH;

    ctx.strokeStyle = "rgba(57, 208, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = left; x <= right; x += gs) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = top; y <= bottom; y += gs) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(57, 208, 255, 0.12)";
    for (let x = left; x <= right; x += gs) {
      for (let y = top; y <= bottom; y += gs) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  drawGem(ctx, g) {
    const bob = Math.sin(g.bob * 3) * 1.5;
    const y = g.y + bob;
    const color = g.value >= 40 ? "#ffd166" : g.value >= 15 ? "#5ad1ff" : "#6a8cff";
    ctx.save();
    ctx.translate(g.x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillRect(-g.r * 0.7, -g.r * 0.7, g.r * 1.4, g.r * 1.4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(-g.r * 0.3, -g.r * 0.3, g.r * 0.6, g.r * 0.6);
    ctx.restore();
  }

  drawHeal(ctx, h) {
    const bob = Math.sin(h.bob * 3) * 1.5;
    const y = h.y + bob;
    const r = CONFIG.heal.radius;
    ctx.save();
    ctx.translate(h.x, y);
    ctx.fillStyle = "#ff4d6d";
    ctx.shadowColor = "#ff4d6d";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-r * 0.55, -r * 0.2, r * 1.1, r * 0.4);
    ctx.fillRect(-r * 0.2, -r * 0.55, r * 0.4, r * 1.1);
    ctx.restore();
  }

  drawMagnet(ctx, m) {
    const bob = Math.sin(m.bob * 3) * 1.5;
    const y = m.y + bob;
    const r = CONFIG.magnet.radius;
    ctx.save();
    ctx.translate(m.x, y);
    ctx.lineCap = "round";
    ctx.shadowColor = "#e55dff";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#e55dff";
    ctx.lineWidth = r * 0.55;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, r * 0.55);
    ctx.lineTo(-r * 0.7, -r * 0.15);
    ctx.arc(0, -r * 0.15, r * 0.7, Math.PI, 0, true);
    ctx.lineTo(r * 0.7, r * 0.55);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-r * 0.7, r * 0.55, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.7, r * 0.55, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawChest(ctx, c) {
    const bob = Math.sin(c.bob * 3) * 1.5;
    const y = c.y + bob;
    const s = 13;
    ctx.save();
    ctx.translate(c.x, y);
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#e8a33d";
    ctx.fillRect(-s, -s * 0.55, s * 2, s * 0.85);
    ctx.fillStyle = "#b06a22";
    ctx.fillRect(-s, -s * 0.05, s * 2, s * 1.15);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-s * 0.22, -s * 0.05, s * 0.44, s * 1.15);
    ctx.fillStyle = "#7a4311";
    ctx.fillRect(-s * 0.12, s * 0.1, s * 0.24, s * 0.3);
    ctx.restore();
  }

  drawGold(ctx, g) {
    const bob = Math.sin(g.bob * 3) * 1.5;
    const y = g.y + bob;
    const r = 9;
    ctx.save();
    ctx.translate(g.x, y);
    ctx.shadowColor = "#ffd166";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#fff2c0";
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCage(ctx) {
    const c = this.cage;
    ctx.fillStyle = "rgba(255, 77, 141, 0.04)";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 77, 141, 0.65)";
    ctx.lineWidth = 6;
    ctx.setLineDash([22, 16]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255, 77, 141, 0.25)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawChestWheel(ctx) {
    const w = this.screenW, h = this.screenH;
    ctx.fillStyle = "rgba(5, 6, 12, 0.78)";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2 - 24;
    const R = Math.min(w, h) * 0.3;
    const segs = this.chestSegments;
    const n = segs.length || 1;
    const seg = (Math.PI * 2) / n;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.chestRotation);
    for (let i = 0; i < n; i++) {
      const a0 = i * seg;
      ctx.fillStyle = i % 2 === 0 ? "#283250" : "#3a2a52";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a0 + seg);
      ctx.closePath();
      ctx.fill();
      const item = segs[i];
      const def = item.type === "weapon" ? weaponDef(item.id) : skillDef(item.id);
      ctx.save();
      ctx.rotate(a0 + seg / 2);
      ctx.font = Math.max(18, R / n) + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(def.icon, R * 0.62, 0);
      ctx.restore();
    }
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(cx, cy - R - 30);
    ctx.lineTo(cx - 15, cy - R - 6);
    ctx.lineTo(cx + 15, cy - R - 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("TREASURE CHEST!", cx, cy - R - 46);

    let ry = cy + R + 34;
    for (const reward of this.chestApplied) {
      const def = reward.type === "weapon" ? weaponDef(reward.id) : skillDef(reward.id);
      ctx.fillStyle = "#8ff0ff";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(def.icon + " " + def.name + "  →  Lv." + (reward.level + 1), cx, ry);
      ry += 28;
    }
    if (this.chestDone) {
      ctx.fillStyle = "#e8ecf8";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Continue...", cx, ry + 8);
    }
  }

  drawProjectiles(ctx, halfW, halfH) {
    const projs = this.projectiles;
    for (let i = 0; i < projs.length; i++) {
      const p = projs[i];
      if (!p.active) continue;
      if (!this.inView(p.x, p.y, halfW, halfH)) continue;

      if (p.kind === "boomerang") {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 4, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      if (p.kind === "plasma") {
        const pulse = 1 + Math.sin(p.age * 20) * 0.15;
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = p.friendly ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawLightning(ctx) {
    const bolts = this.lightningBolts;
    for (let i = 0; i < bolts.length; i++) {
      const b = bolts[i];
      const t = 1 - b.age / b.life;
      ctx.globalAlpha = t;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      const segs = 5;
      for (let s = 1; s < segs; s++) {
        const px = lerp(b.x1, b.x2, s / segs) + rand(-14, 14);
        const py = lerp(b.y1, b.y2, s / segs);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 230, 150, 0.5)";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawPlayer(ctx) {
    const p = this.player;

    for (const w of p.weapons) {
      if (w.id === "aura") {
        const st = effectiveStats(this, w.id, w.level);
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, st.radius);
        grad.addColorStop(0, "rgba(93, 255, 154, 0.30)");
        grad.addColorStop(0.6, "rgba(93, 255, 154, 0.13)");
        grad.addColorStop(1, "rgba(93, 255, 154, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, st.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(93, 255, 154, 0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, st.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 20) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.radius + 6);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, "#39d0ff");
    grad.addColorStop(1, "#1a5f8a");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#8ff0ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.stroke();

    const fx = p.x + Math.cos(p.facing) * (p.radius + 8);
    const fy = p.y + Math.sin(p.facing) * (p.radius + 8);
    ctx.fillStyle = "#8ff0ff";
    ctx.beginPath();
    ctx.arc(fx, fy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;

    for (const w of p.weapons) {
      if (w.id === "blades") {
        const st = effectiveStats(this, w.id, w.level);
        for (let i = 0; i < st.bladeCount; i++) {
          const a = w.angle + (i / st.bladeCount) * Math.PI * 2;
          const bx = p.x + Math.cos(a) * st.orbitRadius;
          const by = p.y + Math.sin(a) * st.orbitRadius;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = "#c9d6ff";
          ctx.beginPath();
          ctx.ellipse(0, 0, st.bladeRadius * 0.5, st.bladeRadius, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }
}
