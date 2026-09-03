function lifetimeDefaults() {
  return {
    totalKills: 0,
    totalBosses: 0,
    highestLevel: 0,
    longestTime: 0,
    totalRuns: 0,
    totalGoldEarned: 0,
    totalGoldSpent: 0,
    totalEvolutions: 0,
    masteriesPurchased: 0,
    totalRerolls: 0,
    totalDeletes: 0,
    totalRespawns: 0,
    spawnersDestroyed: 0,
    elitesKilled: 0,
    modifiersDefeated: 0,
    shrinesUsed: 0,
    traderPurchases: 0,
    highestHit: 0,
    highestRunDamage: 0,
    highestWeaponDamage: 0,
    weaponsUsed: {},
    weaponsEvolved: {},
    bossesDefeated: {},
    distinctMasteries: {},
  };
}

function objCount(o) {
  return Object.keys(o || {}).length;
}

function objUnion(a, b) {
  const out = {};
  for (const k in a) out[k] = true;
  for (const k in b) out[k] = true;
  return out;
}

const ACHIEVEMENTS = [
  { id: "first_blood", name: "First Blood", icon: "🩸", category: "General", description: "Defeat your first enemy.", check: (C) => C.totalKills >= 1 },
  { id: "getting_started", name: "Getting Started", icon: "🌱", category: "General", description: "Complete your first run.", check: (C) => C.totalRuns >= 1 },
  { id: "level_up", name: "Level Up!", icon: "⬆️", category: "General", description: "Reach level 10 in a run.", check: (C, g) => g.player.level >= 10, progress: (C, g) => g && g.player ? g.player.level + " / 10" : null },
  { id: "veteran", name: "Veteran", icon: "🎖️", category: "General", description: "Reach level 25 in a run.", check: (C, g) => g.player.level >= 25, progress: (C, g) => g && g.player ? g.player.level + " / 25" : null },
  { id: "elite_survivor", name: "Elite Survivor", icon: "👑", category: "General", description: "Reach level 50 in a run.", check: (C, g) => g.player.level >= 50, progress: (C, g) => g && g.player ? g.player.level + " / 50" : null },
  { id: "overachiever", name: "Overachiever", icon: "⭐", category: "General", description: "Reach level 75 in a run.", check: (C, g) => g.player.level >= 75, progress: (C, g) => g && g.player ? g.player.level + " / 75" : null },
  { id: "endurance", name: "Endurance", icon: "⏱️", category: "General", description: "Survive for 10 minutes.", check: (C, g) => g.time >= 600, progress: (C, g) => Math.floor(g.time / 60) + " / 10 min" },
  { id: "long_haul", name: "Long Haul", icon: "🕐", category: "General", description: "Survive for 15 minutes.", check: (C, g) => g.time >= 900, progress: (C, g) => Math.floor(g.time / 60) + " / 15 min" },
  { id: "marathon", name: "Marathon", icon: "🏃", category: "General", description: "Survive for 20 minutes.", check: (C, g) => g.time >= 1200, progress: (C, g) => Math.floor(g.time / 60) + " / 20 min" },
  { id: "unstoppable", name: "Unstoppable", icon: "🔥", category: "General", description: "Survive for 25 minutes.", check: (C, g) => g.time >= 1500, progress: (C, g) => Math.floor(g.time / 60) + " / 25 min" },

  { id: "centurion", name: "Centurion", icon: "💀", category: "Combat", description: "Defeat 100 enemies in a single run.", check: (C, g) => g.stats.enemiesKilled >= 100, progress: (C, g) => g.stats.enemiesKilled + " / 100" },
  { id: "massacre", name: "Massacre", icon: "☠️", category: "Combat", description: "Defeat 1,000 enemies in a single run.", check: (C, g) => g.stats.enemiesKilled >= 1000, progress: (C, g) => g.stats.enemiesKilled + " / 1000" },
  { id: "exterminator", name: "Exterminator", icon: "🔥", category: "Combat", description: "Defeat 5,000 enemies in a single run.", check: (C, g) => g.stats.enemiesKilled >= 5000, progress: (C, g) => g.stats.enemiesKilled + " / 5000" },
  { id: "elite_hunter", name: "Elite Hunter", icon: "🟠", category: "Combat", description: "Defeat 10 elites in a single run.", check: (C, g) => g.stats.elitesKilled >= 10, progress: (C, g) => g.stats.elitesKilled + " / 10" },
  { id: "elite_slayer", name: "Elite Slayer", icon: "⚔️", category: "Combat", description: "Defeat 50 elites across all runs.", check: (C) => C.elitesKilled >= 50, progress: (C) => C.elitesKilled + " / 50" },
  { id: "modifier_crusher", name: "Modifier Crusher", icon: "💢", category: "Combat", description: "Defeat an elite with a modifier.", check: (C) => C.modifiersDefeated >= 1 },
  { id: "untouchable", name: "Untouchable", icon: "🛡️", category: "Combat", description: "Survive 5 minutes without taking damage.", check: (C, g) => g.time >= 300 && g.stats.damageTaken === 0 },
  { id: "close_call", name: "Close Call", icon: "❤️", category: "Combat", description: "Survive 30 seconds after dropping below 10% HP.", check: (C, g) => g.stats.lowHpStart != null && g.time - g.stats.lowHpStart >= 30 },
  { id: "glass_cannon", name: "Glass Cannon", icon: "💥", category: "Combat", description: "Defeat 500 enemies in a run without a defensive or healing weapon.", check: (C, g) => g.stats.enemiesKilled >= 500 && !g.player.weapons.some(w => w.id === "aura" || w.id === "deflector"), progress: (C, g) => g.stats.enemiesKilled + " / 500" },
  { id: "against_all_odds", name: "Against All Odds", icon: "😈", category: "Combat", description: "Defeat a boss while below 10% HP.", check: (C, g) => g.stats.bossKilledLowHp === true },

  { id: "warden_down", name: "Warden Down", icon: "👊", category: "Bosses", description: "Defeat the Warden for the first time.", check: (C) => C.bossesDefeated.warden === true },
  { id: "tyrant_down", name: "Tyrant Down", icon: "👊", category: "Bosses", description: "Defeat the Tyrant for the first time.", check: (C) => C.bossesDefeated.tyrant === true },
  { id: "leviathan_down", name: "Leviathan Down", icon: "🌊", category: "Bosses", description: "Defeat the Leviathan for the first time.", check: (C) => C.bossesDefeated.leviathan === true },
  { id: "overlord_down", name: "Overlord Down", icon: "👑", category: "Bosses", description: "Defeat the Overlord for the first time.", check: (C) => C.bossesDefeated.overlord === true },
  { id: "boss_hunter", name: "Boss Hunter", icon: "💀", category: "Bosses", description: "Defeat 10 bosses across all runs.", check: (C) => C.totalBosses >= 10, progress: (C) => C.totalBosses + " / 10" },
  { id: "boss_rush", name: "Boss Rush", icon: "⚡", category: "Bosses", description: "Defeat 3 bosses in a single run.", check: (C, g) => g.stats.bossesKilled >= 3, progress: (C, g) => g.stats.bossesKilled + " / 3" },
  { id: "nightmare_fuel", name: "Nightmare Fuel", icon: "😱", category: "Bosses", description: "Defeat the Overlord without using a respawn.", check: (C, g) => g.stats.overlordNoRespawn === true },

  { id: "arsenal", name: "Arsenal", icon: "🔫", category: "Weapons", description: "Own 4 weapons simultaneously.", check: (C, g) => g.player.weapons.length >= 4, progress: (C, g) => g.player.weapons.length + " / 4" },
  { id: "fully_armed", name: "Fully Armed", icon: "💪", category: "Weapons", description: "Max out all 4 weapon slots in a run.", check: (C, g) => g.player.weapons.length >= 4 && g.player.weapons.every(w => w.level >= 6) },
  { id: "first_evolution", name: "First Evolution", icon: "✨", category: "Weapons", description: "Evolve your first weapon.", check: (C) => C.totalEvolutions >= 1 },
  { id: "evolution_master", name: "Evolution Master", icon: "🌟", category: "Weapons", description: "Evolve 10 weapons across all runs.", check: (C) => C.totalEvolutions >= 10, progress: (C) => C.totalEvolutions + " / 10" },
  { id: "full_evolution", name: "Full Evolution", icon: "💫", category: "Weapons", description: "Have 4 evolved weapons simultaneously.", check: (C, g) => g.player.weapons.filter(w => w.evolved).length >= 4, progress: (C, g) => g.player.weapons.filter(w => w.evolved).length + " / 4" },
  { id: "master_of_one", name: "Master of One", icon: "🧠", category: "Weapons", description: "Fully master a single weapon.", check: (C, g) => Object.values(g.masteries || {}).some(arr => arr.length >= CONFIG.mastery.maxPerWeapon) },
  { id: "master_collector", name: "Master Collector", icon: "📚", category: "Weapons", description: "Purchase 10 different weapon masteries.", check: (C) => C.distinctMasteries >= 10, progress: (C) => C.distinctMasteries + " / 10" },
  { id: "everything_is_maxed", name: "Everything Is Maxed", icon: "🔱", category: "Weapons", description: "Have 4 max-level weapons and 4 max-level passives.", check: (C, g) => g.player.weapons.length >= 4 && g.player.weapons.every(w => w.level >= 6) && g.player.passives.length >= 4 && g.player.passives.every(s => s.level >= 5) },
  { id: "jack_of_all_trades", name: "Jack of All Trades", icon: "🃏", category: "Weapons", description: "Use every weapon at least once across all runs.", check: (C) => C.weaponsUsed >= objCount(CONFIG.weapons), progress: (C) => C.weaponsUsed + " / " + objCount(CONFIG.weapons) },

  { id: "big_spender", name: "Big Spender", icon: "💰", category: "Systems", description: "Spend 5,000 gold across all runs.", check: (C) => C.totalGoldSpent >= 5000, progress: (C) => C.totalGoldSpent + " / 5000" },
  { id: "loaded", name: "Loaded", icon: "🤑", category: "Systems", description: "Earn 10,000 gold across all runs.", check: (C) => C.totalGoldEarned >= 10000, progress: (C) => C.totalGoldEarned + " / 10000" },
  { id: "trader_favorite", name: "Trader's Favorite", icon: "🛒", category: "Systems", description: "Make 10 purchases from the Trader.", check: (C) => C.traderPurchases >= 10, progress: (C) => C.traderPurchases + " / 10" },
  { id: "blessed", name: "Blessed", icon: "🙏", category: "Systems", description: "Purchase 5 Shrine blessings.", check: (C) => C.shrinesUsed >= 5, progress: (C) => C.shrinesUsed + " / 5" },
  { id: "reroll_addict", name: "Reroll Addict", icon: "🔄", category: "Systems", description: "Use 25 rerolls across all runs.", check: (C) => C.totalRerolls >= 25, progress: (C) => C.totalRerolls + " / 25" },
  { id: "spring_cleaning", name: "Spring Cleaning", icon: "🗑️", category: "Systems", description: "Delete 25 items across all runs.", check: (C) => C.totalDeletes >= 25, progress: (C) => C.totalDeletes + " / 25" },
  { id: "second_chance", name: "Second Chance", icon: "💞", category: "Systems", description: "Use a respawn for the first time.", check: (C) => C.totalRespawns >= 1 },
  { id: "spawner_hunter", name: "Spawner Hunter", icon: "🏗️", category: "Systems", description: "Destroy 10 spawners across all runs.", check: (C) => C.spawnersDestroyed >= 10, progress: (C) => C.spawnersDestroyed + " / 10" },

  { id: "no_help_needed", name: "No Help Needed", icon: "🗡️", category: "Challenge", description: "Survive 15 minutes without buying from the Trader or Shrine.", check: (C, g) => g.time >= 900 && g.stats.traderPurchasesThisRun === 0 && g.stats.shrineUsesThisRun === 0 },
  { id: "minimalist", name: "Minimalist", icon: "🎒", category: "Challenge", description: "Survive 15 minutes with only 2 weapons.", check: (C, g) => g.time >= 900 && g.stats.maxWeaponsOwned <= 2 },
  { id: "one_trick_pony", name: "One-Trick Pony", icon: "🎯", category: "Challenge", description: "Survive 10 minutes with only one weapon.", check: (C, g) => g.time >= 600 && g.stats.maxWeaponsOwned <= 1 },
  { id: "perfect_run", name: "Perfect Run", icon: "✨", category: "Challenge", description: "Survive 20 minutes without using a respawn.", check: (C, g) => g.time >= 1200 && g.respawnsUsed === 0 },
  { id: "impossible", name: "Impossible?", icon: "💀", category: "Challenge", description: "Defeat the Overlord while having no evolved weapons.", check: (C, g) => g.stats.overlordNoEvo === true },
  { id: "the_last_stand", name: "The Last Stand", icon: "👑", category: "Challenge", description: "Defeat the Overlord below 10% HP without using a respawn.", check: (C, g) => g.stats.overlordLowHpNoRespawn === true },

  { id: "godspeed", num: 51, name: "Godspeed", icon: "⚡", category: "Insane", tier: "Insane", description: "Defeat the Overlord locked at 4× game speed.", check: (C, g) => ChallengeRun.completed && ChallengeRun.id === "godspeed", challenge: { goal: "Defeat the Overlord", rules: { speedLock: 4 }, confirm: [["⚡", "Game Speed", "4× (locked)"]] } },
  { id: "untouchable_god", num: 52, name: "Untouchable God", icon: "👁️", category: "Insane", tier: "Insane", description: "Survive 20 minutes without taking any damage.", check: (C, g) => g.time >= 1200 && g.stats.damageTaken === 0 },
  { id: "barely_armed", num: 53, name: "Barely Armed", icon: "🗡️", category: "Insane", tier: "Insane", description: "Defeat the Overlord with exactly 1 weapon slot.", check: (C, g) => ChallengeRun.completed && ChallengeRun.id === "barely_armed", challenge: { goal: "Defeat the Overlord", rules: { weaponSlots: 1 }, confirm: [["🗡️", "Weapon Slots", "1"]] } },
  { id: "no_evolution", num: 54, name: "No Evolution", icon: "🚫✨", category: "Insane", tier: "Insane", description: "Defeat the Overlord without evolving any weapon.", check: (C, g) => ChallengeRun.completed && ChallengeRun.id === "no_evolution", challenge: { goal: "Defeat the Overlord", rules: { noEvolution: true }, confirm: [["🚫", "Evolutions", "Disabled"]] } },
  { id: "the_purist", num: 55, name: "The Purist", icon: "🧘", category: "Insane", tier: "Insane", description: "Defeat the Overlord without Trader, Shrine, rerolls, deletes, or respawns.", check: (C, g) => g.stats.bossesDefeated.overlord === true && g.stats.traderPurchasesThisRun === 0 && g.stats.shrineUsesThisRun === 0 && g.stats.rerollsThisRun === 0 && g.stats.deletesThisRun === 0 && g.respawnsUsed === 0 },
  { id: "horde_breaker", num: 56, name: "Horde Breaker", icon: "☠️", category: "Insane", tier: "Insane", description: "Defeat the Overlord against overwhelming enemy density.", check: (C, g) => ChallengeRun.completed && ChallengeRun.id === "horde_breaker", challenge: { goal: "Defeat the Overlord", rules: { enemyCapMult: CONFIG.challenge.horde.enemyCapMult, spawnRateMult: CONFIG.challenge.horde.spawnRateMult }, confirm: [["☠️", "Enemy Cap", "×" + CONFIG.challenge.horde.enemyCapMult], ["☠️", "Spawn Rate", "×" + CONFIG.challenge.horde.spawnRateMult]] } },
  { id: "elite_apocalypse", num: 57, name: "Elite Apocalypse", icon: "🔥", category: "Insane", tier: "Insane", description: "Defeat 2,000 elite tank enemies in a single run.", check: (C, g) => g.stats.eliteTanksKilled >= 2000, progress: (C, g) => g.stats.eliteTanksKilled + " / 2000" },
  { id: "boss_slayer", num: 58, name: "Boss Slayer", icon: "👑", category: "Insane", tier: "Insane", description: "Defeat the Overlord against massively durable bosses.", check: (C, g) => ChallengeRun.completed && ChallengeRun.id === "boss_slayer", challenge: { goal: "Defeat the Overlord", rules: { bossHpMult: CONFIG.challenge.boss.bossHpMult, bossDamageMult: CONFIG.challenge.boss.bossDamageMult }, confirm: [["👑", "Boss HP", "×" + CONFIG.challenge.boss.bossHpMult], ["💥", "Boss Damage", "×" + CONFIG.challenge.boss.bossDamageMult]] } },
  { id: "true_randomness", num: 59, name: "True Randomness", icon: "🎲", category: "Insane", tier: "Insane", description: "Defeat the Overlord with random level-up choices.", check: (C, g) => ChallengeRun.completed && ChallengeRun.id === "true_randomness", challenge: { goal: "Defeat the Overlord", rules: { autoLevelUp: true }, confirm: [["🎲", "Level-up Choice", "Random"]] } },
  { id: "master_of_none", num: 60, name: "Master of None", icon: "🎭", category: "Insane", tier: "Insane", description: "Defeat the Overlord with all 4 weapon slots filled and no weapon above 35% of total damage.", check: (C, g) => ChallengeRun.completed && ChallengeRun.id === "master_of_none", challenge: { goal: "Defeat the Overlord", rules: { weaponSlots: 4 }, confirm: [["🗡️", "Weapon Slots", "4 (locked)"], ["⚖️", "Damage Share", "≤ 35% per weapon"], ["✨", "Evolutions", "Allowed"], ["🛒", "Trader", "Allowed"], ["🙏", "Shrine", "Allowed"], ["❤️", "Revives", "Normal"]], validate: (game) => { const weapons = game.player.weapons; if (weapons.length !== 4) return { ok: false, reason: "Needs all 4 weapon slots filled" }; const total = game.stats.damageDealt || 0; for (const w of weapons) { const dmg = game.weaponDamage[w.id] || 0; if (total > 0 && dmg / total > 0.35) { const def = weaponDef(w.id); return { ok: false, reason: (def ? def.name : w.id) + " dealt over 35% of damage" }; } } return { ok: true }; } } },
];

