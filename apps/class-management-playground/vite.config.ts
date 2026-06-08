import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@eden/class-management-react": path.resolve(__dirname, "../../packages/class-management-react/src/index.ts"),
		},
	},
});
