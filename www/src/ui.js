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

function weaponStatLines(game, w) {
  const st = effectiveStats(game, w);
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
      "pause-btn", "speed-1", "speed-2", "speed-4", "bossbar-wrap", "bossbar-fill", "bossbar-label",
      "bottom-left", "bottom-right", "joystick", "joystick-knob",
      "menu", "levelup", "pause", "gameover", "victory", "settings", "howto", "shop", "shrine", "trader", "achievements", "profile", "challenge-confirm",
      "upgrade-cards", "stats-gameover", "stats-victory", "weapon-stats", "best-score", "menu-gold",
      "btn-respawn",
      "btn-retry",
      "btn-retry-challenge",
      "loadout-grid", "account-grid", "weapon-upgrades-grid", "shop-gold",
      "shrine-gold", "shrine-blessings", "trader-gold", "trader-items",
      "pause-weapons", "pause-passives", "build-tooltip", "btn-reroll", "delete-count",
      "achievements-list", "achievements-count",
      "profile-name", "profile-badges", "profile-stats", "profile-ach", "profile-fav", "profile-badge-list",
      "pause-challenge", "gameover-challenge",
      "challenge-confirm-title", "challenge-confirm-rules", "challenge-confirm-goal",
    ];
    ids.forEach(id => { this.el[id] = document.getElementById(id); });
  },

  hideAll() {
    this.hideTooltip();
    ["menu", "levelup", "pause", "gameover", "victory", "settings", "howto", "shop", "shrine", "trader", "achievements", "profile", "challenge-confirm"].forEach(id => {
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
      item.className = "build-item" + (w.evolved ? " evolved" : "");
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

      let icon, name, levelText, desc, evoHint = "";
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
          evoHint = def.evo ? ("Evo with " + skillDef(def.evo.requires).icon) : "";
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
          const evoIcons = [];
          for (const wid in CONFIG.weapons) {
            const wdef = weaponDef(wid);
            if (wdef.evo && wdef.evo.requires === c.id) evoIcons.push(wdef.evo.icon);
          }
          evoHint = evoIcons.length ? ("Evolves " + evoIcons.join(" ")) : "";
        } else {
          levelText = "LEVEL " + c.currentLevel + " → LEVEL " + c.nextLevel;
          desc = skillEffectText(c.id, c.nextLevel);
        }
      }

      card.innerHTML =
        '<div class="u-icon">' + icon + '</div>' +
        '<div class="u-body"><div class="u-name">' + name + '</div>' +
        '<div class="u-level">' + levelText + '</div>' +
        '<div class="u-desc">' + desc + '</div>' +
        (evoHint ? '<div class="u-evo-hint">' + evoHint + '</div>' : "") +
        '</div>' +
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

  showWeaponStats(el, lines) {
    el.innerHTML = "";
    for (const l of lines) {
      const row = document.createElement("div");
      row.className = "weapon-stat";
      const nameEl = document.createElement("span");
      nameEl.className = "ws-name";
      nameEl.textContent = l.icon + " " + l.name;
      const valEl = document.createElement("span");
      valEl.className = "ws-value";
      const parts = [];
      if (l.cleared > 0) parts.push(l.cleared + " cleared");
      else if (l.dmg > 0) parts.push(l.dmg + " dmg · " + l.pct + "%");
      if (l.healed > 0) parts.push("+" + l.healed + " HP healed");
      valEl.textContent = parts.join(" · ");
      row.appendChild(nameEl);
      row.appendChild(valEl);
      el.appendChild(row);
    }
  },

  weaponTip(game, w, dmg, pct, cleared) {
    const def = weaponDef(w.id);
    let html = '<div class="tip-name">' + def.icon + " " + def.name + "</div>";
    html += '<div class="tip-level">Level ' + w.level + " / " + def.maxLevel + "</div>";
    if (w.id === "boomerang") {
      const rm = boomerangReturnMult(w);
      html += '<div class="tip-return">Return Damage: ' + (rm % 1 === 0 ? rm.toFixed(0) : rm.toFixed(1)) + "x</div>";
    }
    if (w.evolved && def.evo) {
      html += '<div class="tip-evo">' + def.evo.icon + " " + def.evo.name + "</div>";
    }
    const mCount = (game.masteries[w.id] || []).length;
    if (w.evolved && mCount > 0) {
      html += '<div class="tip-evo">Masteries: ' + mCount + "/" + CONFIG.mastery.maxPerWeapon + "</div>";
    }
    const healed = game.weaponHealed && game.weaponHealed[w.id] ? game.weaponHealed[w.id] : 0;
    if (healed > 0) {
      html += '<div class="tip-heal">' + Math.round(healed) + " HP healed</div>";
    }
    if (cleared) {
      html += '<div class="tip-damage">' + cleared + " projectiles cleared</div>";
    } else if (dmg != null) {
      html += '<div class="tip-damage">' + Math.round(dmg) + " damage · " + pct + "%</div>";
    }
    html += '<div class="tip-desc">' + def.description + "</div>";
    const lines = weaponStatLines(game, w);
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

  makeBuildSlot(icon, level, tipHtml, onDelete, evolved) {
    const item = document.createElement("div");
    item.className = "pause-slot" + (evolved ? " evolved" : "");
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
    this.hideTooltip();
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
      wc.appendChild(this.makeBuildSlot(def.icon, w.level, this.weaponTip(game, w, dmg, pct, cleared), canDelete ? () => game.deleteItem("weapon", w.id) : null, w.evolved));
    }
    for (const s of p.passives) {
      const def = skillDef(s.id);
      pc.appendChild(this.makeBuildSlot(def.icon, s.level, this.skillTip(s.id, s.level), canDelete ? () => game.deleteItem("skill", s.id) : null));
    }
    this.updatePauseChallenge(game);
  },

  showTooltip(html, anchor) {
    const tip = this.el["build-tooltip"];
    tip.innerHTML = html;
    tip.classList.remove("hidden");
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
    const tip = this.el["build-tooltip"];
    tip.classList.add("hidden");
    tip.style.display = "none";
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
    document.getElementById("btn-achievements").addEventListener("click", () => { AudioMan.play("click"); this.showAchievements(game, "menu"); });
    document.getElementById("btn-achievements-back").addEventListener("click", () => { AudioMan.play("click"); this.show(this._achReturn || "menu"); });
    document.getElementById("btn-profile").addEventListener("click", () => { AudioMan.play("click"); this.showProfile(game); });
    document.getElementById("btn-profile-back").addEventListener("click", () => { AudioMan.play("click"); this.show("menu"); });
    document.getElementById("btn-challenge-start").addEventListener("click", () => { this.startChallenge(); });
    document.getElementById("btn-challenge-back").addEventListener("click", () => { AudioMan.play("click"); this.showAchievements(this._challengeGame, this._challengeReturn || "menu"); });
    document.getElementById("btn-shrine-close").addEventListener("click", () => game.closeShop());
    document.getElementById("btn-trader-close").addEventListener("click", () => game.closeShop());

    document.getElementById("btn-resume").addEventListener("click", () => game.resume());
    document.getElementById("btn-restart").addEventListener("click", () => game.startRun());
    document.getElementById("btn-menu").addEventListener("click", () => game.toMenu());
    document.getElementById("btn-achievements-pause").addEventListener("click", () => { AudioMan.play("click"); this.showAchievements(game, "pause"); });
    document.getElementById("btn-retry").addEventListener("click", () => game.startRun());
    document.getElementById("btn-retry-challenge").addEventListener("click", () => {
      const id = ChallengeRun.id;
      if (id) { AudioMan.play("click"); game.startChallengeRun(id); }
    });
    document.getElementById("btn-menu2").addEventListener("click", () => game.toMenu());
    document.getElementById("btn-respawn").addEventListener("click", () => game.respawn());
    document.getElementById("btn-retry2").addEventListener("click", () => game.startRun());
    document.getElementById("btn-menu3").addEventListener("click", () => game.toMenu());

    document.getElementById("pause-btn").addEventListener("click", () => game.togglePause());
    document.getElementById("speed-1").addEventListener("click", () => game.setSpeed(1));
    document.getElementById("speed-2").addEventListener("click", () => game.setSpeed(2));
    document.getElementById("speed-4").addEventListener("click", () => game.setSpeed(4));
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
    for (const id of ["speed-1", "speed-2", "speed-4"]) {
      const btn = this.el[id];
      if (!btn) continue;
      btn.classList.toggle("active", parseInt(btn.dataset.speed, 10) === game.speedMult);
    }
  },

  updateGold() {
    if (this.el["menu-gold"]) this.el["menu-gold"].textContent = "GOLD: " + Settings.gold;
    if (this.el["shop-gold"]) this.el["shop-gold"].textContent = "GOLD: " + Settings.gold;
  },

  updateRespawnButton(game) {
    const btn = this.el["btn-respawn"];
    if (!btn) return;
    if (ChallengeRun.noRespawn()) {
      btn.textContent = "Respawns Disabled";
      btn.disabled = true;
      btn.classList.remove("respawn-ok");
      return;
    }
    if (game.respawnsUsed >= CONFIG.respawn.maxRespawns) {
      btn.textContent = "No respawns left";
      btn.disabled = true;
      btn.classList.remove("respawn-ok");
    } else {
      const cost = game.respawnCost();
      btn.textContent = "RESPAWN (" + cost + " gold)";
      const affordable = Settings.gold >= cost;
      btn.disabled = !affordable;
      btn.classList.toggle("respawn-ok", affordable);
    }
  },

  updatePauseChallenge(game) {
    const el = this.el["pause-challenge"];
    if (!el) return;
    const st = ChallengeRun.status();
    if (!st) {
      el.classList.add("hidden");
      el.innerHTML = "";
      return;
    }
    el.classList.remove("hidden");
    let statusClass = "active";
    let statusText = "ACTIVE";
    if (st.status === "COMPLETED") { statusClass = "completed"; statusText = "COMPLETED"; }
    else if (st.status === "FAILED") { statusClass = "failed"; statusText = "FAILED"; }
    el.innerHTML =
      '<div class="pause-challenge-title">' + st.icon + " " + st.name + '</div>' +
      '<div class="pause-challenge-goal">' + st.goal + '</div>' +
      '<div class="pause-challenge-status ' + statusClass + '">' + statusText + (st.reason ? ": " + st.reason : "") + '</div>';
  },

  updateGameoverChallenge(game) {
    const el = this.el["gameover-challenge"];
    if (!el) return;
    const st = ChallengeRun.status();
    if (!st) {
      el.classList.add("hidden");
      el.innerHTML = "";
      return;
    }
    el.classList.remove("hidden");
    let cls = "failed";
    let txt = "Challenge Failed";
    if (st.status === "COMPLETED") { cls = "completed"; txt = "Challenge Complete"; }
    else if (st.status === "ACTIVE") { cls = "active"; txt = "Challenge In Progress"; }
    el.className = "gameover-challenge " + cls;
    el.innerHTML = '<span class="gc-name">' + st.icon + " " + st.name + ": " + txt + '</span>' + (st.reason ? '<span class="gc-reason">' + st.reason + '</span>' : "");
  },

  updateGameoverButtons(game) {
    const challengeBtn = this.el["btn-retry-challenge"];
    const retryBtn = this.el["btn-retry"];
    if (!challengeBtn || !retryBtn) return;
    if (ChallengeRun.isActive()) {
      challengeBtn.classList.remove("hidden");
      challengeBtn.classList.add("primary");
      retryBtn.classList.remove("primary");
      retryBtn.textContent = "PLAY NORMALLY AGAIN";
    } else {
      challengeBtn.classList.add("hidden");
      challengeBtn.classList.remove("primary");
      retryBtn.classList.add("primary");
      retryBtn.textContent = "PLAY AGAIN";
    }
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

  showShrine(game) {
    const cost = game.shrineCost();
    if (this.el["shrine-gold"]) this.el["shrine-gold"].textContent = "GOLD: " + Settings.gold + " · COST: " + cost;
    const container = this.el["shrine-blessings"];
    container.innerHTML = "";
    for (const b of CONFIG.shrine.blessings) {
      const card = document.createElement("div");
      card.className = "upgrade-card";
      card.innerHTML =
        '<div class="u-icon">' + b.icon + '</div>' +
        '<div class="u-body"><div class="u-name">' + b.name + '</div>' +
        '<div class="u-desc">' + b.description + '</div>' +
        '<div class="u-level">' + cost + " gold</div></div>";
      card.addEventListener("click", () => {
        if (Settings.gold < game.shrineCost()) return;
        game.shrineBless(b);
        this.showShrine(game);
      });
      if (Settings.gold < cost) card.style.opacity = "0.5";
      container.appendChild(card);
    }
    this.show("shrine");
  },

  showTrader(game) {
    if (!game.trader.inventory || !game.trader.inventory.length) {
      game.trader.inventory = game.generateTraderInventory();
    }
    if (this.el["trader-gold"]) {
      this.el["trader-gold"].textContent = "GOLD: " + Settings.gold + " · RESTOCKS AT " + formatTime(game.time + game.trader.restockTimer);
    }
    const container = this.el["trader-items"];
    container.innerHTML = "";
    for (const item of game.trader.inventory) {
      const card = document.createElement("div");
      card.className = "upgrade-card";
      const priceLine = item.sold ? "SOLD OUT" : item.cost + " gold";
      const levelLine = item.type === "mastery" ? "Masteries: " + item.ownedCount + "/" + item.max + " · " + priceLine : priceLine;
      card.innerHTML =
        '<div class="u-icon">' + item.icon + '</div>' +
        '<div class="u-body"><div class="u-name">' + item.name + '</div>' +
        '<div class="u-desc">' + item.description + '</div>' +
        '<div class="u-level">' + levelLine + "</div></div>";
      card.addEventListener("click", () => {
        if (item.sold || Settings.gold < item.cost) return;
        game.traderBuy(item);
        this.showTrader(game);
      });
      if (item.sold || Settings.gold < item.cost) card.style.opacity = "0.5";
      container.appendChild(card);
    }
    this.show("trader");
  },

  showAchievements(game, returnTo) {
    this._achReturn = returnTo || "menu";
    const canAttempt = this._achReturn !== "pause";
    const list = this.el["achievements-list"];
    list.innerHTML = "";
    const C = Achievements.buildSummary(game);
    const total = ACHIEVEMENTS.length;
    if (this.el["achievements-count"]) {
      this.el["achievements-count"].textContent = Achievements.unlockedCount() + " / " + total;
    }

    for (const cat of ACHIEVEMENT_CATEGORIES) {
      const heading = document.createElement("div");
      heading.className = "ach-category" + (cat === "Insane" ? " insane" : "");
      heading.textContent = cat === "Insane" ? "🔴 INSANE CHALLENGES" : cat;
      list.appendChild(heading);

      for (const a of ACHIEVEMENTS) {
        if (a.category !== cat) continue;
        const done = !!Achievements.unlocked[a.id];
        const row = document.createElement("div");
        row.className = "ach-item" + (done ? " unlocked" : " locked") + (cat === "Insane" ? " insane" : "");

        let progress = "";
        if (!done && a.progress) {
          try { const p = a.progress(C, game); if (p) progress = p; } catch (e) { /* ignore */ }
        }

        const tier = a.tier ? '<div class="ach-tier">🔴 ' + a.tier.toUpperCase() + '</div>' : "";

        row.innerHTML =
          '<div class="ach-icon">' + a.icon + '</div>' +
          '<div class="ach-body"><div class="ach-name">' + a.name + '</div>' +
          '<div class="ach-desc">' + a.description + '</div>' +
          tier +
          (progress ? '<div class="ach-progress">' + progress + '</div>' : "") +
          '</div>' +
          '<div class="ach-status ' + (done ? "done" : "") + '">' + (done ? "UNLOCKED" : "LOCKED") + '</div>';

        if (canAttempt && a.challenge) {
          const btn = document.createElement("button");
          btn.className = "ach-attempt-btn";
          btn.textContent = "Attempt";
          btn.addEventListener("click", () => { AudioMan.play("click"); this.showChallengeConfirm(a.id, game, returnTo); });
          row.appendChild(btn);
        }

        list.appendChild(row);
      }
    }

    this.show("achievements");
  },

  showChallengeConfirm(id, game, returnTo) {
    const a = achievementById(id);
    if (!a || !a.challenge) return;
    this._challengeId = id;
    this._challengeGame = game;
    this._challengeReturn = returnTo || "menu";
    this.el["challenge-confirm-title"].textContent = a.icon + " " + a.name.toUpperCase();
    const rules = this.el["challenge-confirm-rules"];
    rules.innerHTML = "";
    for (const r of a.challenge.confirm) {
      const row = document.createElement("div");
      row.className = "challenge-rule";
      row.innerHTML =
        '<span class="challenge-rule-icon">' + r[0] + '</span>' +
        '<span class="challenge-rule-label">' + r[1] + '</span>' +
        '<span class="challenge-rule-value">' + r[2] + '</span>';
      rules.appendChild(row);
    }
    this.el["challenge-confirm-goal"].textContent = "🎯 Goal: " + a.challenge.goal;
    this.show("challenge-confirm");
  },

  startChallenge() {
    const id = this._challengeId;
    const game = this._challengeGame;
    if (!id || !game) return;
    AudioMan.play("click");
    game.startChallengeRun(id);
  },

  showProfile(game) {
    this._profileGame = game;
    const C = Achievements.buildSummary(null);
    const total = ACHIEVEMENTS.length;
    const unlocked = Achievements.unlockedCount();
    const fmt = (n) => Math.round(n).toLocaleString();

    this.renderProfileName();
    this.renderProfileBadges();

    const stats = this.el["profile-stats"];
    stats.innerHTML = "";
    const rows = [
      ["Total Runs", fmt(C.totalRuns)],
      ["Longest Survival", formatTime(C.longestTime)],
      ["Highest Level", C.highestLevel],
      ["Enemies Defeated", fmt(C.totalKills)],
      ["Elites Defeated", fmt(C.elitesKilled)],
      ["Bosses Defeated", fmt(C.totalBosses)],
      ["Gold Earned", fmt(C.totalGoldEarned)],
      ["Gold Spent", fmt(C.totalGoldSpent)],
      ["Weapon Evolutions", fmt(C.totalEvolutions)],
      ["Masteries Purchased", fmt(C.masteriesPurchased)],
      ["Highest Damage (Run)", fmt(C.highestRunDamage)],
      ["Highest Damage (Weapon)", fmt(C.highestWeaponDamage)],
      ["Spawners Destroyed", fmt(C.spawnersDestroyed)],
      ["Trader Purchases", fmt(C.traderPurchases)],
      ["Shrine Blessings", fmt(C.shrinesUsed)],
    ];
    for (const r of rows) {
      const row = document.createElement("div");
      row.className = "stat";
      row.innerHTML = '<span class="label">' + r[0] + '</span><span class="value">' + r[1] + "</span>";
      stats.appendChild(row);
    }

    const ach = this.el["profile-ach"];
    const filled = Math.round(unlocked / total * 10);
    ach.innerHTML =
      '<div class="profile-ach-title">Achievements</div>' +
      '<div class="profile-ach-bar">' + "█".repeat(filled) + "░".repeat(10 - filled) + '</div>' +
      '<div class="profile-ach-count">' + unlocked + " / " + total + "</div>";

    const fav = this.el["profile-fav"];
    const fw = Achievements.favoriteWeapon(null);
    fav.innerHTML =
      '<div class="profile-fav-title">Favorite Weapon</div>' +
      (fw ? '<div class="profile-fav-name">' + fw.icon + " " + fw.name + "</div>" : '<div class="profile-fav-name muted">—</div>');

    this.renderProfileBadgeList();
    this.show("profile");
  },

  renderProfileName() {
    const wrap = this.el["profile-name"];
    wrap.innerHTML = "";
    const name = document.createElement("span");
    name.className = "profile-name-text";
    name.textContent = Settings.profile.name;
    const edit = document.createElement("button");
    edit.className = "profile-edit-btn";
    edit.textContent = "✏️";
    edit.addEventListener("click", () => this.startProfileRename());
    wrap.appendChild(name);
    wrap.appendChild(edit);
  },

  startProfileRename() {
    const wrap = this.el["profile-name"];
    wrap.innerHTML = "";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 20;
    input.className = "profile-name-input";
    input.value = Settings.profile.name;
    wrap.appendChild(input);
    input.focus();
    input.select();
    let cancel = false;
    const commit = () => {
      if (!cancel) {
        const v = input.value.trim();
        Settings.profile.name = v ? v.slice(0, 20) : "Player";
        Settings.save();
      }
      this.showProfile(this._profileGame);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      else if (e.key === "Escape") { cancel = true; input.blur(); }
    });
    input.addEventListener("blur", commit);
  },

  renderProfileBadges() {
    const wrap = this.el["profile-badges"];
    wrap.innerHTML = "";
    const equipped = Settings.profile.badges.equipped;
    for (let i = 0; i < BADGE_MAX; i++) {
      const slot = document.createElement("div");
      slot.className = "profile-badge-slot";
      const id = equipped[i];
      const def = id ? achievementById(id) : null;
      if (def) {
        slot.classList.add("filled");
        const icon = document.createElement("span");
        icon.className = "profile-badge-icon";
        icon.textContent = def.icon;
        icon.title = def.name;
        const left = document.createElement("button");
        left.className = "badge-move";
        left.textContent = "◀";
        left.disabled = i === 0;
        left.addEventListener("click", () => this.moveBadge(i, -1));
        const right = document.createElement("button");
        right.className = "badge-move";
        right.textContent = "▶";
        right.disabled = i === equipped.length - 1;
        right.addEventListener("click", () => this.moveBadge(i, 1));
        const x = document.createElement("button");
        x.className = "badge-unequip";
        x.textContent = "×";
        x.addEventListener("click", () => this.unequipBadge(id));
        slot.appendChild(icon);
        slot.appendChild(left);
        slot.appendChild(right);
        slot.appendChild(x);
      } else {
        slot.classList.add("empty");
        slot.textContent = "—";
      }
      wrap.appendChild(slot);
    }
  },

  renderProfileBadgeList() {
    const wrap = this.el["profile-badge-list"];
    wrap.innerHTML = "";
    const equipped = Settings.profile.badges.equipped;
    for (const id of BADGE_IDS) {
      const def = achievementById(id);
      if (!def) continue;
      const unlocked = !!Achievements.unlocked[id];
      const isEquipped = equipped.includes(id);
      const row = document.createElement("div");
      row.className = "badge-row" + (unlocked ? "" : " locked");
      row.innerHTML =
        '<div class="badge-icon">' + def.icon + '</div>' +
        '<div class="badge-name">' + def.name + '</div>';
      const btn = document.createElement("button");
      btn.className = "badge-btn";
      if (!unlocked) {
        btn.textContent = "LOCKED";
        btn.disabled = true;
      } else if (isEquipped) {
        btn.textContent = "UNEQUIP";
        btn.addEventListener("click", () => this.unequipBadge(id));
      } else {
        btn.textContent = "EQUIP";
        btn.disabled = equipped.length >= BADGE_MAX;
        btn.addEventListener("click", () => this.equipBadge(id));
      }
      row.appendChild(btn);
      wrap.appendChild(row);
    }
  },

  equipBadge(id) {
    const equipped = Settings.profile.badges.equipped;
    if (!Achievements.unlocked[id] || equipped.includes(id) || equipped.length >= BADGE_MAX) return;
    equipped.push(id);
    Settings.save();
    AudioMan.play("click");
    this.renderProfileBadges();
    this.renderProfileBadgeList();
  },

  unequipBadge(id) {
    const equipped = Settings.profile.badges.equipped;
    const idx = equipped.indexOf(id);
    if (idx === -1) return;
    equipped.splice(idx, 1);
    Settings.save();
    AudioMan.play("click");
    this.renderProfileBadges();
    this.renderProfileBadgeList();
  },

  moveBadge(index, dir) {
    const equipped = Settings.profile.badges.equipped;
    const j = index + dir;
    if (j < 0 || j >= equipped.length) return;
    const tmp = equipped[index];
    equipped[index] = equipped[j];
    equipped[j] = tmp;
    Settings.save();
    AudioMan.play("click");
    this.renderProfileBadges();
  },
};
