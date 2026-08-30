function skillSuffix(id) {
  switch (id) {
    case "toughness": return "max HP";
    case "magnet": return "pickup radius";
    case "growth": return "XP gained";
    case "critical_focus": return "crit chance";
    case "berserker": return "damage below 30% HP";
    case "swift_feet": return "movement speed";
    case "overdrive": return "weapon cooldown";
    case "amplify": return "weapon range & size";
    default: return "";
  }
}

function skillEffectText(id, level) {
  const def = skillDef(id);
  return def.effects[level - 1] + " " + skillSuffix(id);
}

const WEAPON_STAT_LABELS = [
  ["damage", "Damage"],
  ["cooldown", "Cooldown"],
  ["projectileSpeed", "Projectile Speed"],
  ["projectileCount", "Projectiles"],
  ["projectileRadius", "Projectile Size"],
  ["pierce", "Pierce"],
  ["explosionRadius", "Explosion Radius"],
  ["bladeCount", "Blades"],
  ["orbitRadius", "Orbit Radius"],
  ["rotationSpeed", "Rotation"],
  ["bladeRadius", "Blade Size"],
  ["strikeCount", "Strikes"],
  ["aoeRadius", "Strike Area"],
  ["chainCount", "Chains"],
  ["radius", "Radius"],
  ["knockback", "Knockback"],
  ["range", "Range"],
  ["heal", "Heal / Tick"],
  ["maxClear", "Projectiles Cleared"],
  ["bounces", "Bounces"],
  ["bounceBonus", "Bounce Damage"],
  ["lifetime", "Lifetime"],
];

function weaponStatLines(id, level) {
  const st = weaponStats(id, level);
  const lines = [];
  for (const pair of WEAPON_STAT_LABELS) {
    const key = pair[0], label = pair[1];
    if (st[key] === undefined) continue;
    if ((key === "knockback" || key === "chainCount" || key === "heal") && st[key] === 0) continue;
    let v = st[key];
    if (key === "cooldown") v = (v / 1000).toFixed(2) + "s";
    else if (key === "rotationSpeed") v = v.toFixed(1) + " rad/s";
    else if (key === "lifetime") v = v.toFixed(1) + "s";
    lines.push([label, v]);
  }
  return lines;
}

