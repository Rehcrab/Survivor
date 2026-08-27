const Settings = {
  sound: true,
  music: true,
  shake: true,
  bestTime: 0,

  load() {
    try {
      const s = JSON.parse(localStorage.getItem("neon_survivor_settings") || "{}");
      this.sound = s.sound !== false;
      this.music = s.music !== false;
      this.shake = s.shake !== false;
      this.bestTime = s.bestTime || 0;
    } catch (e) { /* ignore */ }
  },

  save() {
    try {
      localStorage.setItem("neon_survivor_settings", JSON.stringify({
        sound: this.sound,
        music: this.music,
        shake: this.shake,
        bestTime: this.bestTime,
      }));
    } catch (e) { /* ignore */ }
  },
};

const canvas = document.getElementById("canvas");
const game = new Game(canvas);
window.game = game;

UI.cache();
Settings.load();
AudioMan.setSound(Settings.sound);
AudioMan.setMusic(Settings.music);
UI.bind(game);
Input.init(canvas, { joystick: UI.el.joystick, joystickKnob: UI.el.joystickKnob });

game.resize();
window.addEventListener("resize", () => game.resize());
window.addEventListener("orientationchange", () => setTimeout(() => game.resize(), 200));

UI.show("menu");
UI.updateBestScore();

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
