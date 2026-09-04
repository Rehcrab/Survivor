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
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
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

    canvas.addEventListener("pointerdown", (e) => this.onJoystickDown(e, joy, canvas), { passive: false });
    canvas.addEventListener("pointermove", (e) => this.onJoystickMove(e, knob), { passive: false });
    canvas.addEventListener("pointerup", (e) => this.onJoystickUp(e, joy, knob));
    canvas.addEventListener("pointercancel", (e) => this.onJoystickUp(e, joy, knob));
  },

  onJoystickDown(e, joy, canvas) {
    if (e.pointerType !== "touch") return;
    if (window.game && window.game.state !== "PLAYING") return;
    const w = window.innerWidth, h = window.innerHeight;
    if (e.clientX >= w * 0.5 || e.clientY <= h * 0.45) return;
    e.preventDefault();
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    this.joystickActive = true;
    this.joystickId = e.pointerId;
    this.joyOriginX = e.clientX;
    this.joyOriginY = e.clientY;
    joy.classList.remove("hidden");
    joy.style.left = (e.clientX - 65) + "px";
    joy.style.top = (e.clientY - 65) + "px";
  },

  onJoystickMove(e, knob) {
    if (!this.joystickActive || e.pointerId !== this.joystickId) return;
    e.preventDefault();
    let dx = e.clientX - this.joyOriginX;
    let dy = e.clientY - this.joyOriginY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > this.joyRadius) {
      dx = dx / d * this.joyRadius;
      dy = dy / d * this.joyRadius;
    }
    knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
    this.joyVec.x = dx / this.joyRadius;
    this.joyVec.y = dy / this.joyRadius;
  },

  onJoystickUp(e, joy, knob) {
    if (!this.joystickActive || e.pointerId !== this.joystickId) return;
    this.joystickActive = false;
    this.joystickId = null;
    this.joyVec.x = 0;
    this.joyVec.y = 0;
    joy.classList.add("hidden");
    knob.style.transform = "translate(-50%, -50%)";
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

  zHeld() {
    return this.keys["KeyZ"];
  },
};
