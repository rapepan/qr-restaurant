const { Server } = require('socket.io');

const setupSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        process.env.CUSTOMER_URL || 'http://localhost:3000',
        process.env.ADMIN_URL    || 'http://localhost:3001',
      ],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Admin joins "admin" room
    socket.on('join_admin', () => {
      socket.join('admin');
      console.log(`👤 Admin joined: ${socket.id}`);
    });

    // Customer joins their table room
    socket.on('join_table', (tableId) => {
      socket.join(`table_${tableId}`);
      console.log(`🪑 Customer joined table_${tableId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = setupSocket;
