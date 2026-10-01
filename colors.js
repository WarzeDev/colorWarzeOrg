/**
 * Discord treats a role color of 0 as "no color", so a literal #000000 is
 * nudged to the nearest real color.
 */
const NEAR_BLACK = 0x000001;

/** Random color with a random hue but readable saturation/lightness on dark and light themes. */
export function randomColor() {
  const h = Math.random() * 360;
  const s = 0.65 + Math.random() * 0.3; // 65-95%
  const l = 0.5 + Math.random() * 0.15; // 50-65%

  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };

  const [r, g, b] = [channel(0), channel(8), channel(4)].map((v) => Math.round(v * 255));
  return (r << 16) | (g << 8) | b;
}

/** Parses "#ff8800", "ff8800", "#f80" or "f80". Returns null when invalid. */
export function parseColor(input) {
  let hex = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    hex = [...hex].map((c) => c + c).join("");
  }
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;

  const value = parseInt(hex, 16);
  return value === 0 ? NEAR_BLACK : value;
}
