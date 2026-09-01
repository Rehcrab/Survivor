const Input = {
  keys: {},
  joystickActive: false,
  joystickId: null,
  joyOriginX: 0,
  joyOriginY: 0,
  joyVec: { x: 0, y: 0 },
  joyRadius: 48,

  init(canvas, dom) {
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
      if (e.code === "Escape") {
        if (window.game) window.game.togglePause();
      }
      if (e.code === "KeyF") {
        if (window.game && (window.game.state === "PLAYING" || window.game.state === "PAUSED")) window.game.cycleSpeed();
      }
      if (e.code === "KeyE" || e.code === "Space") {
        if (window.game && window.game.state === "PLAYING") window.game.tryInteract();
      }
      if (e.code === "Digit1" || e.code === "Numpad1") { if (window.game) window.game.selectUpgrade(0); }
      if (e.code === "Digit2" || e.code === "Numpad2") { if (window.game) window.game.selectUpgrade(1); }
      if (e.code === "Digit3" || e.code === "Numpad3") { if (window.game) window.game.selectUpgrade(2); }
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "ArrowLeft" || e.code === "ArrowRight") {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });

    const joy = dom.joystick;
    const knob = dom.joystickKnob;

    canvas.addEventListener("touchstart", (e) => this.onTouchStart(e, joy), { passive: false });
    canvas.addEventListener("touchmove", (e) => this.onTouchMove(e, joy, knob), { passive: false });
    canvas.addEventListener("touchend", (e) => this.onTouchEnd(e, joy, knob), { passive: false });
    canvas.addEventListener("touchcancel", (e) => this.onTouchEnd(e, joy, knob), { passive: false });
  },

  onTouchStart(e, joy) {
    if (window.game && window.game.state !== "PLAYING") return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (this.joystickActive) continue;
      const w = window.innerWidth, h = window.innerHeight;
      if (t.clientX < w * 0.5 && t.clientY > h * 0.45) {
        this.joystickActive = true;
        this.joystickId = t.identifier;
        this.joyOriginX = t.clientX;
        this.joyOriginY = t.clientY;
        joy.classList.remove("hidden");
        joy.style.left = (t.clientX - 65) + "px";
        joy.style.top = (t.clientY - 65) + "px";
      }
    }
  },

  onTouchMove(e, joy, knob) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (!this.joystickActive || t.identifier !== this.joystickId) continue;
      let dx = t.clientX - this.joyOriginX;
      let dy = t.clientY - this.joyOriginY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > this.joyRadius) {
        dx = dx / d * this.joyRadius;
        dy = dy / d * this.joyRadius;
      }
      knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
      this.joyVec.x = dx / this.joyRadius;
      this.joyVec.y = dy / this.joyRadius;
    }
  },

  onTouchEnd(e, joy, knob) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (this.joystickActive && t.identifier === this.joystickId) {
        this.joystickActive = false;
        this.joystickId = null;
        this.joyVec.x = 0;
        this.joyVec.y = 0;
        joy.classList.add("hidden");
        knob.style.transform = "translate(-50%, -50%)";
      }
    }
  },

  getMoveVector() {
    let x = 0, y = 0;
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) y -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) y += 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) x -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) x += 1;
    x += this.joyVec.x;
    y += this.joyVec.y;
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  },

  isTouchDevice() {
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  },

  altHeld() {
    return this.keys["AltLeft"] || this.keys["AltRight"];
  },
};
