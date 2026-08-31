const CONFIG = {
  player: {
    maxHp: 100,
    speed: 240,
    radius: 15,
    baseCritChance: 0.05,
    critDamage: 1.5,
    basePickupRadius: 55,
    invulnTime: 0.5,
    maxWeapons: 4,
    maxPassives: 4,
  },

  xp: {
    base: 20,
    growth: 1.18,
    small: 5,
    medium: 15,
    large: 50,
  },

  heal: {
    amount: 45,
    radius: 11,
    spawnMin: 60,
    spawnMax: 90,
  },

  magnet: {
    radius: 12,
    burstDuration: 2.5,
    pullSpeed: 900,
    burstSpeed: 1600,
    spawnMin: 90,
    spawnMax: 140,
  },

  bossArena: {
    cageRadius: 480,
    chestCrystals: 6,
    crystalValue: 100,
    bossHealsMin: 1,
    bossHealsMax: 2,
    minionHpMult: 3,
  },

  gold: {
    enemyChance: 0.001,
    enemyAmount: 30,
    bossAmountMid: 75,
    bossAmountFinal: 150,
    chestChance: 0.4,
    chestAmount: 30,
  },

  shop: {
    weaponCost: 150,
  },

  overflow: {
    maxhp: { name: "Vitality", icon: "❤️", description: "+5 max HP" },
    damage: { name: "Might", icon: "⚔️", description: "+3% damage" },
    speed: { name: "Haste", icon: "💨", description: "+2% move speed" },
    gold: { name: "Riches", icon: "💰", description: "+30 gold" },
    heal: { name: "Restore", icon: "💚", description: "Fully restore HP" },
    overload: { name: "Overload", icon: "⚡", description: "+100% damage for 10s" },
    timewarp: { name: "Time Warp", icon: "⏳", description: "Slow enemies 50% for 8s" },
  },

  accountUpgrades: [
    { id: "weapon_slot", name: "Extra Weapon Slot", icon: "🔫", maxRank: 1, cost: 600, description: "+1 weapon slot (up to 5)" },
    { id: "passive_slot", name: "Extra Passive Slot", icon: "📦", maxRank: 1, cost: 600, description: "+1 passive slot (up to 5)" },
    { id: "start_hp", name: "Starting Vitality", icon: "❤️", maxRank: 2, cost: 250, description: "+25 starting HP per rank" },
    { id: "crit_chance", name: "Critical Chance", icon: "🎯", maxRank: 5, cost: 350, description: "+5% crit chance per rank" },
    { id: "crit_damage", name: "Critical Damage", icon: "💥", maxRank: 5, cost: 350, description: "+25% crit damage per rank" },
  ],

  weaponUpgrades: {
    magic_bolt: { name: "Piercing Bolt", icon: "✨", maxRank: 1, cost: 800, description: "Bolts pierce +1 enemy", add: { pierce: 1 } },
    fireball: { name: "Twin Fireball", icon: "🔥", maxRank: 1, cost: 800, description: "Launches +1 fireball", add: { projectileCount: 1 } },
    blades: { name: "Maelstrom", icon: "⚔️", maxRank: 1, cost: 800, description: "+2 orbiting blades", add: { bladeCount: 2 } },
    lightning: { name: "Chain Lightning", icon: "⚡", maxRank: 1, cost: 800, description: "+1 lightning chain (always chains)", add: { chainCount: 1 } },
    boomerang: { name: "Twin Glaive", icon: "🪃", maxRank: 1, cost: 800, description: "Throws +1 boomerang", add: { projectileCount: 1 } },
    nova: { name: "Concussive Nova", icon: "💥", maxRank: 1, cost: 800, description: "Nova always knocks enemies back", add: { knockback: 260 } },
    aura: { name: "Rejuvenating Aura", icon: "🔮", maxRank: 1, cost: 800, description: "Aura always heals +1 per tick", add: { heal: 1 } },
    deflector: { name: "Overclock", icon: "💠", maxRank: 1, cost: 800, description: "+5 projectiles cleared per pulse", add: { maxClear: 5 } },
    plasma: { name: "Volatile Orb", icon: "🫧", maxRank: 1, cost: 800, description: "+2 bounces per orb", add: { bounces: 2 } },
  },

  endless: {
    bossInterval: 180,
    scoreTime: 10,
    scoreKill: 10,
    scoreDamage: 0.1,
    scoreBoss: 500,
  },

  arena: {
    gridSize: 90,
  },

  difficulty: {
    hpGrowth: 0.10,
    damageGrowth: 0.07,
    speedGrowth: 0.03,
    speedCap: 0.18,
    spawnIntervalMin: 280,
    spawnIntervalMax: 950,
    maxEnemiesMin: 60,
    maxEnemiesMax: 170,
    bossHpScale: 0.05,
  },

  enemies: {
    basic: { name: "Basic", hp: 30, speed: 80, damage: 10, radius: 14, xp: 5, color: "#4ecb6f" },
    runner: { name: "Runner", hp: 20, speed: 172, damage: 8, radius: 12, xp: 6, color: "#ffce4f" },
    tank: { name: "Tank", hp: 185, speed: 55, damage: 18, radius: 22, xp: 20, color: "#a06bff" },
    ranged: { name: "Ranged", hp: 50, speed: 92, damage: 12, radius: 13, xp: 12, color: "#ff6b6b", ranged: true, fireCooldown: 2200, projSpeed: 240, projDamage: 10 },
    swarm: { name: "Swarm", hp: 12, speed: 112, damage: 5, radius: 9, xp: 3, color: "#ff7ad9" },
  },

  elite: {
    hpMult: 6,
    damageMult: 2,
    radiusMult: 1.35,
    xpMult: 6,
    color: "#ff8a3d",
  },

  weapons: {
    magic_bolt: {
      name: "Magic Bolt",
      icon: "✨",
      maxLevel: 6,
      description: "Fires a magic bolt at the nearest enemy.",
      levels: [
        { damage: 32, cooldown: 750, projectileSpeed: 560, projectileCount: 1, pierce: 0, projectileRadius: 6 },
        { damage: 48, cooldown: 750, projectileSpeed: 560, projectileCount: 1, pierce: 0, projectileRadius: 6 },
        { damage: 48, cooldown: 750, projectileSpeed: 560, projectileCount: 2, pierce: 0, projectileRadius: 6 },
        { damage: 48, cooldown: 750, projectileSpeed: 560, projectileCount: 2, pierce: 1, projectileRadius: 6 },
        { damage: 48, cooldown: 750, projectileSpeed: 560, projectileCount: 3, pierce: 1, projectileRadius: 6 },
        { damage: 72, cooldown: 750, projectileSpeed: 560, projectileCount: 3, pierce: 2, projectileRadius: 7 },
      ],
      upgradeText: ["", "+50% damage", "+1 projectile", "Pierce +1 enemy", "+1 projectile", "+50% damage & +1 pierce"],
      evo: { requires: "critical_focus", name: "Astral Bolts", icon: "🌠", description: "Magic Bolt evolves into piercing astral bolts.", stats: { damage: 96, projectileCount: 4, pierce: 3, projectileRadius: 9 } },
    },
    fireball: {
      name: "Fireball",
      icon: "🔥",
      maxLevel: 6,
      description: "Launches a slow projectile that explodes on impact.",
      levels: [
        { damage: 30, cooldown: 1400, projectileSpeed: 300, projectileCount: 1, pierce: 0, projectileRadius: 9, explosionRadius: 70 },
        { damage: 30, cooldown: 1400, projectileSpeed: 300, projectileCount: 1, pierce: 0, projectileRadius: 9, explosionRadius: 105 },
        { damage: 42, cooldown: 1400, projectileSpeed: 300, projectileCount: 1, pierce: 0, projectileRadius: 9, explosionRadius: 105 },
        { damage: 42, cooldown: 1400, projectileSpeed: 300, projectileCount: 2, pierce: 0, projectileRadius: 9, explosionRadius: 105 },
        { damage: 42, cooldown: 1100, projectileSpeed: 300, projectileCount: 2, pierce: 0, projectileRadius: 9, explosionRadius: 105 },
        { damage: 62, cooldown: 1100, projectileSpeed: 300, projectileCount: 2, pierce: 0, projectileRadius: 11, explosionRadius: 165 },
      ],
      upgradeText: ["", "+50% explosion radius", "+40% damage", "+1 fireball", "+20% attack speed", "+50% damage & +55% radius"],
      evo: { requires: "amplify", name: "Meteor Storm", icon: "☄️", description: "Fireball evolves into devastating meteors.", stats: { damage: 100, projectileCount: 3, explosionRadius: 230, projectileRadius: 13 } },
    },
    blades: {
      name: "Orbiting Blades",
      icon: "⚔️",
      maxLevel: 6,
      description: "Blades orbit you, damaging enemies on contact.",
      levels: [
        { bladeCount: 3, damage: 18, orbitRadius: 85, rotationSpeed: 3.8, bladeRadius: 22 },
        { bladeCount: 4, damage: 18, orbitRadius: 85, rotationSpeed: 4.4, bladeRadius: 22 },
        { bladeCount: 4, damage: 28, orbitRadius: 85, rotationSpeed: 4.4, bladeRadius: 22 },
        { bladeCount: 4, damage: 28, orbitRadius: 105, rotationSpeed: 4.4, bladeRadius: 27 },
        { bladeCount: 5, damage: 28, orbitRadius: 105, rotationSpeed: 5.4, bladeRadius: 27 },
        { bladeCount: 6, damage: 44, orbitRadius: 105, rotationSpeed: 5.8, bladeRadius: 34 },
      ],
      upgradeText: ["", "+1 blade & faster spin", "+55% damage", "+25% orbit & blade size", "+1 blade & faster spin", "+55% damage, +1 blade & larger"],
      evo: { requires: "overdrive", name: "Vortex", icon: "🌀", description: "Blades evolve into a razor vortex.", stats: { bladeCount: 8, damage: 75, rotationSpeed: 7.2, bladeRadius: 40 } },
    },
    lightning: {
      name: "Lightning",
      icon: "⚡",
      maxLevel: 6,
      description: "Strikes enemies from above with powerful lightning.",
      levels: [
        { damage: 80, cooldown: 2000, strikeCount: 1, aoeRadius: 60, chainCount: 0 },
        { damage: 80, cooldown: 2000, strikeCount: 2, aoeRadius: 60, chainCount: 0 },
        { damage: 110, cooldown: 2000, strikeCount: 2, aoeRadius: 60, chainCount: 0 },
        { damage: 110, cooldown: 2000, strikeCount: 2, aoeRadius: 70, chainCount: 1 },
        { damage: 110, cooldown: 1500, strikeCount: 2, aoeRadius: 70, chainCount: 1 },
        { damage: 150, cooldown: 1500, strikeCount: 3, aoeRadius: 80, chainCount: 1 },
      ],
      upgradeText: ["", "+1 strike", "+35% damage", "Chains to +1 enemy", "-25% cooldown", "+1 strike & +35% damage"],
      evo: { requires: "magnet", name: "Stormbringer", icon: "🌩️", description: "Lightning evolves into an unstoppable storm.", stats: { damage: 260, strikeCount: 5, chainCount: 3, cooldown: 1200, aoeRadius: 90 } },
    },
    boomerang: {
      name: "Boomerang",
      icon: "🪃",
      maxLevel: 6,
      description: "Throws a boomerang that returns to you.",
      levels: [
        { damage: 30, cooldown: 1500, projectileCount: 1, pierce: 4, projectileRadius: 10, projectileSpeed: 460, range: 400 },
        { damage: 42, cooldown: 1500, projectileCount: 1, pierce: 4, projectileRadius: 10, projectileSpeed: 460, range: 400 },
        { damage: 42, cooldown: 1500, projectileCount: 2, pierce: 4, projectileRadius: 10, projectileSpeed: 460, range: 400 },
        { damage: 42, cooldown: 1500, projectileCount: 2, pierce: 4, projectileRadius: 15, projectileSpeed: 460, range: 400 },
        { damage: 42, cooldown: 1500, projectileCount: 2, pierce: 4, projectileRadius: 15, projectileSpeed: 560, range: 460 },
        { damage: 60, cooldown: 1500, projectileCount: 2, pierce: 10, projectileRadius: 15, projectileSpeed: 560, range: 460 },
      ],
      upgradeText: ["", "+40% damage", "+1 boomerang", "+50% size", "+20% speed", "+45% damage & +6 pierce"],
      evo: { requires: "swift_feet", name: "Glaive Storm", icon: "🗡️", description: "Boomerang evolves into a storm of glaives.", stats: { damage: 95, projectileCount: 4, pierce: 20, projectileRadius: 20 } },
    },
    nova: {
      name: "Nova",
      icon: "💥",
      maxLevel: 6,
      description: "Releases a shockwave that clears nearby enemies.",
      levels: [
        { damage: 35, cooldown: 2600, radius: 150, knockback: 0 },
        { damage: 35, cooldown: 2600, radius: 205, knockback: 0 },
        { damage: 50, cooldown: 2600, radius: 205, knockback: 0 },
        { damage: 50, cooldown: 2600, radius: 205, knockback: 360 },
        { damage: 50, cooldown: 1900, radius: 205, knockback: 360 },
        { damage: 70, cooldown: 1900, radius: 265, knockback: 440 },
      ],
      upgradeText: ["", "+35% radius", "+40% damage", "Knockback", "-25% cooldown", "+30% radius & damage"],
      evo: { requires: "toughness", name: "Supernova", icon: "💫", description: "Nova evolves into a world-shaking supernova.", stats: { damage: 130, radius: 360, knockback: 620, cooldown: 1400 } },
    },
    aura: {
      name: "Aura",
      icon: "🔮",
      maxLevel: 6,
      description: "Damages enemies around you; more damage up close.",
      levels: [
        { damage: 16, cooldown: 500, radius: 90, heal: 0 },
        { damage: 16, cooldown: 500, radius: 120, heal: 0 },
        { damage: 25, cooldown: 500, radius: 120, heal: 0 },
        { damage: 25, cooldown: 500, radius: 150, heal: 0 },
        { damage: 36, cooldown: 500, radius: 150, heal: 1 },
        { damage: 50, cooldown: 450, radius: 175, heal: 2 },
      ],
      upgradeText: ["", "+35% radius", "+60% damage", "+25% radius", "+40% damage & heals 1/tick", "+35% damage & heals 2/tick"],
      evo: { requires: "berserker", name: "Radiance", icon: "✨", description: "Aura evolves into a burning radiance.", stats: { damage: 70, radius: 240, heal: 4, cooldown: 400 } },
    },
    deflector: {
      name: "Deflector",
      icon: "💠",
      maxLevel: 6,
      description: "Periodically clears enemy projectiles near you.",
      levels: [
        { cooldown: 1800, radius: 170, maxClear: 5 },
        { cooldown: 1800, radius: 220, maxClear: 5 },
        { cooldown: 1800, radius: 220, maxClear: 8 },
        { cooldown: 1400, radius: 220, maxClear: 8 },
        { cooldown: 1400, radius: 260, maxClear: 11 },
        { cooldown: 1000, radius: 260, maxClear: 15 },
      ],
      upgradeText: ["", "+30% radius", "+3 projectiles cleared", "-22% cooldown", "+18% radius & +3 cleared", "-29% cooldown & +4 cleared"],
      evo: { requires: "growth", name: "Null Field", icon: "❄️", description: "Deflector evolves into an absolute null field.", stats: { cooldown: 800, radius: 300, maxClear: 25 } },
    },
    plasma: {
      name: "Plasma Orb",
      icon: "🫧",
      maxLevel: 6,
      description: "An orb that bounces between enemies, growing stronger each bounce.",
      levels: [
        { damage: 14, cooldown: 1800, projectileCount: 1, bounces: 3, bounceBonus: 4, projectileSpeed: 320, lifetime: 3.5 },
        { damage: 14, cooldown: 1800, projectileCount: 1, bounces: 4, bounceBonus: 4, projectileSpeed: 320, lifetime: 3.5 },
        { damage: 20, cooldown: 1800, projectileCount: 1, bounces: 4, bounceBonus: 4, projectileSpeed: 320, lifetime: 3.5 },
        { damage: 20, cooldown: 1800, projectileCount: 1, bounces: 4, bounceBonus: 8, projectileSpeed: 320, lifetime: 3.5 },
        { damage: 20, cooldown: 1500, projectileCount: 1, bounces: 6, bounceBonus: 8, projectileSpeed: 340, lifetime: 3.5 },
        { damage: 30, cooldown: 1500, projectileCount: 1, bounces: 7, bounceBonus: 12, projectileSpeed: 340, lifetime: 4 },
      ],
      upgradeText: ["", "+1 bounce", "+45% damage", "+4 bounce damage", "+2 bounces & faster", "+50% damage & +4 bounce damage"],
      evo: { requires: "critical_focus", name: "Plasma Storm", icon: "🌌", description: "Plasma evolves into a raging storm of orbs.", stats: { damage: 55, bounces: 10, bounceBonus: 20, lifetime: 5 } },
    },
  },

  skills: {
    swift_feet: {
      name: "Swift Feet", icon: "👟", maxLevel: 5,
      description: "Increases movement speed.",
      effects: ["+12%", "+24%", "+36%", "+48%", "+60%"],
    },
    magnet: {
      name: "Magnet", icon: "🧲", maxLevel: 5,
      description: "Increases XP pickup radius.",
      effects: ["+40%", "+80%", "+120%", "+160%", "+200%"],
    },
    toughness: {
      name: "Toughness", icon: "🛡️", maxLevel: 5,
      description: "Increases maximum HP.",
      effects: ["+30", "+60", "+90", "+120", "+150"],
    },
    berserker: {
      name: "Berserker", icon: "💢", maxLevel: 5,
      description: "Deal more damage while below 30% HP.",
      effects: ["+20%", "+40%", "+60%", "+80%", "+100%"],
    },
    critical_focus: {
      name: "Critical Focus", icon: "🎯", maxLevel: 5,
      description: "Increases critical hit chance.",
      effects: ["+8%", "+16%", "+24%", "+32%", "+40%"],
    },
    growth: {
      name: "Growth", icon: "🌱", maxLevel: 5,
      description: "Increases XP gained from enemies.",
      effects: ["+15%", "+30%", "+45%", "+60%", "+75%"],
    },
    overdrive: {
      name: "Overdrive", icon: "🚀", maxLevel: 5,
      description: "Reduces weapon cooldowns.",
      effects: ["-8%", "-16%", "-24%", "-32%", "-40%"],
    },
    amplify: {
      name: "Amplify", icon: "🔍", maxLevel: 5,
      description: "Increases weapon range and size.",
      effects: ["+15%", "+30%", "+45%", "+60%", "+75%"],
    },
  },

  bosses: {
    warden: {
      name: "Ruins Warden", radius: 46, hp: 4500, speed: 75, damage: 26, xp: 400, color: "#ff4d8d", tier: 1,
      attacks: { burst: true, charge: true, summon: true },
    },
    tyrant: {
      name: "Void Tyrant", radius: 54, hp: 9000, speed: 85, damage: 32, xp: 600, color: "#b04dff", tier: 2,
      attacks: { burst: true, charge: true, summon: true },
    },
    leviathan: {
      name: "Abyss Leviathan", radius: 62, hp: 16000, speed: 80, damage: 38, xp: 900, color: "#3dd0c0", tier: 3,
      attacks: { burst: true, charge: true, summon: true },
    },
    overlord: {
      name: "Void Overlord", radius: 70, hp: 26000, speed: 95, damage: 44, xp: 1200, color: "#ff3d8d", tier: 4, final: true,
      attacks: { burst: true, charge: true, summon: true },
    },
  },

  bossSchedule: [
    { time: 300, type: "warden" },
    { time: 600, type: "tyrant" },
    { time: 900, type: "leviathan" },
    { time: 1200, type: "overlord" },
  ],
};

function xpForLevel(level) {
  return Math.floor(CONFIG.xp.base * Math.pow(CONFIG.xp.growth, level - 1));
}
