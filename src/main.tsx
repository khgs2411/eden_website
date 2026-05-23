import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/700.css";
import "@fontsource/caveat/700.css";
import "@fontsource/assistant/400.css";
import "@fontsource/assistant/700.css";
import "./index.css";
import "./i18n";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
