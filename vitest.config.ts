import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    // Allow all hosts during local testing (Vitest/Vite expects boolean or string[])
    allowedHosts: true,
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },

  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});