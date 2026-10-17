import { useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { CheckCircleIcon, CircleHalfIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { Press, Sheet } from "./ui";
import { setTheme, useTheme, type Theme } from "../state/theme";
import { snappy } from "../lib/motion";

const OPTIONS: { id: Theme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Automatic" },
];

/** A tiny drawing of the app in that theme, like the iOS Display settings. */
function Mini({ mode }: { mode: "light" | "dark" | "split" }) {
  const side = (m: "light" | "dark") => (
    <div className={`mini mini-${m}`}>
      <i className="mini-title" />
      <i className="mini-card" />
      <i className="mini-card short" />
      <i className="mini-bar" />
    </div>
  );
  if (mode !== "split") return side(mode);
  return (
    <div className="mini-split">
      {side("light")}
      {side("dark")}
    </div>
  );
}

/** Nav-bar button that opens the appearance sheet. */
export function AppearanceButton() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const I = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : CircleHalfIcon;
  return (
    <>
      <Press className="icon-btn filled" aria-label="Appearance" onClick={() => setOpen(true)}>
        <I size={19} weight="fill" />
      </Press>
      <Sheet open={open} onClose={() => setOpen(false)} title="Appearance">
        <div className="appearance">
          {OPTIONS.map((o) => {
            const on = theme === o.id;
            return (
              <Press key={o.id} className={`appearance-opt ${on ? "on" : ""}`} aria-pressed={on}
                onClick={(e: MouseEvent) => setTheme(o.id, { x: e.clientX, y: e.clientY })}>
                <Mini mode={o.id === "system" ? "split" : o.id} />
                <span className="appearance-label">{o.label}</span>
                <span className="appearance-check">
                  {on ? (
                    <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={snappy}>
                      <CheckCircleIcon size={24} weight="fill" color="var(--tint)" />
                    </motion.span>
                  ) : (
                    <span className="radio" />
                  )}
                </span>
              </Press>
            );
          })}
        </div>
        <p className="caption" style={{ textAlign: "center", marginTop: 14 }}>Automatic follows your phone or computer's setting.</p>
      </Sheet>
    </>
  );
}
