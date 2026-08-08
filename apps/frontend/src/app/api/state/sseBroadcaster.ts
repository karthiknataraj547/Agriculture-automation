// Memory cache of active SSE client stream connections grouped by normalized user email
declare global {
  var _aether_sse_clients: Map<string, Set<(data: string) => void>> | undefined;
}

if (!global._aether_sse_clients) {
  global._aether_sse_clients = new Map();
}

export const sseClientsMap = global._aether_sse_clients!;

export function broadcastStateChange(email: string, statePayload: any) {
  const normalized = email.trim().toLowerCase();
  const clients = sseClientsMap.get(normalized);
  if (clients && clients.size > 0) {
    const payloadStr = JSON.stringify(statePayload);
    const dataStr = `data: ${payloadStr}\n\n`;
    clients.forEach((send) => {
      try {
        send(dataStr);
      } catch (err) {
        // Connection closed
      }
    });
  }
}