const ACHIEVEMENT_CATEGORIES = ["General", "Combat", "Bosses", "Weapons", "Systems", "Challenge", "Insane"];

const BADGE_IDS = ["first_blood", "veteran", "elite_survivor", "boss_hunter", "evolution_master", "loaded", "elite_slayer", "perfect_run", "the_last_stand", "godspeed", "untouchable_god", "barely_armed", "no_evolution", "the_purist", "horde_breaker", "elite_apocalypse", "boss_slayer", "true_randomness", "master_of_none"];

const BADGE_MAX = 3;

function achievementById(id) {
  for (const a of ACHIEVEMENTS) if (a.id === id) return a;
  return null;
}

const Achievements = {
  unlocked: null,

  init() {
    const d = lifetimeDefaults();
    if (!Settings.stats || typeof Settings.stats !== "object") Settings.stats = {};
    for (const k in d) if (Settings.stats[k] === undefined) Settings.stats[k] = d[k];
    if (!Settings.achievements || typeof Settings.achievements !== "object") Settings.achievements = {};
    if (Settings.stats.weaponsUsed) {
      for (const id in Settings.stats.weaponsUsed) {
        if (Settings.stats.weaponsUsed[id] === true) Settings.stats.weaponsUsed[id] = 1;
      }
    }
    this.unlocked = Settings.achievements;
  },

  unlockedCount() {
    return objCount(this.unlocked);
  },

  weaponUsage(game) {
    const L = Settings.stats || {};
    const s = (game && game.stats) || {};
    const out = {};
    if (L.weaponsUsed) {
      for (const id in L.weaponsUsed) {
        out[id] = typeof L.weaponsUsed[id] === "number" ? L.weaponsUsed[id] : 1;
      }
    }
    if (s.weaponsUsed) {
      for (const id in s.weaponsUsed) out[id] = (out[id] || 0) + 1;
    }
    return out;
  },

  favoriteWeapon(game) {
    const usage = this.weaponUsage(game);
    let bestId = null;
    let bestCount = 0;
    for (const id in usage) {
      if (usage[id] > bestCount) {
        bestCount = usage[id];
        bestId = id;
      }
    }
    if (!bestId) return null;
    const def = weaponDef(bestId);
    return { id: bestId, name: def ? def.name : bestId, icon: def ? def.icon : "🔫", count: bestCount };
  },

  buildSummary(game) {
    const L = Settings.stats || {};
    const s = (game && game.stats) || {};
    const p = (game && game.player) || null;

    const masterySet = {};
    if (game && game.masteries) {
      for (const wid in game.masteries) {
        for (const mid of game.masteries[wid]) masterySet[wid + ":" + mid] = true;
      }
    }

    return {
      totalKills: (L.totalKills || 0) + (s.enemiesKilled || 0),
      totalBosses: (L.totalBosses || 0) + (s.bossesKilled || 0),
      totalRuns: L.totalRuns || 0,
      highestLevel: Math.max(L.highestLevel || 0, p ? p.level : 0),
      longestTime: Math.max(L.longestTime || 0, game ? game.time : 0),
      totalGoldEarned: (L.totalGoldEarned || 0) + (s.goldGained || 0),
      totalGoldSpent: (L.totalGoldSpent || 0) + (s.goldSpent || 0),
      totalEvolutions: (L.totalEvolutions || 0) + (s.evolutionsThisRun || 0),
      masteriesPurchased: (L.masteriesPurchased || 0) + (s.masteriesThisRun || 0),
      totalRerolls: (L.totalRerolls || 0) + (s.rerollsThisRun || 0),
      totalDeletes: (L.totalDeletes || 0) + (s.deletesThisRun || 0),
      totalRespawns: (L.totalRespawns || 0) + (game ? game.respawnsUsed : 0),
      spawnersDestroyed: (L.spawnersDestroyed || 0) + (s.spawnersThisRun || 0),
      elitesKilled: (L.elitesKilled || 0) + (s.elitesKilled || 0),
      modifiersDefeated: (L.modifiersDefeated || 0) + (s.modifiersDefeated || 0),
      shrinesUsed: (L.shrinesUsed || 0) + (s.shrineUsesThisRun || 0),
      traderPurchases: (L.traderPurchases || 0) + (s.traderPurchasesThisRun || 0),
      highestHit: Math.max(L.highestHit || 0, s.highestHit || 0),
      highestRunDamage: Math.max(L.highestRunDamage || 0, s.damageDealt || 0),
      highestWeaponDamage: L.highestWeaponDamage || 0,
      weaponsUsed: objCount(objUnion(L.weaponsUsed, s.weaponsUsed)),
      weaponsEvolved: objCount(objUnion(L.weaponsEvolved, s.weaponsEvolvedThisRun)),
      bossesDefeated: objUnion(L.bossesDefeated, s.bossesDefeated),
      distinctMasteries: objCount(objUnion(L.distinctMasteries, masterySet)),
    };
  },

  check(game) {
    const C = this.buildSummary(game);
    const newly = [];
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked[a.id]) continue;
      let ok = false;
      try { ok = a.check(C, game); } catch (e) { ok = false; }
      if (ok) {
        this.unlocked[a.id] = true;
        newly.push(a);
      }
    }
    if (newly.length) Settings.save();
    return newly;
  },

  commitRun(game) {
    const L = Settings.stats;
    const s = game.stats;
    L.totalRuns = (L.totalRuns || 0) + 1;
    L.totalKills = (L.totalKills || 0) + s.enemiesKilled;
    L.totalBosses = (L.totalBosses || 0) + s.bossesKilled;
    L.totalGoldEarned = (L.totalGoldEarned || 0) + s.goldGained;
    L.totalGoldSpent = (L.totalGoldSpent || 0) + s.goldSpent;
    L.totalEvolutions = (L.totalEvolutions || 0) + s.evolutionsThisRun;
    L.masteriesPurchased = (L.masteriesPurchased || 0) + s.masteriesThisRun;
    L.totalRerolls = (L.totalRerolls || 0) + s.rerollsThisRun;
    L.totalDeletes = (L.totalDeletes || 0) + s.deletesThisRun;
    L.totalRespawns = (L.totalRespawns || 0) + game.respawnsUsed;
    L.spawnersDestroyed = (L.spawnersDestroyed || 0) + s.spawnersThisRun;
    L.elitesKilled = (L.elitesKilled || 0) + s.elitesKilled;
    L.modifiersDefeated = (L.modifiersDefeated || 0) + s.modifiersDefeated;
    L.shrinesUsed = (L.shrinesUsed || 0) + s.shrineUsesThisRun;
    L.traderPurchases = (L.traderPurchases || 0) + s.traderPurchasesThisRun;
    L.highestHit = Math.max(L.highestHit || 0, s.highestHit || 0);
    L.highestRunDamage = Math.max(L.highestRunDamage || 0, s.damageDealt || 0);
    let maxWeapon = 0;
    for (const id in game.weaponDamage) maxWeapon = Math.max(maxWeapon, game.weaponDamage[id] || 0);
    L.highestWeaponDamage = Math.max(L.highestWeaponDamage || 0, maxWeapon);
    L.highestLevel = Math.max(L.highestLevel || 0, game.player.level);
    L.longestTime = Math.max(L.longestTime || 0, game.time);
    for (const id in s.weaponsUsed) L.weaponsUsed[id] = (L.weaponsUsed[id] || 0) + 1;
    for (const id in s.weaponsEvolvedThisRun) L.weaponsEvolved[id] = true;
    for (const id in s.bossesDefeated) L.bossesDefeated[id] = true;
    for (const wid in game.masteries) {
      for (const mid of game.masteries[wid]) L.distinctMasteries[wid + ":" + mid] = true;
    }
    Settings.save();
    return this.check(game);
  },
};
