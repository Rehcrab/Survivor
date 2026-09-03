const ChallengeRun = {
  id: null,
  def: null,
  failed: false,
  reason: "",
  completed: false,

  begin(id) {
    const a = achievementById(id);
    this.id = id;
    this.def = a;
    this.failed = false;
    this.reason = "";
    this.completed = false;
  },

  clear() {
    this.id = null;
    this.def = null;
    this.failed = false;
    this.reason = "";
    this.completed = false;
  },

  fail(reason) {
    this.failed = true;
    this.reason = reason || "";
  },

  clearFail() {
    this.failed = false;
    this.reason = "";
  },

  complete() {
    this.completed = true;
  },

  onOverlordKilled(game) {
    if (!this.isActive() || this.failed || this.completed) return;
    const validate = this.def.challenge && this.def.challenge.validate;
    if (validate) {
      let result = null;
      try { result = validate(game); } catch (e) { result = { ok: false, reason: "Challenge requirement not met" }; }
      if (result && result.ok === false) {
        this.fail(result.reason || "Challenge requirement not met");
        game.notice = { text: "❌ " + this.def.name + " Failed: " + (result.reason || ""), timer: 4 };
        return;
      }
    }
    this.complete();
    game.notice = { text: "🏆 Challenge Complete: " + this.def.name + "!", timer: 4 };
    game.audio.play("victory");
  },

  isActive() {
    return !!this.id && !!this.def;
  },

  rules() {
    return (this.def && this.def.challenge && this.def.challenge.rules) || {};
  },

  speedLock() {
    const r = this.rules();
    return r.speedLock != null ? r.speedLock : null;
  },

  weaponSlots() {
    const r = this.rules();
    return r.weaponSlots != null ? r.weaponSlots : null;
  },

  noRespawn() {
    return this.rules().noRespawn === true;
  },

  noEvolution() {
    return this.rules().noEvolution === true;
  },

  autoLevelUp() {
    return this.rules().autoLevelUp === true;
  },

  enemyCapMult() {
    return this.rules().enemyCapMult || 1;
  },

  spawnRateMult() {
    return this.rules().spawnRateMult || 1;
  },

  bossHpMult() {
    return this.rules().bossHpMult || 1;
  },

  bossDamageMult() {
    return this.rules().bossDamageMult || 1;
  },

  xpMult() {
    return this.rules().xpMult != null ? this.rules().xpMult : 1;
  },

  status() {
    if (!this.isActive()) return null;
    let status = "ACTIVE";
    if (this.completed) status = "COMPLETED";
    else if (this.failed) status = "FAILED";
    return {
      icon: this.def.icon,
      name: this.def.name,
      goal: (this.def.challenge && this.def.challenge.goal) || "",
      status: status,
      reason: this.reason,
    };
  },
};
