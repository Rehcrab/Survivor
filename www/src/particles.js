const Particles = {
  list: [],

  reset() {
    this.list.length = 0;
  },

  spawn(x, y, opts) {
    this.list.push({
      x, y,
      vx: opts.vx || 0,
      vy: opts.vy || 0,
      life: opts.life || 0.5,
      maxLife: opts.life || 0.5,
      size: opts.size || 4,
      color: opts.color || "#ffffff",
      type: opts.type || "spark",
      gravity: opts.gravity || 0,
      drag: opts.drag == null ? 0.9 : opts.drag,
      text: opts.text || null,
    });
    if (this.list.length > 1500) this.list.splice(0, this.list.length - 1500);
    if (perfLow()) {
      const cap = perfUltra() ? 400 : 800;
      if (this.list.length > cap) this.list.splice(0, this.list.length - cap);
    }
  },

  burst(x, y, color, count, speed, size) {
    if (perfUltra()) count = Math.ceil(count * 0.25);
    else if (perfLow()) count = Math.ceil(count * 0.5);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.4, speed);
      this.spawn(x, y, {
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: rand(0.25, 0.6),
        size: rand(size * 0.5, size * 1.4),
        color: color,
        type: "spark",
        drag: 0.9,
      });
    }
  },

  ring(x, y, color, maxRadius, life, width) {
    if (perfUltra()) return;
    this.spawn(x, y, {
      life: life,
      size: maxRadius,
      color: color,
      type: "ring",
      width: width || 4,
    });
  },

  text(x, y, str, color, size) {
    if (perfUltra()) return;
    if (perfLow() && Math.random() < 0.5) return;
    this.spawn(x, y, {
      vy: -60,
      life: 0.8,
      size: size || 15,
      color: color,
      type: "text",
      text: str,
      drag: 0.95,
    });
  },

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life -= dt;
      if (p.life <= 0) {
        l[i] = l[l.length - 1];
        l.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
    }
  },

  draw(ctx) {
    const l = this.list;
    for (let i = 0; i < l.length; i++) {
      const p = l[i];
      const t = p.life / p.maxLife;
      if (p.type === "spark") {
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "ring") {
        const r = (1 - t) * p.size;
        ctx.globalAlpha = t * 0.9;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width * t + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === "text") {
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.font = "bold " + p.size + "px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.text, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
  },
};
