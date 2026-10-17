import type { Icon } from "@phosphor-icons/react";
import { HouseIcon, NotePencilIcon, SwatchesIcon, EnvelopeSimpleIcon, BriefcaseIcon } from "@phosphor-icons/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { ToastHost } from "./components/ui";
import { Backdrop } from "./components/Backdrop";
import { go, useTab, type Tab } from "./state/nav";
import { useApp } from "./state/store";
import { haptic } from "./lib/native";
import { snappy } from "./lib/motion";
import Home from "./screens/Home";
import Edit from "./screens/Edit";
import Design from "./screens/Design";
import Letter from "./screens/Letter";
import Jobs from "./screens/Jobs";
import Welcome from "./screens/Welcome";

const TABS: { id: Tab; label: string; icon: Icon }[] = [
  { id: "home", label: "Home", icon: HouseIcon },
  { id: "edit", label: "Edit", icon: NotePencilIcon },
  { id: "design", label: "Design", icon: SwatchesIcon },
  { id: "letter", label: "Letter", icon: EnvelopeSimpleIcon },
  { id: "jobs", label: "Jobs", icon: BriefcaseIcon },
];

const SCREENS: Record<Tab, () => React.JSX.Element> = { home: Home, edit: Edit, design: Design, letter: Letter, jobs: Jobs };

export default function App() {
  const tab = useTab();
  const onboarded = useApp((s) => s.onboarded);
  const Current = SCREENS[tab];

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <Backdrop />
        <div className="shell">
          <AnimatePresence initial={false}>{onboarded ? <Current key={tab} /> : <Welcome key="welcome" />}</AnimatePresence>
        </div>
        <AnimatePresence>
          {onboarded && (
            <motion.nav className="tabbar glass" aria-label="Main" initial={{ y: 90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ...snappy, delay: 0.1 }}>
              {TABS.map((t) => {
                const on = t.id === tab;
                return (
                  <motion.button key={t.id} className={`tab ${on ? "active" : ""}`} aria-current={on ? "page" : undefined} whileTap={{ scale: 0.9 }} transition={snappy}
                    onClick={() => {
                      if (on) return;
                      haptic.select();
                      go(t.id);
                    }}>
                    {on && <motion.span className="lens" layoutId="tab-lens" transition={snappy} />}
                    <t.icon size={25} weight={on ? "fill" : "regular"} />
                    <span>{t.label}</span>
                  </motion.button>
                );
              })}
            </motion.nav>
          )}
        </AnimatePresence>
        <ToastHost />
      </div>
    </MotionConfig>
  );
}
