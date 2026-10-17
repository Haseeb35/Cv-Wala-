import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StatusBar } from "@capacitor/status-bar";
import "./state/theme"; // applies the saved theme before the first render
import App from "./App";
import { isNative } from "./lib/native";
import "@fontsource-variable/inter";
import "./styles/app.css";

if (isNative) StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
