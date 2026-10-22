import { clientIpFrom, getMentorService } from '../server/mentor/handler.js';

/**
 * Vercel serverless function for /api/mentor (Web-standard Request/Response handlers).
 * Set ANTHROPIC_API_KEY in the Vercel project settings to enable Claude; without it
 * the endpoint answers with the clearly labelled demo mentor.
 */
const service = getMentorService(process.env);

function handle(request: Request): Promise<Response> {
  return service.handle(request, clientIpFrom(request, 'unknown', true));
}

export function GET(request: Request): Promise<Response> {
  return handle(request);
}

export function POST(request: Request): Promise<Response> {
  return handle(request);
}
