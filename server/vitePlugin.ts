import type { Plugin } from 'vite';
import { createMentorService } from './mentor/handler.js';
import { readMentorConfig } from './mentor/config.js';
import { handleNodeApiRequest } from './nodeAdapter.js';

/**
 * Serves /api/* from the Vite dev and preview servers so `npm run dev` runs the
 * full app, including the mentor API, from a single command.
 */
export function mentorApiPlugin(env: Record<string, string | undefined>): Plugin {
  const service = createMentorService(readMentorConfig(env));
  const middleware = (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/')) return next();
    void handleNodeApiRequest(service, req, res);
  };
  return {
    name: 'laarish-mentor-api',
    configureServer(server) {
      server.middlewares.use(middleware);
      const label = service.provider.name === 'claude' ? `Claude (${service.provider.model})` : 'demo (no ANTHROPIC_API_KEY set)';
      server.config.logger.info(`  Mentor API: /api/mentor using ${label}`);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
