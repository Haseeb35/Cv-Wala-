import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "pk.cvwala.app",
  appName: "CV Wala",
  webDir: "dist",
  ios: { contentInset: "never", backgroundColor: "#00000000" },
  plugins: {
    Keyboard: { resize: "native" },
  },
};

export default config;
