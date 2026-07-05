const { Server } = require('socket.io');
const config = require('../config/index');

let io = null;

/**
 * Attach Socket.io to the HTTP server and wire up join rooms.
 * Drivers join 'driver:<driverId>', customers join 'customer:<phone>'.
 */
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.cors.origin, credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('driver:join', (driverId) => {
      if (driverId) socket.join('driver:' + driverId);
    });
    socket.on('customer:join', (customerId) => {
      if (customerId) socket.join('customer:' + customerId);
    });
    socket.on('chat:join', (roomId) => {
      if (roomId) socket.join('room:' + roomId);
    });
  });

  return io;
}

/**
 * Get the initialized Socket.io instance (or a no-op stub if not yet initialized,
 * e.g. during tests where the HTTP server isn't started).
 */
function getIO() {
  if (!io) {
    return { emit: () => {}, to: () => ({ emit: () => {} }) };
  }
  return io;
}

module.exports = { initSocket, getIO };
