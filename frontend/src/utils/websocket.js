/**
 * Automatically builds the appropriate WebSocket connection URL
 * Handles localhost development and production (ws:// vs wss://)
 */
export const getWebSocketUrl = (conversationId, token) => {
  const envWsUrl = import.meta.env.VITE_WS_URL;
  let baseUrl = '';

  if (envWsUrl) {
    baseUrl = envWsUrl.replace(/\/$/, '');
  } else {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'localhost:8000'
      : window.location.host;
    baseUrl = `${protocol}//${host}`;
  }

  return `${baseUrl}/ws/chat/${conversationId}?token=${encodeURIComponent(token)}`;
};