const UI = {
  el: {},

  cache() {
    const ids = [
      "canvas", "hud", "hp-fill", "hp-text", "xp-fill", "level-badge", "timer",
      "pause-btn", "speed-btn", "bossbar-wrap", "bossbar-fill", "bossbar-label",
      "bottom-left", "bottom-right", "joystick", "joystick-knob",
      "menu", "levelup", "pause", "gameover", "victory", "settings", "howto", "loadout",
      "upgrade-cards", "stats-gameover", "stats-victory", "best-score", "menu-gold",
      "loadout-grid", "loadout-gold",
      "pause-weapons", "pause-passives", "build-tooltip",
    ];
    ids.forEach(id => { this.el[id] = document.getElementById(id); });
  },

  hideAll() {
    ["menu", "levelup", "pause", "gameover", "victory", "settings", "howto", "loadout"].forEach(id => {
      this.el[id].classList.add("hidden");
    });
  },

  show(id) {
    this.hideAll();
    this.el[id].classList.remove("hidden");
  },

  updateHUD(game) {
    const p = game.player;
    const hpPct = clamp(p.hp / p.maxHp, 0, 1) * 100;
    this.el["hp-fill"].style.width = hpPct + "%";
    this.el["hp-text"].textContent = Math.max(0, Math.ceil(p.hp)) + " / " + Math.round(p.maxHp);

    const xpPct = clamp(p.xp / p.xpToNext, 0, 1) * 100;
    this.el["xp-fill"].style.width = xpPct + "%";
    this.el["level-badge"].textContent = "LV " + p.level;
    this.el["timer"].textContent = formatTime(game.time);

    if (game.boss && game.boss.hp > 0) {
      this.el["bossbar-wrap"].classList.add("visible");
      this.el["bossbar-label"].textContent = game.boss.name;
      this.el["bossbar-fill"].style.width = clamp(game.boss.hp / game.boss.maxHp, 0, 1) * 100 + "%";
    } else {
      this.el["bossbar-wrap"].classList.remove("visible");
    }
  },

  refreshBuild(game) {
    const p = game.player;
    this.el["bottom-left"].innerHTML = "";
    this.el["bottom-right"].innerHTML = "";

    for (const w of p.weapons) {
      const def = weaponDef(w.id);
      const item = document.createElement("div");
      item.className = "build-item";
      item.innerHTML = '<div class="icon">' + def.icon + '</div><div class="lvl">' + w.level + "</div>";
      this.el["bottom-left"].appendChild(item);
    }

    for (const s of p.passives) {
      const def = skillDef(s.id);
      const item = document.createElement("div");
      item.className = "build-item";
      item.innerHTML = '<div class="icon">' + def.icon + '</div><div class="lvl">' + s.level + "</div>";
      this.el["bottom-right"].appendChild(item);
    }
  },

  showUpgrades(game, choices) {
    const container = this.el["upgrade-cards"];
    container.innerHTML = "";
    choices.forEach((c, i) => {
      const card = document.createElement("div");
      card.className = "upgrade-card";

      let icon, name, levelText, desc;
      if (c.type === "weapon") {
        const def = weaponDef(c.id);
        icon = def.icon;
        name = def.name;
        if (c.isNew) {
          levelText = "NEW WEAPON";
          desc = def.description;
        } else {
          levelText = "LEVEL " + c.currentLevel + " → LEVEL " + c.nextLevel;
          desc = def.upgradeText[c.nextLevel - 1];
        }
      } else {
        const def = skillDef(c.id);
        icon = def.icon;
        name = def.name;
        if (c.isNew) {
          levelText = "NEW SKILL";
          desc = def.description;
        } else {
          levelText = "LEVEL " + c.currentLevel + " → LEVEL " + c.nextLevel;
          desc = skillEffectText(c.id, c.nextLevel);
        }
      }

      card.innerHTML =
        '<div class="u-icon">' + icon + '</div>' +
        '<div class="u-body"><div class="u-name">' + name + '</div>' +
        '<div class="u-level">' + levelText + '</div>' +
        '<div class="u-desc">' + desc + '</div></div>' +
        '<div class="u-key">' + (i + 1) + "</div>";

      card.addEventListener("click", () => game.selectUpgrade(i));
      container.appendChild(card);
    });
    this.show("levelup");
  },

  showStats(el, stats) {
    el.innerHTML = "";
    for (const s of stats) {
      const row = document.createElement("div");
      row.className = "stat";
      row.innerHTML = '<span class="label">' + s.label + '</span><span class="value">' + s.value + "</span>";
      el.appendChild(row);
    }
  },

  weaponTip(id, level, dmg, pct) {
    const def = weaponDef(id);
    let html = '<div class="tip-name">' + def.icon + " " + def.name + "</div>";
    html += '<div class="tip-level">Level ' + level + " / " + def.maxLevel + "</div>";
    if (dmg != null) {
      html += '<div class="tip-damage">' + Math.round(dmg) + " damage · " + pct + "%</div>";
    }
    html += '<div class="tip-desc">' + def.description + "</div>";
    const lines = weaponStatLines(id, level);
    if (lines.length) {
      html += '<div class="tip-stats">';
      for (const pair of lines) {
        html += '<div><span>' + pair[0] + '</span><span>' + pair[1] + "</span></div>";
      }
      html += "</div>";
    }
    return html;
  },

  skillTip(id, level) {
    const def = skillDef(id);
    let html = '<div class="tip-name">' + def.icon + " " + def.name + "</div>";
    html += '<div class="tip-level">Level ' + level + " / " + def.maxLevel + "</div>";
    html += '<div class="tip-desc">' + def.description + "</div>";
    html += '<div class="tip-effect">' + skillEffectText(id, level) + "</div>";
    return html;
  },

  makeBuildSlot(icon, level, tipHtml) {
    const item = document.createElement("div");
    item.className = "pause-slot";
    item.innerHTML = '<div class="icon">' + icon + '</div><div class="lvl">' + level + "</div>";
    item.addEventListener("mouseenter", () => this.showTooltip(tipHtml, item));
    item.addEventListener("mouseleave", () => this.hideTooltip());
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this._tipAnchor === item && this.el["build-tooltip"].style.display === "block") {
        this.hideTooltip();
      } else {
        this.showTooltip(tipHtml, item);
        this._tipAnchor = item;
      }
    });
    return item;
  },

  populatePauseBuild(game) {
    const wc = this.el["pause-weapons"];
    const pc = this.el["pause-passives"];
    wc.innerHTML = "";
    pc.innerHTML = "";
    const p = game.player;
    const total = game.stats.damageDealt || 0;
    for (const w of p.weapons) {
      const def = weaponDef(w.id);
      const dmg = game.weaponDamage[w.id] || 0;
      const pct = total > 0 ? Math.round(dmg / total * 100) : 0;
      wc.appendChild(this.makeBuildSlot(def.icon, w.level, this.weaponTip(w.id, w.level, dmg, pct)));
    }
    for (const s of p.passives) {
      const def = skillDef(s.id);
      pc.appendChild(this.makeBuildSlot(def.icon, s.level, this.skillTip(s.id, s.level)));
    }
  },

  showTooltip(html, anchor) {
    const tip = this.el["build-tooltip"];
    tip.innerHTML = html;
    tip.style.display = "block";
    const r = anchor.getBoundingClientRect();
    tip.style.left = "0px";
    tip.style.top = "0px";
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = r.left - tw / 2 + r.width / 2;
    let top = r.top - th - 10;
    if (top < 8) top = r.bottom + 10;
    left = clamp(left, 8, window.innerWidth - tw - 8);
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  },

  hideTooltip() {
    this.el["build-tooltip"].style.display = "none";
    this._tipAnchor = null;
  },

  bind(game) {
    document.getElementById("btn-play").addEventListener("click", () => { AudioMan.resume(); AudioMan.play("click"); game.startRun(); });
    document.getElementById("btn-howto").addEventListener("click", () => { AudioMan.play("click"); this.show("howto"); });
    document.getElementById("btn-settings").addEventListener("click", () => { AudioMan.play("click"); this.show("settings"); });
    document.getElementById("btn-settings-back").addEventListener("click", () => { AudioMan.play("click"); this.show("menu"); });
    document.getElementById("btn-howto-back").addEventListener("click", () => { AudioMan.play("click"); this.show("menu"); });
    document.getElementById("btn-loadout").addEventListener("click", () => { AudioMan.play("click"); this.showLoadout(game); });
    document.getElementById("btn-loadout-back").addEventListener("click", () => { AudioMan.play("click"); this.show("menu"); this.updateGold(); });

    document.getElementById("btn-resume").addEventListener("click", () => game.resume());
    document.getElementById("btn-restart").addEventListener("click", () => game.startRun());
    document.getElementById("btn-menu").addEventListener("click", () => game.toMenu());
    document.getElementById("btn-retry").addEventListener("click", () => game.startRun());
    document.getElementById("btn-menu2").addEventListener("click", () => game.toMenu());
    document.getElementById("btn-retry2").addEventListener("click", () => game.startRun());
    document.getElementById("btn-menu3").addEventListener("click", () => game.toMenu());

    document.getElementById("pause-btn").addEventListener("click", () => game.togglePause());
    document.getElementById("speed-btn").addEventListener("click", () => game.cycleSpeed());

    const sound = document.getElementById("set-sound");
    const music = document.getElementById("set-music");
    const shake = document.getElementById("set-shake");
    sound.checked = AudioMan.soundOn;
    music.checked = AudioMan.musicOn;
    shake.checked = Settings.shake;

    sound.addEventListener("change", () => { AudioMan.setSound(sound.checked); Settings.sound = sound.checked; Settings.save(); });
    music.addEventListener("change", () => { AudioMan.setMusic(music.checked); Settings.music = music.checked; Settings.save(); });
    shake.addEventListener("change", () => { Settings.shake = shake.checked; Settings.save(); });
  },

  updateBestScore() {
    this.el["best-score"].textContent = Settings.bestTime > 0 ? "Best Time: " + formatTime(Settings.bestTime) : "";
  },

  updateSpeedLabel(game) {
    if (this.el["speed-btn"]) this.el["speed-btn"].textContent = game.speedMult + "x";
  },

  updateGold() {
    if (this.el["menu-gold"]) this.el["menu-gold"].textContent = "GOLD: " + Settings.gold;
    if (this.el["loadout-gold"]) this.el["loadout-gold"].textContent = "GOLD: " + Settings.gold;
  },

  showLoadout(game) {
    this.updateGold();
    const grid = this.el["loadout-grid"];
    grid.innerHTML = "";
    for (const id in CONFIG.weapons) {
      const def = weaponDef(id);
      const unlocked = Settings.unlockedWeapons.includes(id);
      const selected = Settings.startingWeapon === id;

      const item = document.createElement("div");
      item.className = "loadout-item" + (selected ? " selected" : "");
      item.innerHTML =
        '<div class="icon">' + def.icon + '</div>' +
        '<div class="name">' + def.name + "</div>";

      const btn = document.createElement("button");
      if (selected) {
        btn.className = "loadout-btn selected-btn";
        btn.textContent = "SELECTED";
        btn.disabled = true;
      } else if (unlocked) {
        btn.className = "loadout-btn";
        btn.textContent = "SELECT";
        btn.addEventListener("click", () => {
          Settings.startingWeapon = id;
          Settings.save();
          this.showLoadout(game);
        });
      } else {
        btn.className = "loadout-btn unlock-btn";
        btn.textContent = "UNLOCK " + CONFIG.shop.weaponCost + "g";
        if (Settings.gold < CONFIG.shop.weaponCost) btn.disabled = true;
        btn.addEventListener("click", () => this.unlockWeapon(game, id));
      }
      item.appendChild(btn);
      grid.appendChild(item);
    }
    this.show("loadout");
  },

  unlockWeapon(game, id) {
    if (Settings.gold < CONFIG.shop.weaponCost) return;
    Settings.gold -= CONFIG.shop.weaponCost;
    if (!Settings.unlockedWeapons.includes(id)) Settings.unlockedWeapons.push(id);
    Settings.startingWeapon = id;
    Settings.save();
    this.showLoadout(game);
  },
};
