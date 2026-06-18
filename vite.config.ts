import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      "db1cd12a434d.ngrok-free.app"
    ],
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    visualizer({ filename: 'dist/bundle-stats.html', open: false, gzipSize: true, })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
