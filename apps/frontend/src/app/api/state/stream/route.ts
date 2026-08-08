import { sseClientsMap } from '../sseBroadcaster';

export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get('email');
  if (!email) {
    return new Response('Email required', { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  let clientCleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(new TextEncoder().encode(data));
        } catch {}
      };

      if (!sseClientsMap.has(normalizedEmail)) {
        sseClientsMap.set(normalizedEmail, new Set());
      }
      const clientSet = sseClientsMap.get(normalizedEmail)!;
      clientSet.add(send);

      // Initial connection ping
      send(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

      // Heartbeat ping every 10 seconds to maintain persistent mobile TCP socket
      const heartbeatInterval = setInterval(() => {
        send(`: heartbeat ${Date.now()}\n\n`);
      }, 10000);

      clientCleanup = () => {
        clearInterval(heartbeatInterval);
        clientSet.delete(send);
        if (clientSet.size === 0) {
          sseClientsMap.delete(normalizedEmail);
        }
      };
    },
    cancel() {
      if (clientCleanup) clientCleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
