import { For, onMount } from "solid-js";
import { playVictory } from "../sounds.ts";

const SPARK_EMOJI = ["🎉", "🎊", "✨", "🥳", "⭐", "🌟", "💫", "🎈", "🙌", "👏"];

/** Ten small celebration emoji fanned out around the circle, each with its own reach and 0.5-1s lifetime. */
function sparks() {
  return Array.from({ length: 10 }, (_, i) => {
    const angle = ((i + Math.random() * 0.8) / 10) * 2 * Math.PI;
    const reach = 5 + Math.random() * 4;
    return {
      emoji: SPARK_EMOJI[Math.floor(Math.random() * SPARK_EMOJI.length)],
      style: { "--dx": `${Math.cos(angle) * reach}rem`, "--dy": `${Math.sin(angle) * reach}rem`, "--dur": `${500 + Math.random() * 500}ms` },
    };
  });
}

export function Tada() {
  onMount(playVictory);
  return (
    <div class="text-center" style={{ "font-size": "5rem" }}>
      <span class="position-relative d-inline-block">
        <span class="qa-tada tilt breathe" aria-hidden="true">🎉</span>
        <For each={sparks()}>{(s) => <span class="qa-tada-spark spark" style={s.style} aria-hidden="true"><span>{s.emoji}</span></span>}</For>
      </span>
    </div>
  );
}
