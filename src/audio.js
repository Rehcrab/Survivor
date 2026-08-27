const AudioMan = {
  ctx: null,
  master: null,
  sfxGain: null,
  musicGain: null,
  soundOn: true,
  musicOn: true,
  musicTimer: null,
  musicStep: 0,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
  },

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },

  tone(freq, dur, type, vol, slideTo, dest) {
    if (!this.ctx) return;
    const d = dest || this.sfxGain;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(d);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },

  noise(dur, vol, filterFreq) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const size = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / size);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq || 1200;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  },

  play(name) {
    if (!this.soundOn) return;
    this.resume();
    if (!this.ctx) return;
    switch (name) {
      case "shoot": this.tone(880, 0.08, "square", 0.12, 440); break;
      case "fireball": this.tone(320, 0.18, "sawtooth", 0.14, 120); break;
      case "lightning": this.noise(0.22, 0.25, 3000); this.tone(120, 0.2, "sawtooth", 0.2, 40); break;
      case "nova": this.tone(200, 0.3, "sawtooth", 0.2, 60); this.noise(0.25, 0.15, 800); break;
      case "hit": this.tone(240, 0.05, "square", 0.08, 160); break;
      case "enemyDie": this.tone(160, 0.15, "sawtooth", 0.16, 50); this.noise(0.12, 0.1, 700); break;
      case "xp": this.tone(660, 0.06, "sine", 0.1, 990); break;
      case "levelup": [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, "triangle", 0.16), i * 90)); break;
      case "playerHit": this.tone(140, 0.2, "sawtooth", 0.22, 60); this.noise(0.15, 0.2, 500); break;
      case "bossSpawn": this.tone(60, 0.6, "sawtooth", 0.3, 30); break;
      case "bossDie": this.noise(0.5, 0.3, 400); this.tone(60, 0.5, "sawtooth", 0.3, 25); break;
      case "click": this.tone(500, 0.05, "square", 0.08); break;
      case "victory": [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, "triangle", 0.18), i * 110)); break;
      case "defeat": [400, 300, 220, 150].forEach((f, i) => setTimeout(() => this.tone(f, 0.24, "sawtooth", 0.16), i * 130)); break;
    }
  },

  startMusic() {
    if (!this.musicOn || this.musicTimer) return;
    this.resume();
    if (!this.ctx) return;
    const bass = [110, 110, 130.8, 98, 87.3, 98, 130.8, 146.8];
    this.musicTimer = setInterval(() => {
      if (!this.musicOn) return;
      const n = bass[this.musicStep % bass.length];
      this.tone(n, 0.9, "triangle", 0.5, n, this.musicGain);
      if (this.musicStep % 2 === 0) this.tone(n * 2, 0.9, "sine", 0.25, n * 2, this.musicGain);
      this.musicStep++;
    }, 480);
  },

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
    this.musicStep = 0;
  },

  setSound(on) {
    this.soundOn = on;
  },

  setMusic(on) {
    this.musicOn = on;
    if (!on) this.stopMusic();
    else if (this.ctx) this.startMusic();
  },
};
