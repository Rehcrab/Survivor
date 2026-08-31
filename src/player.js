class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.radius = CONFIG.player.radius;
    this.level = 1;
    this.xp = 0;
    this.xpToNext = xpForLevel(1);
    this.weapons = [];
    this.passives = [];
    this.invulnTimer = 0;
    this.facing = 0;
    this.regen = 0;
    this.overflowHp = 0;
    this.overflowDamage = 0;
    this.overflowSpeed = 0;
    this.overloadTimer = 0;
    this.hp = this.maxHp;
  }

  get maxHp() {
    return CONFIG.player.maxHp + this.toughnessLevel * 30 + Settings.accountRank("start_hp") * 25 + this.overflowHp;
  }

  get speed() {
    return CONFIG.player.speed * (1 + this.swiftFeetLevel * 0.12) * (1 + this.overflowSpeed);
  }

  get pickupRadius() {
    return CONFIG.player.basePickupRadius * (1 + this.magnetLevel * 0.4);
  }

  get critChance() {
    return CONFIG.player.baseCritChance + this.criticalLevel * 0.08 + Settings.accountRank("crit_chance") * 0.05;
  }

  get critDamage() {
    return CONFIG.player.critDamage + Settings.accountRank("crit_damage") * 0.25;
  }

  get maxWeapons() {
    return CONFIG.player.maxWeapons + (Settings.accountRank("weapon_slot") > 0 ? 1 : 0);
  }

  get maxPassives() {
    return CONFIG.player.maxPassives + (Settings.accountRank("passive_slot") > 0 ? 1 : 0);
  }

  get xpMult() {
    return 1 + this.growthLevel * 0.15;
  }

  get cooldownMult() {
    return 1 - this.overdriveLevel * 0.08;
  }

  get rangeMult() {
    return 1 + this.amplifyLevel * 0.15;
  }

  get sizeMult() {
    return 1 + this.amplifyLevel * 0.15;
  }

  get swiftFeetLevel() { return this.skillLevel("swift_feet"); }
  get magnetLevel() { return this.skillLevel("magnet"); }
  get toughnessLevel() { return this.skillLevel("toughness"); }
  get berserkerLevel() { return this.skillLevel("berserker"); }
  get criticalLevel() { return this.skillLevel("critical_focus"); }
  get growthLevel() { return this.skillLevel("growth"); }
  get overdriveLevel() { return this.skillLevel("overdrive"); }
  get amplifyLevel() { return this.skillLevel("amplify"); }

  skillLevel(id) {
    const s = this.passives.find(p => p.id === id);
    return s ? s.level : 0;
  }

  damageMultiplier() {
    let m = 1 + this.overflowDamage;
    if (this.overloadTimer > 0) m *= 2;
    if (this.berserkerLevel > 0 && this.hp <= this.maxHp * 0.3) {
      m *= 1 + this.berserkerLevel * 0.2;
    }
    return m;
  }

  applyMaxHpChange() {
    if (this.hp > this.maxHp) this.hp = this.maxHp;
  }

  move(dt, inputVec) {
    this.x += inputVec.x * this.speed * dt;
    this.y += inputVec.y * this.speed * dt;
    if (inputVec.x !== 0 || inputVec.y !== 0) {
      this.facing = Math.atan2(inputVec.y, inputVec.x);
    }
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0) return false;
    this.hp -= amount;
    this.invulnTimer = CONFIG.player.invulnTime;
    return true;
  }

  addXp(amount) {
    this.xp += amount * this.xpMult;
  }

  gainLevel() {
    this.xp -= this.xpToNext;
    this.level++;
    this.xpToNext = xpForLevel(this.level);
  }
}
