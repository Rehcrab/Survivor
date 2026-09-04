class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  snapTo(x, y) {
    this.x = x;
    this.y = y;
  }

  follow(x, y, dt) {
    const k = 1 - Math.pow(0.0006, dt);
    this.x = lerp(this.x, x, k);
    this.y = lerp(this.y, y, k);
  }

  addShake(amount) {
    this.shake = clamp(this.shake + amount, 0, 18);
  }

  update(dt) {
    this.shakeX = rand(-1, 1) * this.shake;
    this.shakeY = rand(-1, 1) * this.shake;
    this.shake = Math.max(0, this.shake - dt * 30);
  }

  getOffsetX() {
    return this.shakeX;
  }

  getOffsetY() {
    return this.shakeY;
  }
}
