import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";

import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
// import "@fontsource-variable/plus-jakarta-sans";

import "./styles.css";
import App from "./App.jsx";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

createRoot(document.getElementById("root")).render(
   <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </ThemeProvider>
);
