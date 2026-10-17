import type { Icon } from "@phosphor-icons/react";
import {
  GraduationCapIcon, StorefrontIcon, HeadsetIcon, CalculatorIcon, ChalkboardTeacherIcon, SteeringWheelIcon, CodeIcon,
  PenNibIcon, StethoscopeIcon, FoldersIcon, WrenchIcon, CookingPotIcon, MegaphoneIcon, BriefcaseIcon,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { ROLES, roleById } from "../data/roles";
import { store, useCV } from "../state/store";
import { Press } from "./ui";
import { snappy } from "../lib/motion";

export const ROLE_ICON: Record<string, { icon: Icon; color: string }> = {
  fresh: { icon: GraduationCapIcon, color: "#5856D6" },
  sales: { icon: StorefrontIcon, color: "#FF9500" },
  csr: { icon: HeadsetIcon, color: "#30B0C7" },
  accounts: { icon: CalculatorIcon, color: "#34C759" },
  teacher: { icon: ChalkboardTeacherIcon, color: "#AF52DE" },
  driver: { icon: SteeringWheelIcon, color: "#8E8E93" },
  developer: { icon: CodeIcon, color: "#007AFF" },
  design: { icon: PenNibIcon, color: "#FF2D55" },
  health: { icon: StethoscopeIcon, color: "#FF3B30" },
  admin: { icon: FoldersIcon, color: "#5AC8FA" },
  technician: { icon: WrenchIcon, color: "#A2845E" },
  chef: { icon: CookingPotIcon, color: "#FF6B22" },
  marketing: { icon: MegaphoneIcon, color: "#E0447F" },
  other: { icon: BriefcaseIcon, color: "#636366" },
};

export function RoleGlyph({ id, size = 20 }: { id: string; size?: number }) {
  const { icon: I, color } = ROLE_ICON[id] ?? ROLE_ICON.other;
  return (
    <span className="glyph" style={{ background: color }}>
      <I size={size} weight="fill" />
    </span>
  );
}

/** Choosing a field tunes suggestions: skills, example points and summary wording. */
export function RolePicker({ onPick }: { onPick?: () => void }) {
  const roleId = useCV().roleId;
  const pick = (id: string) => {
    store.cv((cv) => {
      const prev = roleById(cv.roleId);
      // Only replace the headline if the user hasn't typed their own.
      const headline = !cv.headline || cv.headline === prev.headline ? roleById(id).headline : cv.headline;
      return { roleId: id, headline };
    });
    setTimeout(() => onPick?.(), 160);
  };
  return (
    <div className="roles">
      {ROLES.map((r, i) => (
        <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...snappy, delay: i * 0.018 }}>
          <Press className={`role ${r.id === roleId ? "on" : ""}`} style={{ width: "100%", height: "100%" }} onClick={() => pick(r.id)}>
            <RoleGlyph id={r.id} />
            <b>{r.label}</b>
          </Press>
        </motion.div>
      ))}
    </div>
  );
}
