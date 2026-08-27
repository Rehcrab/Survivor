function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function dist2(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return dx * dx + dy * dy;
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p) {
  return Math.random() < p;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function formatTime(seconds) {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + (r < 10 ? "0" : "") + r;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16
  );
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

function TAU() {
  return Math.PI * 2;
}
