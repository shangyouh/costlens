import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// 基准路径：本地可在 .env 写 VITE_BASE=/仓库名/；GitHub Actions 会注入 process.env.VITE_BASE
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = process.env.VITE_BASE ?? env.VITE_BASE ?? "/";
  return {
    plugins: [react()],
    base,
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: false,
    },
  };
});
