import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

const SCENE_MS = 5600;
const COUNT_MS = 1500;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Live preview card for the Login / Register showcase panel.
 * Rotates through a few example results; the score counts up and the bar fills
 * each time. The dots let people jump to an example.
 */
export function AuthPreviewCard({ status, scenes }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [anim, setAnim] = useState({ index: 0, value: 0 });
  const scene = scenes[index];

  useEffect(() => {
    if (reduced || scenes.length < 2) return undefined;
    const id = setTimeout(() => setIndex((i) => (i + 1) % scenes.length), SCENE_MS);
    return () => clearTimeout(id);
  }, [index, reduced, scenes.length]);

  useEffect(() => {
    if (reduced) return undefined;
    let frame = 0;
    const start = performance.now();
    const target = scenes[index].score;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / COUNT_MS);
      setAnim({ index, value: target * (1 - Math.pow(1 - p, 3)) });
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, reduced, scenes]);

  const shown = reduced ? scene.score : anim.index === index ? anim.value : 0;

  return (
    <div className="auth-preview-card auth-preview-live">
      <div className="auth-preview-header">
        <div className="auth-preview-status">
          <span className="auth-preview-status-dot" />
          <span>{status}</span>
        </div>
        <span key={`badge-${index}`} className="auth-preview-badge auth-scene-in">{scene.badge}</span>
      </div>

      <div key={`scene-${index}`} className="auth-scene-in">
        <div className="auth-preview-paper-title">
          <FileText size={16} color="#ea580c" />
          <span>{scene.title}</span>
        </div>

        <div className="auth-preview-gap-box">
          <span className="auth-preview-gap-label">{scene.gapLabel}</span>
          {scene.gap}
        </div>
      </div>

      <div className="auth-preview-meta">
        <span>{scene.metaLabel}</span>
        <div className="auth-preview-progress-bar">
          <div className="auth-preview-progress-fill" style={{ width: `${shown}%` }} />
        </div>
        <span className="auth-score" style={{ color: "#ea580c", fontWeight: 700 }}>
          {shown.toFixed(1)}%
        </span>
      </div>

      {scenes.length > 1 && (
        <div className="auth-scene-dots" role="group" aria-label="Preview examples">
          {scenes.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className={`auth-scene-dot ${i === index ? "is-active" : ""}`}
              aria-label={`Show example ${i + 1}: ${s.title}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const CHIPS = [
  { text: "APA 7th", x: "6%", d: "21s", delay: "-4s", sway: "26px" },
  { text: "Gap detected", x: "70%", d: "26s", delay: "-15s", sway: "-30px" },
  { text: "[12] Lewis et al.", x: "34%", d: "24s", delay: "-9s", sway: "22px" },
  { text: "Source verified", x: "84%", d: "29s", delay: "-21s", sway: "-18px" },
  { text: "IEEE", x: "18%", d: "27s", delay: "-18s", sway: "-24px" },
  { text: "p. 14", x: "54%", d: "23s", delay: "-1s", sway: "20px" },
];

/** Decorative chips that drift up behind the showcase content. */
export function AuthBackdropChips() {
  return (
    <div className="auth-chips" aria-hidden="true">
      {CHIPS.map((c) => (
        <span
          key={c.text}
          className="auth-chip"
          style={{ "--x": c.x, "--d": c.d, "--delay": c.delay, "--sway": c.sway }}
        >
          {c.text}
        </span>
      ))}
    </div>
  );
}
