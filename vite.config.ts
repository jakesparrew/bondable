import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from 'rollup-plugin-visualizer'

/**
 * Serve `/api/*` during `vite dev`.
 *
 * Vite is a static dev server and knows nothing about Vercel functions, so
 * without this the Bond chat would only work once deployed — the worst place to
 * discover a bug. The middleware loads the SAME handler module the Vercel entry
 * point uses (`src/server/coach/handler.ts`) through Vite's SSR pipeline, so
 * local and production behaviour cannot drift, and edits hot-reload.
 *
 * Server-side env vars (no `VITE_` prefix, therefore never bundled into the
 * client) are read from `.env.local` here and put on `process.env`, which is
 * where the handler expects them — matching how Vercel injects them in prod.
 */
function apiDevServer(mode: string): Plugin {
  return {
    name: 'bondable-api-dev',
    apply: 'serve',
    configureServer(server) {
      // '' prefix = load every var, not just VITE_*.
      const env = loadEnv(mode, process.cwd(), '');
      for (const [key, value] of Object.entries(env)) {
        if (!(key in process.env)) process.env[key] = value;
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/coach')) return next();

        try {
          const { handleCoach } = await server.ssrLoadModule(
            '/src/server/coach/handler.ts',
          );

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);

          const request = new Request(`http://localhost${url}`, {
            method: req.method,
            headers: req.headers as HeadersInit,
            body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
          });

          const response: Response = await handleCoach(request);

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));

          if (!response.body) {
            res.end();
            return;
          }

          // Stream through rather than buffering: the whole point of Bond is
          // that words appear as they are generated.
          const reader = response.body.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
          res.end();
        } catch (error) {
          server.config.logger.error(`[api/coach] ${error}`);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json; charset=utf-8');
          }
          res.end(JSON.stringify({ error: 'dev_handler_failed' }));
        }
      });
    },
  };
}

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
    apiDevServer(mode),
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
