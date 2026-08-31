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

function weaponStatLines(id, level, evolved) {
  let st = weaponStats(id, level);
  if (evolved && CONFIG.weapons[id].evo && CONFIG.weapons[id].evo.stats) {
    st = Object.assign({}, st, CONFIG.weapons[id].evo.stats);
  }
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
      "menu", "levelup", "pause", "gameover", "victory", "settings", "howto", "shop",
      "upgrade-cards", "stats-gameover", "stats-victory", "best-score", "menu-gold",
      "loadout-grid", "account-grid", "weapon-upgrades-grid", "shop-gold",
      "pause-weapons", "pause-passives", "build-tooltip", "btn-reroll", "delete-count",
    ];
    ids.forEach(id => { this.el[id] = document.getElementById(id); });
  },

  hideAll() {
    ["menu", "levelup", "pause", "gameover", "victory", "settings", "howto", "shop"].forEach(id => {
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
      card.className = "upgrade-card" + (c.type === "evo" ? " evo-card" : "");

      let icon, name, levelText, desc;
      if (c.type === "evo") {
        const def = weaponDef(c.id);
        const evo = def.evo;
        icon = evo.icon;
        name = evo.name;
        levelText = "EVOLUTION · " + def.name;
        desc = evo.description;
      } else if (c.type === "overflow") {
        const o = CONFIG.overflow[c.id];
        icon = o.icon;
        name = o.name;
        levelText = "OVERFLOW";
        desc = o.description;
      } else if (c.type === "weapon") {
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
    const rrBtn = this.el["btn-reroll"];
    if (rrBtn) {
      rrBtn.textContent = "REROLL (" + game.rerolls + " left)";
      rrBtn.disabled = game.rerolls <= 0;
    }
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

  weaponTip(id, level, dmg, pct, evolved, cleared) {
    const def = weaponDef(id);
    let html = '<div class="tip-name">' + def.icon + " " + def.name + "</div>";
    html += '<div class="tip-level">Level ' + level + " / " + def.maxLevel + "</div>";
    if (evolved && def.evo) {
      html += '<div class="tip-evo">' + def.evo.icon + " " + def.evo.name + "</div>";
    }
    if (cleared) {
      html += '<div class="tip-damage">' + cleared + " projectiles cleared</div>";
    } else if (dmg != null) {
      html += '<div class="tip-damage">' + Math.round(dmg) + " damage · " + pct + "%</div>";
    }
    html += '<div class="tip-desc">' + def.description + "</div>";
    const lines = weaponStatLines(id, level, evolved);
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

  makeBuildSlot(icon, level, tipHtml, onDelete) {
    const item = document.createElement("div");
    item.className = "pause-slot";
    item.innerHTML = '<div class="icon">' + icon + '</div><div class="lvl">' + level + "</div>";
    if (onDelete) {
      item.classList.add("deletable");
      const delBtn = document.createElement("button");
      delBtn.className = "del-btn";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", (e) => { e.stopPropagation(); onDelete(); });
      item.appendChild(delBtn);
    }
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
    this.syncSettings();
    const wc = this.el["pause-weapons"];
    const pc = this.el["pause-passives"];
    wc.innerHTML = "";
    pc.innerHTML = "";
    const p = game.player;
    const total = game.stats.damageDealt || 0;
    const canDelete = game.deletes > 0;
    if (this.el["delete-count"]) {
      this.el["delete-count"].textContent = canDelete ? "DELETE: " + game.deletes + " left — click × on a weapon/passive" : "No deletes left";
    }
    for (const w of p.weapons) {
      const def = weaponDef(w.id);
      const dmg = game.weaponDamage[w.id] || 0;
      const pct = total > 0 ? Math.round(dmg / total * 100) : 0;
      const cleared = game.weaponCleared[w.id] || 0;
      wc.appendChild(this.makeBuildSlot(def.icon, w.level, this.weaponTip(w.id, w.level, dmg, pct, w.evolved, cleared), canDelete ? () => game.deleteItem("weapon", w.id) : null));
    }
    for (const s of p.passives) {
      const def = skillDef(s.id);
      pc.appendChild(this.makeBuildSlot(def.icon, s.level, this.skillTip(s.id, s.level), canDelete ? () => game.deleteItem("skill", s.id) : null));
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
    document.getElementById("btn-shop").addEventListener("click", () => { AudioMan.play("click"); this.showShop(game); });
    document.getElementById("btn-shop-back").addEventListener("click", () => { AudioMan.play("click"); this.show("menu"); this.updateGold(); });

    document.getElementById("btn-resume").addEventListener("click", () => game.resume());
    document.getElementById("btn-restart").addEventListener("click", () => game.startRun());
    document.getElementById("btn-menu").addEventListener("click", () => game.toMenu());
    document.getElementById("btn-retry").addEventListener("click", () => game.startRun());
    document.getElementById("btn-menu2").addEventListener("click", () => game.toMenu());
    document.getElementById("btn-retry2").addEventListener("click", () => game.startRun());
    document.getElementById("btn-menu3").addEventListener("click", () => game.toMenu());

    document.getElementById("pause-btn").addEventListener("click", () => game.togglePause());
    document.getElementById("speed-btn").addEventListener("click", () => game.cycleSpeed());
    document.getElementById("btn-reroll").addEventListener("click", () => game.reroll());

    this.bindSetting("set-sound", "sound");
    this.bindSetting("set-music", "music");
    this.bindSetting("set-shake", "shake");
    this.bindSetting("pause-set-sound", "sound");
    this.bindSetting("pause-set-music", "music");
    this.bindSetting("pause-set-shake", "shake");
    this.syncSettings();
  },

  bindSetting(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    if (key === "sound") el.checked = AudioMan.soundOn;
    else if (key === "music") el.checked = AudioMan.musicOn;
    else el.checked = Settings.shake;
    el.addEventListener("change", () => {
      if (key === "sound") { AudioMan.setSound(el.checked); Settings.sound = el.checked; }
      else if (key === "music") { AudioMan.setMusic(el.checked); Settings.music = el.checked; }
      else { Settings.shake = el.checked; }
      Settings.save();
      this.syncSettings();
    });
  },

  syncSettings() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.checked = val; };
    set("set-sound", AudioMan.soundOn);
    set("set-music", AudioMan.musicOn);
    set("set-shake", Settings.shake);
    set("pause-set-sound", AudioMan.soundOn);
    set("pause-set-music", AudioMan.musicOn);
    set("pause-set-shake", Settings.shake);
  },

  updateBestScore() {
    this.el["best-score"].textContent = Settings.bestTime > 0 ? "Best Time: " + formatTime(Settings.bestTime) : "";
  },

  updateSpeedLabel(game) {
    if (this.el["speed-btn"]) this.el["speed-btn"].textContent = game.speedMult + "x";
  },

  updateGold() {
    if (this.el["menu-gold"]) this.el["menu-gold"].textContent = "GOLD: " + Settings.gold;
    if (this.el["shop-gold"]) this.el["shop-gold"].textContent = "GOLD: " + Settings.gold;
  },

  showShop(game) {
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
          this.showShop(game);
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

    const acct = this.el["account-grid"];
    acct.innerHTML = "";
    for (const u of CONFIG.accountUpgrades) {
      const rank = Settings.accountRank(u.id);
      acct.appendChild(this.makeShopItem(u.icon, u.name, rank, u.maxRank, u.cost, u.description, () => this.buyAccountUpgrade(game, u)));
    }

    const wgrid = this.el["weapon-upgrades-grid"];
    wgrid.innerHTML = "";
    for (const wid in CONFIG.weaponUpgrades) {
      const wu = CONFIG.weaponUpgrades[wid];
      const rank = Settings.weaponRank(wid);
      wgrid.appendChild(this.makeShopItem(wu.icon, wu.name, rank, wu.maxRank, wu.cost, wu.description, () => this.buyWeaponUpgrade(game, wid, wu)));
    }

    this.show("shop");
  },

  makeShopItem(icon, name, rank, maxRank, cost, description, onClick) {
    const item = document.createElement("div");
    item.className = "loadout-item";
    item.innerHTML =
      '<div class="icon">' + icon + '</div>' +
      '<div class="name">' + name + "</div>" +
      '<div class="shop-rank">' + rank + " / " + maxRank + "</div>" +
      '<div class="shop-desc">' + description + "</div>";

    const btn = document.createElement("button");
    if (rank >= maxRank) {
      btn.className = "loadout-btn selected-btn";
      btn.textContent = "MAXED";
      btn.disabled = true;
    } else {
      btn.className = "loadout-btn unlock-btn";
      btn.textContent = "BUY " + cost + "g";
      if (Settings.gold < cost) btn.disabled = true;
      btn.addEventListener("click", onClick);
    }
    item.appendChild(btn);
    return item;
  },

  buyAccountUpgrade(game, u) {
    const rank = Settings.accountRank(u.id);
    if (rank >= u.maxRank || Settings.gold < u.cost) return;
    Settings.gold -= u.cost;
    Settings.accountUpgrades[u.id] = rank + 1;
    Settings.save();
    this.showShop(game);
  },

  buyWeaponUpgrade(game, wid, wu) {
    const rank = Settings.weaponRank(wid);
    if (rank >= wu.maxRank || Settings.gold < wu.cost) return;
    Settings.gold -= wu.cost;
    Settings.weaponUpgrades[wid] = rank + 1;
    Settings.save();
    this.showShop(game);
  },

  unlockWeapon(game, id) {
    if (Settings.gold < CONFIG.shop.weaponCost) return;
    Settings.gold -= CONFIG.shop.weaponCost;
    if (!Settings.unlockedWeapons.includes(id)) Settings.unlockedWeapons.push(id);
    Settings.startingWeapon = id;
    Settings.save();
    this.showShop(game);
  },
};
