// server-troll.js
import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

let users = new Map();
let chatEnabled = false;
let activeEffects = {
  matrix: false,
  invert: false,
  glitch: false,
  rotate: false,
  freeze: false
};

const getUserList = () => {
  return Array.from(users.values()).map(user => ({
    id: user.id,
    name: user.name,
    page: user.page,
    activity: user.activity,
    device: user.device,
    poster: user.poster
  }));
};

io.on('connection', (socket) => {
  console.log(`[CONNECT] Client connected: ${socket.id}`);
  
  users.set(socket.id, {
    id: socket.id,
    name: 'Anonymous',
    page: '/',
    activity: 'Idle',
    device: 'Unknown',
    poster: null
  });

  socket.emit('chat_status', chatEnabled);
  socket.emit('admin_state_update', { chat: chatEnabled, effects: activeEffects });
  io.emit('user_list', getUserList());

  socket.on('set_identity', (name) => {
    const user = users.get(socket.id);
    if (user) {
      user.name = name || 'Anonymous';
      console.log(`[IDENTITY] ${socket.id} -> ${user.name}`);
      io.emit('user_list', getUserList());
    }
  });

  socket.on('update_activity', (data) => {
    const user = users.get(socket.id);
    if (user) {
      user.page = data.page || '/';
      user.activity = data.activity || 'Browsing';
      user.device = data.device || 'Unknown';
      user.poster = data.poster || null;
      io.emit('user_list', getUserList());
    }
  });

  socket.on('request_admin_state', () => {
    socket.emit('admin_state_update', { chat: chatEnabled, effects: activeEffects });
    socket.emit('user_list', getUserList());
  });

  socket.on('admin_toggle_chat', (enabled) => {
    chatEnabled = enabled;
    console.log(`[ADMIN] Chat ${enabled ? 'enabled' : 'disabled'}`);
    io.emit('chat_status', chatEnabled);
    io.emit('admin_state_update', { chat: chatEnabled, effects: activeEffects });
  });

  socket.on('admin_command', (data) => {
    const { target, type, payload } = data;
    console.log(`[COMMAND] ${type} -> ${target} | Payload:`, payload);

    if (['matrix', 'invert', 'glitch', 'rotate', 'freeze'].includes(type)) {
      activeEffects[type] = payload;
      io.emit('admin_state_update', { chat: chatEnabled, effects: activeEffects });
    }

    if (type === 'reset') {
      activeEffects = {
        matrix: false,
        invert: false,
        glitch: false,
        rotate: false,
        freeze: false
      };
      io.emit('admin_state_update', { chat: chatEnabled, effects: activeEffects });
    }

    if (target === 'all') {
      io.emit('execute_command', { type, payload });
    } else {
      const targetSocket = io.sockets.sockets.get(target);
      if (targetSocket) {
        targetSocket.emit('execute_command', { type, payload });
      }
    }
  });

  socket.on('send_chat', (message) => {
    const user = users.get(socket.id);
    const chatMessage = {
      from: message.from || user?.name || 'Anonymous',
      fromId: socket.id,
      text: message.text,
      isAdmin: message.isAdmin || false
    };
    
    console.log(`[CHAT] ${chatMessage.from}: ${chatMessage.text}`);
    io.emit('receive_chat', chatMessage);
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] Client disconnected: ${socket.id}`);
    users.delete(socket.id);
    io.emit('user_list', getUserList());
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    users: users.size,
    chatEnabled,
    effects: activeEffects
  });
});

const PORT = process.env.TROLL_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🎮 Troll Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default io;