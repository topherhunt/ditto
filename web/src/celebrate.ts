const EMOJIS = ["🎉", "✨", "🌟", "⭐", "🥳", "🎊", "💫"];

/** Passes in a row across items, until a wrong answer, a reveal or a wrong meaning pick; a page reload starts over. */
let streak = 0;

const DURATION_MS = 500;
/** Keyframes sampled along each arc; the browser interpolates straight lines between them. */
const STEPS = 12;

/**
 * A pass throws one emoji per pass in the streak out from the center of `from` (default: the screen), arcing down under gravity
 * and fading over 500 ms; a miss resets the streak.
 */
export function celebrate(passed: boolean, from?: Element) {
  if (!passed) {
    streak = 0;
    return;
  }
  streak++;
  const box = from?.getBoundingClientRect();
  const left = box ? `${box.left + box.width / 2}px` : "50%";
  const top = box ? `${box.top + box.height / 2}px` : "50%";
  for (let i = 0; i < streak; i++) {
    const el = document.createElement("span");
    el.className = "qa-celebrate-emoji position-fixed pe-none fs-1";
    Object.assign(el.style, { left, top, zIndex: "2000" });
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    document.body.append(el);
    const angle = ((i + Math.random() * 0.5) / streak) * 2 * Math.PI;
    const distance = 90 + Math.random() * 150;
    const drop = 120 + Math.random() * 100;
    const frames = Array.from({ length: STEPS + 1 }, (_, s) => {
      const t = s / STEPS;
      const out = 1 - (1 - t) ** 2; // launched fast, slowing down
      const x = Math.cos(angle) * distance * out;
      const y = Math.sin(angle) * distance * out + drop * t * t;
      return { transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${0.4 + 0.8 * out})`, opacity: 1 - t * t };
    });
    el.animate(frames, { duration: DURATION_MS }).onfinish = () => el.remove();
  }
}
