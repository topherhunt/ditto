const EMOJIS = ["🎉", "✨", "🌟", "⭐", "🥳", "🎊", "💫"];

/** Passes in a row across items, until a wrong answer, a reveal or a wrong meaning pick; a page reload starts over. */
let streak = 0;

/** A pass bursts one emoji per pass in the streak out from the center of the screen, fading over 250 ms; a miss resets the streak. */
export function celebrate(passed: boolean) {
  if (!passed) {
    streak = 0;
    return;
  }
  streak++;
  for (let i = 0; i < streak; i++) {
    const el = document.createElement("span");
    el.className = "qa-celebrate-emoji position-fixed top-50 start-50 pe-none fs-1";
    el.style.zIndex = "2000";
    el.textContent = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    document.body.append(el);
    const angle = ((i + Math.random() * 0.5) / streak) * 2 * Math.PI;
    const distance = 90 + Math.random() * 150;
    const to = `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(1.2)`;
    el.animate([{ transform: "translate(-50%, -50%) scale(0.4)", opacity: 1 }, { transform: to, opacity: 0 }], { duration: 250, easing: "ease-out" })
      .onfinish = () => el.remove();
  }
}
