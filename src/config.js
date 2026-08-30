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
    base: 25,
    growth: 1.22,
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
    chestCrystals: 4,
    crystalValue: 100,
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
    },
    blades: {
      name: "Orbiting Blades",
      icon: "⚔️",
      maxLevel: 6,
      description: "Blades orbit you, damaging enemies on contact.",
      levels: [
        { bladeCount: 3, damage: 18, orbitRadius: 85, rotationSpeed: 3.8, bladeRadius: 18 },
        { bladeCount: 4, damage: 18, orbitRadius: 85, rotationSpeed: 4.4, bladeRadius: 18 },
        { bladeCount: 4, damage: 28, orbitRadius: 85, rotationSpeed: 4.4, bladeRadius: 18 },
        { bladeCount: 4, damage: 28, orbitRadius: 105, rotationSpeed: 4.4, bladeRadius: 22 },
        { bladeCount: 5, damage: 28, orbitRadius: 105, rotationSpeed: 5.4, bladeRadius: 22 },
        { bladeCount: 6, damage: 44, orbitRadius: 105, rotationSpeed: 5.8, bladeRadius: 28 },
      ],
      upgradeText: ["", "+1 blade & faster spin", "+55% damage", "+25% orbit & blade size", "+1 blade & faster spin", "+55% damage, +1 blade & larger"],
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
    },
    boomerang: {
      name: "Boomerang",
      icon: "🪃",
      maxLevel: 6,
      description: "Throws a boomerang that returns to you.",
      levels: [
        { damage: 25, cooldown: 1600, projectileCount: 1, pierce: 4, projectileRadius: 10, projectileSpeed: 420, range: 380 },
        { damage: 34, cooldown: 1600, projectileCount: 1, pierce: 4, projectileRadius: 10, projectileSpeed: 420, range: 380 },
        { damage: 34, cooldown: 1600, projectileCount: 2, pierce: 4, projectileRadius: 10, projectileSpeed: 420, range: 380 },
        { damage: 34, cooldown: 1600, projectileCount: 2, pierce: 4, projectileRadius: 14, projectileSpeed: 420, range: 380 },
        { damage: 34, cooldown: 1600, projectileCount: 2, pierce: 4, projectileRadius: 14, projectileSpeed: 520, range: 420 },
        { damage: 48, cooldown: 1600, projectileCount: 2, pierce: 10, projectileRadius: 14, projectileSpeed: 520, range: 420 },
      ],
      upgradeText: ["", "+35% damage", "+1 boomerang", "+40% size", "+25% speed", "+40% damage & +6 pierce"],
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
        { damage: 50, cooldown: 2600, radius: 205, knockback: 280 },
        { damage: 50, cooldown: 1900, radius: 205, knockback: 280 },
        { damage: 70, cooldown: 1900, radius: 265, knockback: 320 },
      ],
      upgradeText: ["", "+35% radius", "+40% damage", "Knockback", "-25% cooldown", "+30% radius & damage"],
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
      effects: ["+20%", "+40%", "+60%", "+80%", "+100%"],
    },
  },

  bosses: {
    mid: {
      name: "Ruins Warden", radius: 46, hp: 1800, speed: 75, damage: 22, xp: 300, color: "#ff4d8d",
      attacks: { burst: true, charge: true, summon: true },
    },
    final: {
      name: "Void Tyrant", radius: 58, hp: 3600, speed: 90, damage: 28, xp: 900, color: "#b04dff",
      attacks: { burst: true, charge: true, summon: true },
    },
  },
};

function xpForLevel(level) {
  return Math.floor(CONFIG.xp.base * Math.pow(CONFIG.xp.growth, level - 1));
}
