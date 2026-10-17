import { useSyncExternalStore } from "react";

export type Tab = "home" | "edit" | "design" | "letter" | "jobs";

let tab: Tab = "home";
const subs = new Set<() => void>();

export const go = (t: Tab) => {
  tab = t;
  subs.forEach((s) => s());
};

export const useTab = () =>
  useSyncExternalStore(
    (s) => {
      subs.add(s);
      return () => subs.delete(s);
    },
    () => tab,
  );
