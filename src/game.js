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
    this.arenaHalfW = 2000;
    this.arenaHalfH = 2000;
    this.decor = [];

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
    this.rerolls = 2;
    this.deletes = 1;
    this.respawnsUsed = 0;

    this.bossIndex = 0;
    this.endless = false;
    this.endlessBossTimer = 180;
    this.endlessBossCount = 0;

    this.stats = {};
    this.weaponDamage = {};
    this.weaponCleared = {};
    this.weaponHealed = {};
    this.enemySlow = 0;
    this.lastRunGold = 0;
    this.shrine = null;
    this.trader = null;
    this.masteries = {};
    this.interactCooldown = 0;
    this.interactable = null;
    this.notice = null;
    this.toasts = [];
    this.runCommitted = false;
    this.secondChanceCooldown = 0;
    this.resetStats();
  }

  resetStats() {
    this.stats = {
      enemiesKilled: 0,
      bossesKilled: 0,
      damageDealt: 0,
      xpCollected: 0,
      goldGained: 0,
      goldSpent: 0,
      elitesKilled: 0,
      eliteTanksKilled: 0,
      modifiersDefeated: 0,
      highestHit: 0,
      damageTaken: 0,
      lowHpStart: null,
      bossKilledLowHp: false,
      maxWeaponsOwned: 0,
      evolutionsThisRun: 0,
      masteriesThisRun: 0,
      rerollsThisRun: 0,
      deletesThisRun: 0,
      spawnersThisRun: 0,
      traderPurchasesThisRun: 0,
      shrineUsesThisRun: 0,
      overlordNoRespawn: false,
      overlordNoEvo: false,
      overlordLowHpNoRespawn: false,
      weaponsUsed: {},
      weaponsEvolvedThisRun: {},
      bossesDefeated: {},
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
    this.arenaHalfW = Math.round(this.screenW * CONFIG.arena.sizeMult);
    this.arenaHalfH = Math.round(this.screenH * CONFIG.arena.sizeMult);
    this.generateDecor();
  }

  generateDecor() {
    this.decor = [];
    const count = CONFIG.arena.decorCount;
    for (let i = 0; i < count; i++) {
      const type = pick(["rock", "tree", "pillar", "ruin", "wall"]);
      const x = rand(-this.arenaHalfW * 0.9, this.arenaHalfW * 0.9);
      const y = rand(-this.arenaHalfH * 0.9, this.arenaHalfH * 0.9);
      if (Math.abs(x) < 140 && Math.abs(y) < 140) continue;
      this.decor.push({ x: x, y: y, type: type, size: rand(12, 30) });
    }
  }

  clampToArena(e) {
    e.x = clamp(e.x, -this.arenaHalfW + e.radius, this.arenaHalfW - e.radius);
    e.y = clamp(e.y, -this.arenaHalfH + e.radius, this.arenaHalfH - e.radius);
  }

  createSpawner(zone) {
    const hp = zone === "easy" ? CONFIG.spawners.easyHp : zone === "medium" ? CONFIG.spawners.mediumHp : CONFIG.spawners.hardHp;
    const a = rand(Math.PI * 0.5, Math.PI);
    let t;
    if (zone === "easy") t = rand(CONFIG.world.zoneMedium + 0.05, 0.95);
    else if (zone === "medium") t = rand(CONFIG.world.zoneHard + 0.05, CONFIG.world.zoneMedium - 0.05);
    else t = rand(0.05, CONFIG.world.zoneHard - 0.05);
    const nx = Math.cos(a) * t;
    const ny = Math.sin(a) * t;
    const x = clamp(this.arenaHalfW + nx * 2 * this.arenaHalfW, -this.arenaHalfW + 40, this.arenaHalfW - 40);
    const y = clamp(-this.arenaHalfH + ny * 2 * this.arenaHalfH, -this.arenaHalfH + 40, this.arenaHalfH - 40);
    return {
      id: enemyIdCounter++,
      isSpawner: true,
      type: "spawner",
      x: x,
      y: y,
      radius: CONFIG.spawners.radius,
      hp: hp,
      maxHp: hp,
      baseHp: hp,
      zone: zone,
      spawnTimer: rand(1.5, 3),
      destroyed: false,
      elite: false,
      speed: 0,
      damage: 0,
      xpValue: 0,
      ranged: false,
      knockbackResist: 1,
      mods: [],
      shield: 0,
      lastBladeHit: [],
      lastBoomHit: 0,
      kbx: 0,
      kby: 0,
      flash: 0,
      hitFlash: 0,
    };
  }

  createSpawners() {
    const zones = ["easy", "medium", "hard"];
    for (const zone of zones) {
      for (let i = 0; i < CONFIG.spawners.perZone; i++) {
        this.enemies.push(this.createSpawner(zone));
      }
    }
  }

  killSpawner(s) {
    s.destroyed = true;
    this.stats.spawnersThisRun++;
    this.player.addXp(CONFIG.spawners.xpReward);
    this.stats.xpCollected += CONFIG.spawners.xpReward;
    Settings.gold += CONFIG.spawners.goldReward;
    this.stats.goldGained += CONFIG.spawners.goldReward;
    Settings.save();
    Particles.text(s.x, s.y - s.radius - 6, "+" + CONFIG.spawners.goldReward + " gold", "#ffd166", 16);
    Particles.burst(s.x, s.y, "#ff8a3d", 22, 220, 5);
    Particles.ring(s.x, s.y, "#ff8a3d", s.radius * 3, 0.4, 4);
    this.addShake(6);
    this.audio.play("bossDie");
  }

  createShrine() {
    const a = rand(Math.PI * 0.5, Math.PI);
    const t = CONFIG.world.zoneHard * rand(0.3, 0.7);
    const nx = Math.cos(a) * t;
    const ny = Math.sin(a) * t;
    const x = clamp(this.arenaHalfW + nx * 2 * this.arenaHalfW, -this.arenaHalfW + 50, this.arenaHalfW - 50);
    const y = clamp(-this.arenaHalfH + ny * 2 * this.arenaHalfH, -this.arenaHalfH + 50, this.arenaHalfH - 50);
    this.shrine = {
      id: "shrine", type: "shrine",
      x: x,
      y: y,
      radius: CONFIG.shrine.radius,
      uses: 0,
    };
  }

  createTrader() {
    const a = rand(Math.PI * 0.5, Math.PI);
    const t = CONFIG.world.zoneHard * rand(0.2, 0.6);
    const nx = Math.cos(a) * t;
    const ny = Math.sin(a) * t;
    const x = clamp(this.arenaHalfW + nx * 2 * this.arenaHalfW, -this.arenaHalfW + 40, this.arenaHalfW - 40);
    const y = clamp(-this.arenaHalfH + ny * 2 * this.arenaHalfH, -this.arenaHalfH + 40, this.arenaHalfH - 40);
    this.trader = {
      id: "trader", type: "trader",
      x: x,
      y: y,
      homeX: x,
      homeY: y,
      radius: CONFIG.trader.radius,
      dirX: 1, dirY: 0,
      changeTimer: rand(2, 5),
      restockTimer: rand(CONFIG.trader.restockMin, CONFIG.trader.restockMax),
      inventory: [],
    };
  }

  shrineCost() {
    return Math.floor(CONFIG.shrine.baseCost * Math.pow(CONFIG.shrine.costMult, this.shrine.uses));
  }

  traderSlotCost(rank) {
    return Math.floor(CONFIG.trader.slotBaseCost * Math.pow(CONFIG.trader.slotCostMult, rank));
  }

  updateSpawners(dt) {
    if (this.boss) return;
    for (let i = 0; i < this.enemies.length; i++) {
      const s = this.enemies[i];
      if (!s.isSpawner || s.destroyed) continue;
      const newMax = s.baseHp * difficultyMult(this).hp;
      if (newMax !== s.maxHp) {
        s.hp = s.hp * (newMax / s.maxHp);
        s.maxHp = newMax;
      }
      s.spawnTimer -= dt;
      if (s.spawnTimer <= 0) {
        s.spawnTimer = CONFIG.spawners.spawnInterval / 1000;
        if (this.enemies.length >= maxEnemies(this)) continue;
        const type = spawnerEnemyType(this, s.zone);
        const a = Math.random() * Math.PI * 2;
        const d = rand(30, 70);
        let x = s.x + Math.cos(a) * d;
        let y = s.y + Math.sin(a) * d;
        x = clamp(x, -this.arenaHalfW + 20, this.arenaHalfW - 20);
        y = clamp(y, -this.arenaHalfH + 20, this.arenaHalfH - 20);
        const e = spawnEnemy(this, type, x, y, { elite: chance(spawnerEliteChance(this, s.zone)) });
        if (e) {
          e.homeX = s.x;
          e.homeY = s.y;
          e.leashRange = 620;
        }
      }
    }
  }

  updateTrader(dt) {
    const t = this.trader;
    if (!t) return;
    t.changeTimer -= dt;
    if (t.changeTimer <= 0) {
      t.changeTimer = rand(2, 5);
      if (t.homeX != null && chance(0.7)) {
        const a = angleTo(t.x, t.y, t.homeX, t.homeY);
        t.dirX = Math.cos(a);
        t.dirY = Math.sin(a);
      } else {
        const a = Math.random() * Math.PI * 2;
        t.dirX = Math.cos(a);
        t.dirY = Math.sin(a);
      }
    }
    t.x += t.dirX * CONFIG.trader.speed * dt;
    t.y += t.dirY * CONFIG.trader.speed * dt;

    if (t.homeX != null) {
      const homeD = dist(t.x, t.y, t.homeX, t.homeY);
      if (homeD > 620) {
        const a = angleTo(t.x, t.y, t.homeX, t.homeY);
        t.x += Math.cos(a) * 40 * dt;
        t.y += Math.sin(a) * 40 * dt;
      }
    }

    t.x = clamp(t.x, -this.arenaHalfW + t.radius, this.arenaHalfW - t.radius);
    t.y = clamp(t.y, -this.arenaHalfH + t.radius, this.arenaHalfH - t.radius);

    t.restockTimer -= dt;
    if (t.restockTimer <= 0) {
      t.restockTimer = rand(CONFIG.trader.restockMin, CONFIG.trader.restockMax);
      t.inventory = this.generateTraderInventory();
      this.notice = { text: "Trader Restocked!", timer: 2.5 };
      this.audio.play("levelup");
    }
  }

  generateTraderInventory() {
    const items = [];
    items.push({ type: "reroll", name: "Reroll Token", icon: "🔄", cost: CONFIG.trader.rerollCost, description: "+1 reroll for this run" });
    items.push({ type: "delete", name: "Delete Token", icon: "🗑️", cost: CONFIG.trader.deleteCost, description: "+1 delete for this run" });
    items.push({ type: "heal", name: "Heal", icon: "💚", cost: CONFIG.trader.healCost, description: "Fully restore HP" });
    if (this.player.runWeaponSlots < CONFIG.trader.maxSlots && ChallengeRun.weaponSlots() == null) {
      items.push({ type: "slot_weapon", name: "Extra Weapon Slot", icon: "🔫", cost: this.traderSlotCost(this.player.runWeaponSlots), description: "+1 weapon slot this run" });
    }
    if (this.player.runPassiveSlots < CONFIG.trader.maxSlots) {
      items.push({ type: "slot_passive", name: "Extra Passive Slot", icon: "📦", cost: this.traderSlotCost(this.player.runPassiveSlots), description: "+1 passive slot this run" });
    }

    const buffPool = CONFIG.trader.buffs.slice();
    for (let i = 0; i < 2 && buffPool.length; i++) {
      const idx = Math.floor(Math.random() * buffPool.length);
      const b = buffPool.splice(idx, 1)[0];
      items.push({ type: "buff", id: b.id, name: b.name, icon: b.icon, cost: CONFIG.trader.buffCost, description: b.description });
    }

    for (const w of this.player.weapons) {
      if (!w.evolved) continue;
      const list = CONFIG.masteries[w.id];
      if (!list) continue;
      const owned = this.masteries[w.id] || [];
      if (owned.length >= CONFIG.mastery.maxPerWeapon) continue;
      const available = list.filter(m => !owned.includes(m.id));
      if (available.length) {
        const m = pick(available);
        const wdef = weaponDef(w.id);
        items.push({ type: "mastery", weaponId: w.id, masteryId: m.id, name: m.name, icon: m.icon, cost: m.cost || CONFIG.mastery.cost, description: wdef.name + ": " + m.description, ownedCount: owned.length, max: CONFIG.mastery.maxPerWeapon });
      }
    }

    return items;
  }

  traderBuy(item) {
    if (item.sold || Settings.gold < item.cost) return;
    const p = this.player;
    if (item.type === "slot_weapon" && (p.runWeaponSlots >= CONFIG.trader.maxSlots || ChallengeRun.weaponSlots() != null)) return;
    if (item.type === "slot_passive" && p.runPassiveSlots >= CONFIG.trader.maxSlots) return;
    Settings.gold -= item.cost;
    this.stats.goldSpent += item.cost;
    this.stats.traderPurchasesThisRun++;
    Settings.save();
    switch (item.type) {
      case "reroll": this.rerolls++; break;
      case "delete": this.deletes++; break;
      case "heal": p.hp = p.maxHp; break;
      case "slot_weapon": p.runWeaponSlots++; break;
      case "slot_passive": p.runPassiveSlots++; break;
      case "buff": {
        const b = CONFIG.trader.buffs.find(bb => bb.id === item.id);
        p.tempBuffs[b.apply] = { timer: CONFIG.trader.buffDuration, value: b.value };
        break;
      }
      case "mastery": {
        if (!this.masteries[item.weaponId]) this.masteries[item.weaponId] = [];
        this.masteries[item.weaponId].push(item.masteryId);
        this.stats.masteriesThisRun++;
        break;
      }
    }
    item.sold = true;
    this.audio.play("ding");
  }

  shrineBless(blessing) {
    const cost = this.shrineCost();
    if (Settings.gold < cost) return;
    Settings.gold -= cost;
    this.stats.goldSpent += cost;
    this.stats.shrineUsesThisRun++;
    Settings.save();
    this.shrine.uses++;
    const p = this.player;
    switch (blessing.apply) {
      case "damage": p.bonusDamage += blessing.value; break;
      case "speed": p.bonusSpeed += blessing.value; break;
      case "hp": p.bonusHp += blessing.value; p.hp += blessing.value; break;
      case "crit": p.bonusCrit += blessing.value; break;
      case "pickup": p.bonusPickup += blessing.value; break;
    }
    p.applyMaxHpChange();
    this.audio.play("levelup");
  }

  updateInteractable() {
    this.interactable = null;
    const p = this.player;
    if (this.shrine && dist(p.x, p.y, this.shrine.x, this.shrine.y) < this.shrine.radius + p.radius + 12) {
      this.interactable = "shrine";
    } else if (this.trader && dist(p.x, p.y, this.trader.x, this.trader.y) < this.trader.radius + p.radius + 12) {
      this.interactable = "trader";
    }
  }

  tryInteract() {
    if (this.state !== "PLAYING" || this.interactCooldown > 0) return;
    if (this.interactable === "shrine") {
      this.state = "SHRINE";
      UI.showShrine(this);
    } else if (this.interactable === "trader") {
      this.state = "TRADER";
      UI.showTrader(this);
    }
  }

  closeShop() {
    this.state = "PLAYING";
    UI.hideAll();
    this.interactCooldown = 1;
  }

  startRun() {
    ChallengeRun.clear();
    this._beginRun();
  }

  startChallengeRun(id) {
    ChallengeRun.begin(id);
    this._beginRun();
    this._applyChallengeRules();
  }

  commitRunIfNeeded() {
    if (this.player && !this.runCommitted) {
      Achievements.commitRun(this);
      this.runCommitted = true;
    }
  }

  _applyChallengeRules() {
    const sl = ChallengeRun.speedLock();
    if (sl != null) {
      this.speedMult = sl;
      UI.updateSpeedLabel(this);
    }
  }

  _beginRun() {
    this.commitRunIfNeeded();
    this.runCommitted = false;
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
    this.rerolls = 2;
    this.deletes = 1;
    this.respawnsUsed = 0;
    this.bossIndex = 0;
    this.endless = false;
    this.endlessBossTimer = 180;
    this.endlessBossCount = 0;
    this.resetStats();
    this.weaponDamage = {};
    this.weaponCleared = {};
    this.weaponHealed = {};
    this.enemySlow = 0;
    this.lastRunGold = 0;
    this.masteries = {};
    this.interactCooldown = 0;
    this.notice = null;
    this.toasts = [];
    this.secondChanceCooldown = 0;
    this.shrine = null;
    this.trader = null;
    this.createSpawners();
    this.createShrine();
    this.createTrader();
    this.camera.snapTo(this.player.x, this.player.y);
    this.state = "PLAYING";
    UI.hideAll();
    UI.refreshBuild(this);
    this.audio.resume();
    this.audio.startMusic();
  }

  toMenu() {
    this.commitRunIfNeeded();
    ChallengeRun.clear();
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

  reroll() {
    if (this.state !== "LEVEL_UP") return;
    if (this.rerolls <= 0) return;
    this.rerolls--;
    this.stats.rerollsThisRun++;
    this.currentChoices = generateChoices(this.player);
    UI.showUpgrades(this, this.currentChoices);
    this.audio.play("click");
  }

  deleteItem(type, id) {
    if (this.deletes <= 0) return;
    const p = this.player;
    let removed = false;
    if (type === "weapon") {
      const idx = p.weapons.findIndex(w => w.id === id);
      if (idx !== -1) { p.weapons.splice(idx, 1); removed = true; }
    } else {
      const idx = p.passives.findIndex(s => s.id === id);
      if (idx !== -1) { p.passives.splice(idx, 1); removed = true; }
    }
    if (!removed) return;
    this.deletes--;
    this.stats.deletesThisRun++;
    p.applyMaxHpChange();
    UI.refreshBuild(this);
    UI.populatePauseBuild(this);
    this.audio.play("click");
  }

  addShake(amount) {
    if (Settings.shake) this.camera.addShake(amount);
  }

  queueAchievementToasts(list) {
    for (const a of list) {
      this.toasts.push({ icon: a.icon, name: a.name, timer: 4 });
    }
    if (list.length) this.audio.play("levelup");
  }

  updateAchievementToasts(dt) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].timer -= dt;
      if (this.toasts[i].timer <= 0) this.toasts.splice(i, 1);
    }
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
    const dmg = baseDamage * mult * (crit ? this.player.critDamage : 1);
    e.hitFlash = 0.08;
    this.stats.damageDealt += dmg;
    if (dmg > this.stats.highestHit) this.stats.highestHit = dmg;
    this.trackDamage(sourceId, dmg);

    if (e.shield > 0) {
      e.shield -= dmg;
      if (e.shield <= 0) {
        const overflow = -e.shield;
        e.shield = 0;
        Particles.ring(e.x, e.y, "#c9d6ff", e.radius * 2.5, 0.35, 4);
        Particles.burst(e.x, e.y, "#c9d6ff", 14, 180, 4);
        if (overflow > 0) {
          e.hp -= overflow;
          if (crit) Particles.text(e.x, e.y - e.radius - 4, Math.round(overflow) + "!", "#ffd166", 17);
          else Particles.text(e.x, e.y - e.radius - 4, Math.round(overflow), "#e8ecf8", 12);
          if (e.hp <= 0) this.killEnemy(e, sourceId);
        }
      } else {
        if (crit) Particles.text(e.x, e.y - e.radius - 4, "shield!", "#c9d6ff", 14);
        else if (chance(0.15)) Particles.text(e.x, e.y - e.radius - 4, Math.round(dmg), "#c9d6ff", 12);
      }
      return;
    }

    e.hp -= dmg;
    if (crit) Particles.text(e.x, e.y - e.radius - 4, Math.round(dmg) + "!", "#ffd166", 17);
    else if (chance(0.18)) Particles.text(e.x, e.y - e.radius - 4, Math.round(dmg), "#e8ecf8", 12);
    if (e.hp <= 0) this.killEnemy(e, sourceId);
  }

  hitBoss(baseDamage, sourceId) {
    const b = this.boss;
    const crit = chance(this.player.critChance);
    const dmg = baseDamage * this.player.damageMultiplier() * (crit ? this.player.critDamage : 1);
    b.hitFlash = 0.08;
    this.stats.damageDealt += dmg;
    if (dmg > this.stats.highestHit) this.stats.highestHit = dmg;
    this.trackDamage(sourceId, dmg);

    if (b.shieldActive && b.shield > 0) {
      b.shield -= dmg;
      if (b.shield <= 0) {
        b.shield = 0;
        b.shieldActive = false;
        b.shieldTimer = 8;
        Particles.ring(b.x, b.y, "#c9d6ff", b.radius * 2, 0.45, 5);
        Particles.burst(b.x, b.y, "#c9d6ff", 22, 260, 5);
        this.audio.play("nova");
      }
      if (crit) Particles.text(b.x, b.y - b.radius - 10, "shield!", "#c9d6ff", 16);
      else if (chance(0.2)) Particles.text(b.x, b.y - b.radius - 10, Math.round(dmg), "#c9d6ff", 13);
      return;
    }

    b.hp -= dmg;
    if (crit) Particles.text(b.x, b.y - b.radius - 10, Math.round(dmg) + "!", "#ffd166", 18);
    else Particles.text(b.x, b.y - b.radius - 10, Math.round(dmg), "#e8ecf8", 13);
    if (b.hp <= 0) this.killBoss();
  }

  killEnemy(e, sourceId) {
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) {
      this.enemies[idx] = this.enemies[this.enemies.length - 1];
      this.enemies.pop();
    }
    if (e.isSpawner) {
      this.killSpawner(e);
      return;
    }
    this.stats.enemiesKilled++;
    if (e.elite) {
      this.stats.elitesKilled++;
      if (e.type === "tank") this.stats.eliteTanksKilled++;
      if (e.mods && e.mods.length) this.stats.modifiersDefeated++;
    }
    this.dropGem(e.x, e.y, e.xpValue);
    if (chance(CONFIG.gold.enemyChance)) this.dropGold(e.x, e.y, CONFIG.gold.enemyAmount);
    if (sourceId) {
      const mIds = this.masteries[sourceId] || [];
      for (const mid of mIds) {
        const m = findMastery(sourceId, mid);
        if (m && m.xpOnKill) {
          this.player.addXp(m.xpOnKill);
          this.stats.xpCollected += m.xpOnKill;
          Particles.text(e.x, e.y - e.radius - 8, "+" + m.xpOnKill + " XP", "#6adcff", 12);
        }
      }
    }
    Particles.burst(e.x, e.y, e.elite ? "#ff8a3d" : e.color, e.elite ? 18 : 8, e.elite ? 200 : 120, e.elite ? 5 : 3);
    if (chance(0.5)) this.audio.play("enemyDie");
    if (e.elite) {
      this.addShake(2);
      Particles.ring(e.x, e.y, "#ff8a3d", e.radius * 4, 0.3, 3);
    }
    if (e.mods && e.mods.includes("split")) {
      const mult = difficultyMult(this);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        this.enemies.push(createEnemy("swarm", e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, {
          hpMult: mult.hp, dmgMult: mult.dmg, speedMult: mult.speed,
        }));
      }
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
        this.stats.goldGained += g.amount;
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
      this.stats.goldGained += CONFIG.gold.chestAmount;
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
    const x = clamp(this.player.x + Math.cos(a) * d, -this.arenaHalfW + 20, this.arenaHalfW - 20);
    const y = clamp(this.player.y + Math.sin(a) * d, -this.arenaHalfH + 20, this.arenaHalfH - 20);
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

  hitPlayer(dmg, source) {
    const p = this.player;
    if (p.invulnTimer > 0) return false;
    const applied = p.takeDamage(dmg);
    if (!applied) return false;
    this.stats.damageTaken += dmg;
    Particles.burst(p.x, p.y, "#ff5f6d", 12, 180, 4);
    this.addShake(7);
    this.audio.play("playerHit");
    if (p.hp <= 0) {
      if (this.trySecondChance(source)) return true;
      p.hp = 0;
      this.endRun();
    }
    return true;
  }

  trySecondChance(source) {
    const p = this.player;
    const level = p.skillLevel("second_chance");
    if (level <= 0 || this.secondChanceCooldown > 0) return false;
    const def = skillDef("second_chance");
    const invuln = def.invulns[level - 1];
    const cd = def.cooldowns[level - 1];
    p.hp = 1;
    p.invulnTimer = invuln;
    this.secondChanceCooldown = cd;
    if (source && this.enemies.includes(source)) {
      this.killEnemy(source, null);
    }
    Particles.ring(p.x, p.y, "#6dff9a", 130, 0.5, 6);
    Particles.burst(p.x, p.y, "#6dff9a", 26, 260, 5);
    this.addShake(4);
    this.audio.play("nova");
    this.notice = { text: "💖 Second Chance!", timer: 2.5 };
    return true;
  }

  spawnBoss(type) {
    const boss = createBoss(type, this.time);
    const cageRadius = Math.min(CONFIG.bossArena.cageRadius, Math.max(300, Math.min(this.screenW, this.screenH) * 0.55));
    const a = Math.random() * Math.PI * 2;
    const d = cageRadius * 0.5;
    boss.x = clamp(this.player.x + Math.cos(a) * d, -this.arenaHalfW + boss.radius, this.arenaHalfW - boss.radius);
    boss.y = clamp(this.player.y + Math.sin(a) * d, -this.arenaHalfH + boss.radius, this.arenaHalfH - boss.radius);
    boss.type = type;
    this.boss = boss;
    this.enemies = this.enemies.filter(e => e.isSpawner);
    this.cage = { x: this.player.x, y: this.player.y, radius: cageRadius };
    this.bossWarning = 2.2;
    this.audio.play("bossSpawn");
    this.addShake(8);
  }

  spawnEndlessBoss(type) {
    const boss = createBoss(type, this.time);
    const a = Math.random() * Math.PI * 2;
    const d = this.spawnRadius * 0.6;
    boss.x = clamp(this.player.x + Math.cos(a) * d, -this.arenaHalfW + boss.radius, this.arenaHalfW - boss.radius);
    boss.y = clamp(this.player.y + Math.sin(a) * d, -this.arenaHalfH + boss.radius, this.arenaHalfH - boss.radius);
    boss.isEndless = true;
    boss.type = type;
    this.boss = boss;
    this.bossWarning = 2.2;
    this.audio.play("bossSpawn");
    this.addShake(8);
  }

  killBoss() {
    const boss = this.boss;
    const per = Math.round(boss.xp / 3);
    if (boss.isEndless) {
      for (let i = 0; i < 6; i++) {
        this.dropGem(boss.x + rand(-80, 80), boss.y + rand(-80, 80), per);
      }
      this.dropGold(boss.x + rand(-20, 20), boss.y + rand(-20, 20), 25);
      this.dropHeal(boss.x + rand(-20, 20), boss.y + rand(-20, 20), CONFIG.heal.amount);
    } else {
      for (let i = 0; i < CONFIG.bossArena.chestCrystals; i++) {
        this.dropGem(boss.x + rand(-80, 80), boss.y + rand(-80, 80), per);
      }
      this.dropChest(boss.x, boss.y);
      this.dropMagnet(boss.x + rand(-30, 30), boss.y + rand(-30, 30));
      const heals = randInt(CONFIG.bossArena.bossHealsMin, CONFIG.bossArena.bossHealsMax);
      for (let i = 0; i < heals; i++) {
        this.dropHeal(boss.x + rand(-50, 50), boss.y + rand(-50, 50), CONFIG.heal.amount);
      }
      const isFinalBoss = boss.final === true;
      const goldTotal = isFinalBoss ? CONFIG.gold.bossAmountFinal : CONFIG.gold.bossAmountMid;
      if (isFinalBoss) {
        Settings.gold += goldTotal;
        this.stats.goldGained += goldTotal;
        Settings.save();
        this.lastRunGold = goldTotal;
        Particles.text(this.player.x, this.player.y - 44, "+" + goldTotal + " gold", "#ffd166", 18);
      } else {
        const coins = 4;
        for (let i = 0; i < coins; i++) {
          this.dropGold(boss.x + rand(-70, 70), boss.y + rand(-70, 70), Math.round(goldTotal / coins));
        }
      }
    }
    Particles.burst(boss.x, boss.y, boss.color, 40, 320, 6);
    Particles.ring(boss.x, boss.y, boss.color, boss.radius * 3, 0.5, 6);
    this.addShake(12);
    this.audio.play("bossDie");
    this.stats.bossesKilled++;
    if (boss.type) this.stats.bossesDefeated[boss.type] = true;
    if (this.player.hp <= this.player.maxHp * 0.1) this.stats.bossKilledLowHp = true;
    if (boss.type === "overlord") {
      if (this.respawnsUsed === 0) this.stats.overlordNoRespawn = true;
      if (!this.player.weapons.some(w => w.evolved)) this.stats.overlordNoEvo = true;
      if (this.respawnsUsed === 0 && this.player.hp <= this.player.maxHp * 0.1) this.stats.overlordLowHpNoRespawn = true;
    }
    if (boss.type === "overlord" && !boss.isEndless) {
      ChallengeRun.onOverlordKilled(this);
    }
    this.boss = null;
    this.cage = null;
  }

  score() {
    const e = CONFIG.endless;
    return Math.floor(
      this.time * e.scoreTime +
      this.stats.enemiesKilled * e.scoreKill +
      this.stats.damageDealt * e.scoreDamage +
      this.stats.bossesKilled * e.scoreBoss
    );
  }

  endRun() {
    this.state = "GAME_OVER";
    if (ChallengeRun.isActive() && !ChallengeRun.completed && !ChallengeRun.failed) {
      ChallengeRun.fail("Defeated before defeating the Overlord");
    }
    if (Settings.bestTime < this.time) {
      Settings.bestTime = this.time;
      Settings.save();
    }
    const stats = [
      { label: "Time Survived", value: formatTime(this.time) },
      { label: "Level", value: this.player.level },
      { label: "Enemies Defeated", value: this.stats.enemiesKilled },
      { label: "Bosses Defeated", value: this.stats.bossesKilled },
      { label: "Score", value: this.score() },
      { label: "Gold Gained", value: "+" + Math.round(this.stats.goldGained) },
      { label: "Gold Spent", value: "-" + Math.round(this.stats.goldSpent) },
    ];
    UI.showStats(UI.el["stats-gameover"], stats);
    UI.showWeaponStats(UI.el["weapon-stats"], this.buildWeaponBreakdown());
    UI.show("gameover");
    UI.updateBestScore();
    UI.updateGold();
    UI.updateRespawnButton(this);
    UI.updateGameoverChallenge(this);
    UI.updateGameoverButtons(this);
    this.audio.play("defeat");
  }

  respawnCost() {
    return CONFIG.respawn.costs[this.respawnsUsed] || 0;
  }

  respawn() {
    if (this.state !== "GAME_OVER") return;
    if (ChallengeRun.noRespawn()) return;
    if (this.respawnsUsed >= CONFIG.respawn.maxRespawns) return;
    const cost = this.respawnCost();
    if (Settings.gold < cost) return;
    Settings.gold -= cost;
    Settings.save();
    this.respawnsUsed++;
    if (ChallengeRun.isActive()) ChallengeRun.clearFail();
    const p = this.player;
    p.hp = p.maxHp * CONFIG.respawn.hpPercent;
    p.invulnTimer = CONFIG.respawn.invulnTime;
    for (const e of this.enemies) {
      if (e.isSpawner) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < 420) {
        const a = angleTo(p.x, p.y, e.x, e.y);
        e.kbx += Math.cos(a) * 820;
        e.kby += Math.sin(a) * 820;
      }
    }
    this.state = "PLAYING";
    UI.hideAll();
    this.audio.play("levelup");
  }

  buildWeaponBreakdown() {
    const total = this.stats.damageDealt || 0;
    const ids = new Set();
    for (const id in this.weaponDamage) ids.add(id);
    for (const id in this.weaponCleared) ids.add(id);
    for (const id in this.weaponHealed) ids.add(id);
    const lines = [];
    for (const id of ids) {
      const def = weaponDef(id);
      if (!def) continue;
      const dmg = this.weaponDamage[id] || 0;
      const cleared = this.weaponCleared[id] || 0;
      const healed = this.weaponHealed[id] || 0;
      const pct = total > 0 ? Math.round(dmg / total * 100) : 0;
      lines.push({ icon: def.icon, name: def.name, dmg: Math.round(dmg), pct: pct, cleared: cleared, healed: Math.round(healed) });
    }
    lines.sort((a, b) => b.dmg - a.dmg);
    return lines;
  }

  updatePlaying(dt) {
    this.time += dt;
    const p = this.player;

    if (p.weapons.length > this.stats.maxWeaponsOwned) this.stats.maxWeaponsOwned = p.weapons.length;
    for (const w of p.weapons) this.stats.weaponsUsed[w.id] = true;
    if (this.stats.lowHpStart == null && p.hp <= p.maxHp * 0.1) this.stats.lowHpStart = this.time;

    this.camera.follow(p.x, p.y, dt);

    const move = Input.getMoveVector();
    p.move(dt, move);
    if (this.cage) this.clampToCage(p);
    this.clampToArena(p);

    if (p.invulnTimer > 0) p.invulnTimer -= dt;
    if (p.overloadTimer > 0) p.overloadTimer -= dt;
    if (this.enemySlow > 0) this.enemySlow -= dt;
    p.tickBuffs(dt);
    if (this.interactCooldown > 0) this.interactCooldown -= dt;
    if (this.secondChanceCooldown > 0) this.secondChanceCooldown -= dt;

    updateWeapons(this, dt);
    updateProjectiles(this, dt);
    updateEnemies(this, dt);

    if (this.boss) {
      this.boss.update(this, dt);
      if (this.cage) this.clampToCage(this.boss);
      this.clampToArena(this.boss);
      if (dist(p.x, p.y, this.boss.x, this.boss.y) < this.boss.radius + p.radius) {
        this.hitPlayer(this.boss.getDamage(), this.boss);
      }
    }

    updateSpawner(this, dt);
    this.updateSpawners(dt);
    this.updateTrader(dt);

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

    const schedule = CONFIG.bossSchedule;
    while (this.bossIndex < schedule.length && this.time >= schedule[this.bossIndex].time) {
      this.spawnBoss(schedule[this.bossIndex].type);
      this.bossIndex++;
    }
    if (this.bossIndex >= schedule.length) this.endless = true;

    if (this.endless && !this.boss) {
      this.endlessBossTimer -= dt;
      if (this.endlessBossTimer <= 0) {
        this.endlessBossTimer = CONFIG.endless.bossInterval;
        const types = ["warden", "tyrant", "leviathan", "overlord"];
        this.spawnEndlessBoss(types[this.endlessBossCount % types.length]);
        this.endlessBossCount++;
      }
    }

    this.checkLevelUp();

    if (this.notice) {
      this.notice.timer -= dt;
      if (this.notice.timer <= 0) this.notice = null;
    }

    this.updateInteractable();

    Particles.update(dt);
    this.camera.update(dt);
    UI.updateHUD(this);
    const unlocked = Achievements.check(this);
    if (unlocked.length) this.queueAchievementToasts(unlocked);
    this.updateAchievementToasts(dt);
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
              this.hitBoss(p.damage * (p.returning ? p.returnMult : 1), p.weaponId);
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
          this.damageEnemy(e, p.damage * (p.returning ? p.returnMult : 1), p.weaponId);
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
        this.hitPlayer(pr.damage, pr);
      }
    }
  }

  handleEnemyContact() {
    const p = this.player;
    const enemies = this.enemies;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.isSpawner) continue;
      const rr = e.radius + p.radius;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        const applied = this.hitPlayer(e.damage, e);
        if (applied && e.mods && e.mods.includes("vampiric")) {
          e.hp = Math.min(e.hp + e.damage * 0.6, e.maxHp);
          Particles.text(e.x, e.y - e.radius - 4, "+", "#ff5f6d", 13);
        }
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
      if (ChallengeRun.autoLevelUp()) {
        this.autoLevelUp();
        return;
      }
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

  autoLevelUp() {
    const p = this.player;
    while (this.pendingLevelUps > 0) {
      const choices = generateChoices(p);
      const choice = pick(choices);
      applyUpgrade(this, choice);
      this.pendingLevelUps--;
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
    if (ChallengeRun.speedLock() != null) return;
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
    this.drawArenaBorder(ctx);
    if (Input.zHeld()) this.drawZones(ctx);
    for (const d of this.decor) {
      if (this.inView(d.x, d.y, halfW, halfH)) this.drawDecorItem(ctx, d);
    }
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
    if (this.shrine && this.inView(this.shrine.x, this.shrine.y, halfW, halfH)) this.drawShrine(ctx);
    if (this.trader && this.inView(this.trader.x, this.trader.y, halfW, halfH)) this.drawTrader(ctx);
    this.drawProjectiles(ctx, halfW, halfH);
    this.drawLightning(ctx);
    if (this.player) this.drawPlayer(ctx);
    Particles.draw(ctx);

    ctx.restore();

    this.drawVignette(ctx);

    if (this.interactable && this.state === "PLAYING") {
      ctx.fillStyle = "#e8ecf8";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Press E to " + (this.interactable === "shrine" ? "use the shrine" : "trade"), this.screenW / 2, this.screenH * 0.66);
    }

    if (this.player && this.state !== "MENU") {
      this.drawBuffBars(ctx);
    }

    if (this.notice) {
      ctx.globalAlpha = clamp(this.notice.timer, 0, 1);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(this.notice.text, this.screenW / 2, this.screenH * 0.22);
      ctx.globalAlpha = 1;
    }

    if (this.bossWarning > 0) {
      ctx.globalAlpha = clamp(this.bossWarning, 0, 1);
      ctx.fillStyle = "#ff4d8d";
      ctx.font = "bold 42px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠ WARNING ⚠", this.screenW / 2, this.screenH * 0.3);
      ctx.globalAlpha = 1;
    }

    this.drawAchievementToasts(ctx);

    if (this.state === "CHEST") {
      this.drawChestWheel(ctx);
    }

    if (this.player && this.state !== "MENU") {
      this.drawMinimap(ctx);
    }
  }

  inView(x, y, halfW, halfH) {
    const dx = x - this.camera.x;
    const dy = y - this.camera.y;
    return dx > -halfW - 80 && dx < halfW + 80 && dy > -halfH - 80 && dy < halfH + 80;
  }

  drawBackground(ctx, halfW, halfH) {
    const tile = 170;
    const left = Math.floor((this.camera.x - halfW) / tile) * tile;
    const right = this.camera.x + halfW;
    const top = Math.floor((this.camera.y - halfH) / tile) * tile;
    const bottom = this.camera.y + halfH;

    ctx.fillStyle = "#12100d";
    ctx.fillRect(left, top, right - left, bottom - top);

    for (let x = left; x <= right; x += tile) {
      for (let y = top; y <= bottom; y += tile) {
        const v = tileHash(Math.floor(x / tile), Math.floor(y / tile));
        const shade = 0.03 + v * 0.055;
        ctx.fillStyle = "rgba(96, 88, 76, " + shade.toFixed(4) + ")";
        ctx.fillRect(x, y, tile, tile);
      }
    }

    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = left; x <= right; x += tile) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
    for (let y = top; y <= bottom; y += tile) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
    ctx.stroke();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
    ctx.lineWidth = 1;
    for (let x = left; x <= right; x += tile) {
      for (let y = top; y <= bottom; y += tile) {
        const v = tileHash(Math.floor(x / tile) + 71, Math.floor(y / tile) - 29);
        if (v > 0.7) {
          ctx.beginPath();
          ctx.moveTo(x + v * tile, y + (1 - v) * tile);
          ctx.lineTo(x + v * tile + (v - 0.5) * 46, y + (1 - v) * tile - 24);
          ctx.lineTo(x + v * tile + (v - 0.5) * 46 + 8, y + (1 - v) * tile - 30);
          ctx.stroke();
        }
      }
    }
  }

  drawArenaBorder(ctx) {
    const w = this.arenaHalfW, h = this.arenaHalfH;
    ctx.fillStyle = "rgba(10, 14, 26, 0.35)";
    ctx.fillRect(-w - 40, -h - 40, w * 2 + 80, h * 2 + 80);
    ctx.strokeStyle = "rgba(57, 208, 255, 0.35)";
    ctx.lineWidth = 6;
    ctx.strokeRect(-w, -h, w * 2, h * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(-w + 8, -h + 8, w * 2 - 16, h * 2 - 16);
  }

  drawVignette(ctx) {
    const w = this.screenW, h = this.screenH;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  drawZones(ctx) {
    const cx = this.arenaHalfW, cy = -this.arenaHalfH;
    const rxM = this.arenaHalfW * 2 * CONFIG.world.zoneMedium;
    const ryM = this.arenaHalfH * 2 * CONFIG.world.zoneMedium;
    const rxH = this.arenaHalfW * 2 * CONFIG.world.zoneHard;
    const ryH = this.arenaHalfH * 2 * CONFIG.world.zoneHard;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-this.arenaHalfW, -this.arenaHalfH, this.arenaHalfW * 2, this.arenaHalfH * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(110, 255, 154, 0.08)";
    ctx.fillRect(-this.arenaHalfW, -this.arenaHalfH, this.arenaHalfW * 2, this.arenaHalfH * 2);
    ctx.fillStyle = "rgba(255, 209, 102, 0.10)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rxM, ryM, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 77, 109, 0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, rxH, ryH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  getActiveBuffs() {
    if (!this.player) return [];
    const buffs = [];
    const p = this.player;
    const defs = {};
    for (const b of CONFIG.trader.buffs) defs[b.apply] = b;
    for (const key in p.tempBuffs) {
      if (p.tempBuffs[key].timer > 0) {
        const def = defs[key];
        buffs.push({ icon: def ? def.icon : "✨", name: def ? def.name : key, timer: p.tempBuffs[key].timer, max: CONFIG.trader.buffDuration });
      }
    }
    if (p.overloadTimer > 0) buffs.push({ icon: "⚡", name: "Overload", timer: p.overloadTimer, max: 10 });
    if (this.enemySlow > 0) buffs.push({ icon: "⏳", name: "Time Warp", timer: this.enemySlow, max: 8 });
    return buffs;
  }

  drawBuffBars(ctx) {
    const buffs = this.getActiveBuffs();
    if (!buffs.length) return;
    const w = 168, h = 20;
    const gap = 6;
    const total = buffs.length * w + (buffs.length - 1) * gap;
    let x = (this.screenW - total) / 2;
    const y = this.screenH - 88;
    for (const b of buffs) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(57, 208, 255, 0.65)";
      ctx.fillRect(x, y, w * clamp(b.timer / b.max, 0, 1), h);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(b.icon + " " + b.name + " " + Math.ceil(b.timer) + "s", x + 4, y + h / 2);
      x += w + gap;
    }
  }

  drawAchievementToasts(ctx) {
    if (!this.toasts.length) return;
    const w = 300, h = 42;
    let y = 96;
    for (const t of this.toasts) {
      const alpha = clamp(t.timer > 0.5 ? 1 : t.timer * 2, 0, 1);
      const x = this.screenW / 2 - w / 2;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(10, 14, 26, 0.88)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#ffd166";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("🏆  " + t.icon + "  " + t.name, x + 14, y + h / 2);
      ctx.globalAlpha = 1;
      y += h + 8;
    }
  }

  drawDecorItem(ctx, d) {
    const s = d.size;
    ctx.save();
    ctx.translate(d.x, d.y);

    switch (d.type) {
      case "rock": {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(s * 0.05, s * 0.25, s * 1.05, s * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createLinearGradient(-s, -s * 0.7, s * 0.6, s * 0.6);
        g.addColorStop(0, "#8f99ac");
        g.addColorStop(0.5, "#5d6577");
        g.addColorStop(1, "#343b49");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-s * 0.95, s * 0.1);
        ctx.lineTo(-s * 0.55, -s * 0.6);
        ctx.lineTo(s * 0.15, -s * 0.75);
        ctx.lineTo(s * 0.9, -s * 0.15);
        ctx.lineTo(s * 0.6, s * 0.45);
        ctx.lineTo(-s * 0.3, s * 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.16)";
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, -s * 0.45);
        ctx.lineTo(-s * 0.1, -s * 0.65);
        ctx.lineTo(s * 0.2, -s * 0.55);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "tree": {
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(0, s * 0.35, s * 0.9, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4e3421";
        ctx.beginPath();
        ctx.moveTo(-s * 0.16, 0);
        ctx.lineTo(-s * 0.22, s * 0.75);
        ctx.lineTo(s * 0.22, s * 0.75);
        ctx.lineTo(s * 0.16, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#2f5d39";
        ctx.beginPath(); ctx.arc(-s * 0.32, -s * 0.25, s * 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.3, -s * 0.3, s * 0.48, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -s * 0.62, s * 0.58, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#477f4e";
        ctx.beginPath(); ctx.arc(-s * 0.15, -s * 0.5, s * 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.18, -s * 0.42, s * 0.28, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case "pillar": {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(0, s * 0.3, s * 0.6, s * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
        const g = ctx.createLinearGradient(-s * 0.4, 0, s * 0.4, 0);
        g.addColorStop(0, "#7e8594");
        g.addColorStop(0.45, "#c6cad4");
        g.addColorStop(1, "#5f6674");
        ctx.fillStyle = g;
        ctx.fillRect(-s * 0.4, -s * 1.2, s * 0.8, s * 1.7);
        ctx.strokeStyle = "rgba(0,0,0,0.13)";
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * s * 0.14, -s * 1.1);
          ctx.lineTo(i * s * 0.14, s * 0.4);
          ctx.stroke();
        }
        ctx.fillStyle = "#616978";
        ctx.fillRect(-s * 0.52, s * 0.35, s * 1.04, s * 0.22);
        ctx.fillStyle = "#cdd0d8";
        ctx.beginPath();
        ctx.moveTo(-s * 0.42, -s * 1.2);
        ctx.lineTo(-s * 0.15, -s * 1.4);
        ctx.lineTo(s * 0.2, -s * 1.22);
        ctx.lineTo(s * 0.42, -s * 1.32);
        ctx.lineTo(s * 0.42, -s * 1.05);
        ctx.lineTo(-s * 0.42, -s * 1.05);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
      case "ruin":
      case "wall": {
        ctx.fillStyle = "rgba(0,0,0,0.28)";
        ctx.beginPath();
        ctx.ellipse(0, s * 0.25, s * 1.1, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        const h = d.type === "wall" ? s * 0.9 : s * 0.55;
        const g = ctx.createLinearGradient(0, -h, 0, s * 0.4);
        g.addColorStop(0, "#9c8770");
        g.addColorStop(1, "#6b5a49");
        ctx.fillStyle = g;
        ctx.fillRect(-s, -h, s * 2, h + s * 0.4);
        ctx.strokeStyle = "rgba(0,0,0,0.28)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-s, -h + h * 0.5); ctx.lineTo(s, -h + h * 0.5);
        ctx.moveTo(-s * 0.5, -h); ctx.lineTo(-s * 0.5, s * 0.4);
        ctx.moveTo(0, -h); ctx.lineTo(0, s * 0.4);
        ctx.moveTo(s * 0.5, -h); ctx.lineTo(s * 0.5, s * 0.4);
        ctx.stroke();
        ctx.strokeRect(-s, -h, s * 2, h + s * 0.4);
        break;
      }
    }

    ctx.restore();
  }

  drawMinimap(ctx) {
    const size = 130;
    const pad = 12;
    const mx = this.screenW - size - pad;
    const my = 76;
    const sx = size / (this.arenaHalfW * 2);
    const sy = size / (this.arenaHalfH * 2);
    const toMapX = (x) => mx + (x + this.arenaHalfW) * sx;
    const toMapY = (y) => my + (y + this.arenaHalfH) * sy;

    ctx.fillStyle = "rgba(6, 8, 16, 0.6)";
    ctx.fillRect(mx - 3, my - 3, size + 6, size + 6);
    ctx.strokeStyle = "rgba(57, 208, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(mx, my, size, size);

    if (Input.zHeld()) {
      const zcx = mx + size, zcy = my;
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx, my, size, size);
      ctx.clip();
      ctx.fillStyle = "rgba(110, 255, 154, 0.18)";
      ctx.fillRect(mx, my, size, size);
      ctx.fillStyle = "rgba(255, 209, 102, 0.22)";
      ctx.beginPath();
      ctx.arc(zcx, zcy, size * CONFIG.world.zoneMedium, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 77, 109, 0.32)";
      ctx.beginPath();
      ctx.arc(zcx, zcy, size * CONFIG.world.zoneHard, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (this.boss) {
      ctx.fillStyle = "#ff4d8d";
      ctx.beginPath();
      ctx.arc(toMapX(this.boss.x), toMapY(this.boss.y), 5, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const e of this.enemies) {
      if (e.isSpawner && !e.destroyed) {
        ctx.fillStyle = "#ff8a3d";
        ctx.fillRect(toMapX(e.x) - 3, toMapY(e.y) - 3, 6, 6);
      } else if (e.elite && e.type === "tank") {
        ctx.fillStyle = "#ff8a3d";
        ctx.fillRect(toMapX(e.x) - 1, toMapY(e.y) - 1, 3, 3);
      }
    }

    if (this.shrine) {
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(toMapX(this.shrine.x) - 3, toMapY(this.shrine.y) - 3, 6, 6);
    }
    if (this.trader) {
      ctx.fillStyle = "#e8ecf8";
      ctx.fillRect(toMapX(this.trader.x) - 3, toMapY(this.trader.y) - 3, 6, 6);
    }

    ctx.fillStyle = "#e55dff";
    for (const m of this.magnets) ctx.fillRect(toMapX(m.x) - 1, toMapY(m.y) - 1, 2, 2);
    ctx.fillStyle = "#6dff9a";
    for (const h of this.heals) ctx.fillRect(toMapX(h.x) - 1, toMapY(h.y) - 1, 2, 2);

    if (this.player) {
      ctx.fillStyle = "#39d0ff";
      ctx.beginPath();
      ctx.arc(toMapX(this.player.x), toMapY(this.player.y), 4, 0, Math.PI * 2);
      ctx.fill();
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

  drawShrine(ctx) {
    const s = this.shrine;
    const r = s.radius;
    const pulse = 0.6 + Math.sin(performance.now() / 400) * 0.3;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = "#3a2a10";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 3;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.lineTo(r * 0.45, 0);
    ctx.lineTo(0, r * 0.55);
    ctx.lineTo(-r * 0.45, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawTrader(ctx) {
    const t = this.trader;
    const r = t.radius;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.fillStyle = "#2f4a3a";
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6dff9a";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#e8ecf8";
    ctx.font = "bold " + Math.round(r * 1.1) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🏪", 0, 2);
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
        const st = effectiveStats(this, w);
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
        const st = effectiveStats(this, w);
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
