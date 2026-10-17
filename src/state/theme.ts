import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export type Theme = "system" | "light" | "dark";
const KEY = "cvwala:theme";
const media = matchMedia("(prefers-color-scheme: dark)");
const subs = new Set<() => void>();

let theme: Theme = (() => {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    /* storage blocked */
  }
  return "system";
})();

export const resolved = (): "light" | "dark" => (theme === "system" ? (media.matches ? "dark" : "light") : theme);

/** Writes the theme onto <html>; every colour token in app.css keys off data-theme. */
function apply() {
  const r = resolved();
  const root = document.documentElement;
  root.dataset.theme = r;
  root.style.colorScheme = r;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", r === "dark" ? "#070a12" : "#f2f3f7");
  if (Capacitor.isNativePlatform()) StatusBar.setStyle({ style: r === "dark" ? Style.Dark : Style.Light }).catch(() => {});
  subs.forEach((s) => s());
}

media.addEventListener("change", () => theme === "system" && apply());
apply();

/**
 * Switches theme. Where the View Transitions API exists, the new theme grows
 * out of the tapped button as a circle; elsewhere it switches instantly.
 */
export function setTheme(next: Theme, origin?: { x: number; y: number }) {
  if (next === theme) return;
  const before = resolved();
  theme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* not persisted, still applies */
  }
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!doc.startViewTransition || reduce || resolved() === before) return apply();
  const x = origin?.x ?? innerWidth / 2;
  const y = origin?.y ?? 0;
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  doc.startViewTransition(apply).ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 520, easing: "cubic-bezier(0.22, 0.8, 0.24, 1)", pseudoElement: "::view-transition-new(root)" },
    );
  });
}

const subscribe = (s: () => void) => {
  subs.add(s);
  return () => subs.delete(s);
};
export const useTheme = () => useSyncExternalStore(subscribe, () => theme);
export const useResolvedTheme = () => useSyncExternalStore(subscribe, resolved);
