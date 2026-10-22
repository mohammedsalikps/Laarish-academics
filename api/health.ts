/** Vercel function for /api/health. */
export function GET(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
