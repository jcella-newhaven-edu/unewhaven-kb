// Liveness: the process is up and serving requests. Used by the image HEALTHCHECK.

export function GET() {
  return new Response('ok', { headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' } });
}
