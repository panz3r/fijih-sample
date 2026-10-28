import { defineConfig } from "vite";

export default defineConfig({
  server: { proxy: { "/bookmarks": "http://localhost:3000" } },
  test: { environment: "jsdom" },
});
