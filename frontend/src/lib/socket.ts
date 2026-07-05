import { io, type Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
// Socket.io attaches to the same HTTP server as the API, one level above /api/v1
const SOCKET_URL = API_URL.replace(/\/api\/v1\/?$/, '') || window.location.origin;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return socket;
}
