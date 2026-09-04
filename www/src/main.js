const Settings = {
  sound: true,
  music: true,
  shake: true,
  bestTime: 0,
  gold: 0,
  unlockedWeapons: ["magic_bolt"],
  startingWeapon: "magic_bolt",
  accountUpgrades: {},
  weaponUpgrades: {},
  stats: {},
  achievements: {},
  profile: { name: "Player", badges: { equipped: [] } },

  load() {
    try {
      const s = JSON.parse(localStorage.getItem("neon_survivor_settings") || "{}");
      this.sound = s.sound !== false;
      this.music = s.music !== false;
      this.shake = s.shake !== false;
      this.bestTime = s.bestTime || 0;
      this.gold = s.gold || 0;
      this.unlockedWeapons = Array.isArray(s.unlockedWeapons) ? s.unlockedWeapons : ["magic_bolt"];
      this.startingWeapon = s.startingWeapon || "magic_bolt";
      this.accountUpgrades = s.accountUpgrades || {};
      this.weaponUpgrades = s.weaponUpgrades || {};
      this.stats = (s.stats && typeof s.stats === "object") ? s.stats : {};
      this.achievements = (s.achievements && typeof s.achievements === "object") ? s.achievements : {};
      const p = (s.profile && typeof s.profile === "object") ? s.profile : {};
      this.profile = {
        name: (typeof p.name === "string" && p.name.trim()) ? p.name.trim().slice(0, 20) : "Player",
        badges: { equipped: Array.isArray(p.badges && p.badges.equipped) ? p.badges.equipped : [] },
      };
    } catch (e) { /* ignore */ }
  },

  save() {
    try {
      localStorage.setItem("neon_survivor_settings", JSON.stringify({
        sound: this.sound,
        music: this.music,
        shake: this.shake,
        bestTime: this.bestTime,
        gold: this.gold,
        unlockedWeapons: this.unlockedWeapons,
        startingWeapon: this.startingWeapon,
        accountUpgrades: this.accountUpgrades,
        weaponUpgrades: this.weaponUpgrades,
        stats: this.stats,
        achievements: this.achievements,
        profile: this.profile,
      }));
    } catch (e) { /* ignore */ }
  },

  accountRank(id) {
    return this.accountUpgrades[id] || 0;
  },

  weaponRank(wid) {
    return this.weaponUpgrades[wid] || 0;
  },
};

const canvas = document.getElementById("canvas");
const game = new Game(canvas);
window.game = game;

UI.cache();
Settings.load();
Achievements.init();
AudioMan.setSound(Settings.sound);
AudioMan.setMusic(Settings.music);
UI.bind(game);
Input.init(canvas, { joystick: UI.el.joystick, joystickKnob: UI.el["joystick-knob"] });

game.resize();
window.addEventListener("resize", () => game.resize());
window.addEventListener("orientationchange", () => setTimeout(() => game.resize(), 200));

UI.show("menu");
UI.updateBestScore();
UI.updateGold();

let last = performance.now();
function loop(ts) {
  let dt = (ts - last) / 1000;
  last = ts;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;
  game.update(dt);
  game.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
