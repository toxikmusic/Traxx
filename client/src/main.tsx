// Import the global polyfill first to ensure it loads before any dependent libraries
import "./lib/global-polyfill";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./lib/theme-override.css";

createRoot(document.getElementById("root")!).render(<App />);
