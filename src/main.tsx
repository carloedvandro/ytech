import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { EnvironmentProvider } from "./contexts/EnvironmentContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <EnvironmentProvider>
      <App />
    </EnvironmentProvider>
  </ThemeProvider>
);
