// ═══════════════════════════════════════════════════════
//  NOVA STRIKE — SERVER
//  Express + Socket.io: room codes, single-pilot lobby,
//  tilt-input relay, spectator broadcast
// ═══════════════════════════════════════════════════════
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// ── ROOM STATE ──
// rooms[code] = {
//   hostSocketId,
//   player: socketId|null,   // the single pilot controller
//   ready: false,
//   started: false,
//   spectatorCount: 0,
//   lastLobby, lastState
// }
const rooms = {};

function genCode() {
  let code;
  do {
    code = String(Math.floor(100000 + Math.random() * 900000));
  } while (rooms[code]);
  return code;
}

function roomPresence(room) {
  return { A: !!room.player };
}

function broadcastLobby(code) {
  const room = rooms[code];
  if (!room) return;
  const presence = roomPresence(room);
  const data = { A: presence.A, readyA: room.ready };
  room.lastLobby = data;
  if (room.hostSocketId) io.to(room.hostSocketId).emit('game_event', { event: 'lobby_ready_update', data });
  if (room.player) io.to(room.player).emit('game_event', { event: 'lobby_ready_update', data });
  io.to(spectatorRoom(code)).emit('lobby_update', data);
}

function spectatorRoom(code) {
  return code + ':watch';
}

io.on('connection', (socket) => {

  // ── HOST: create a new game ──
  socket.on('create_game', () => {
    const code = genCode();
    rooms[code] = {
      hostSocketId: socket.id,
      player: null,
      ready: false,
      started: false,
      spectatorCount: 0,
      lastLobby: null,
      lastState: null
    };
    socket.data.hostCode = code;
    socket.emit('game_created', { code });
  });

  // ── CONTROLLER: join a game by code ──
  socket.on('join_game', ({ code }) => {
    const room = rooms[code];
    if (!room) {
      socket.emit('join_error', 'room not found');
      return;
    }
    if (room.started) {
      socket.emit('join_error', 'game already started');
      return;
    }
    if (room.player) {
      socket.emit('join_error', 'room full');
      return;
    }

    room.player = socket.id;
    socket.data.code = code;
    socket.data.slot = 'A';
    socket.join(code);

    socket.emit('joined', { slot: 'A', code });

    io.to(code).emit('player_joined', { slot: 'A', players: roomPresence(room) });
    if (room.hostSocketId) io.to(room.hostSocketId).emit('player_joined', { slot: 'A', players: roomPresence(room) });
    broadcastLobby(code);
  });

  // ── CONTROLLER: rejoin after reconnect ──
  socket.on('rejoin_game', ({ code, slot }) => {
    const room = rooms[code];
    if (!room) return;
    room.player = socket.id;
    socket.data.code = code;
    socket.data.slot = 'A';
    socket.join(code);
    socket.emit('joined', { slot: 'A', code });
    broadcastLobby(code);
    if (room.started) {
      socket.emit('game_start');
    }
  });

  // ── CONTROLLER: ready up (starts the game immediately — single player) ──
  socket.on('player_ready', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    if (!room.player) return;
    room.ready = true;
    broadcastLobby(code);

    if (!room.started) {
      room.started = true;
      io.to(code).emit('game_start');
      if (room.hostSocketId) io.to(room.hostSocketId).emit('game_start');
    }
  });

  // ── CONTROLLER: tilt input stream — {fwd, strafe} each in [-1,1] ──
  socket.on('ctrl_input', ({ code, fwd, strafe }) => {
    const room = rooms[code];
    if (!room || !room.hostSocketId) return;
    io.to(room.hostSocketId).emit('ctrl_input', { fwd, strafe });
  });

  // ── HOST: request a soft restart is purely local; no server role needed ──

  // ── WATCHER: join as a read-only spectator (no controls) ──
  socket.on('spectate_join', ({ code }) => {
    const room = rooms[code];
    if (!room) {
      socket.emit('spectate_error', 'room not found');
      return;
    }
    socket.data.watchCode = code;
    socket.join(spectatorRoom(code));
    room.spectatorCount++;
    socket.emit('spectate_ok', { code });
    if (room.lastLobby) socket.emit('lobby_update', room.lastLobby);
    if (room.lastState) socket.emit('host_state', room.lastState);
    if (room.hostSocketId) io.to(room.hostSocketId).emit('spectator_count', { count: room.spectatorCount });
  });

  // ── HOST: live gameplay snapshot, broadcast at a throttled rate ──
  socket.on('host_state', (payload) => {
    const code = socket.data.hostCode;
    const room = rooms[code];
    if (!room) return;
    room.lastState = payload;
    io.to(spectatorRoom(code)).emit('host_state', payload);
  });

  // ── Latency diagnostic ──
  socket.on('ping_check', (cb) => {
    if (typeof cb === 'function') cb();
  });

  // ── DISCONNECT ──
  socket.on('disconnect', () => {
    const code = socket.data.code;
    const hostCode = socket.data.hostCode;

    if (hostCode && rooms[hostCode]) {
      const room = rooms[hostCode];
      if (room.player) io.to(room.player).emit('host_disconnected');
      io.to(spectatorRoom(hostCode)).emit('host_disconnected');
      delete rooms[hostCode];
    }

    const watchCode = socket.data.watchCode;
    if (watchCode && rooms[watchCode]) {
      rooms[watchCode].spectatorCount = Math.max(0, rooms[watchCode].spectatorCount - 1);
      const hostId = rooms[watchCode].hostSocketId;
      if (hostId) io.to(hostId).emit('spectator_count', { count: rooms[watchCode].spectatorCount });
    }

    if (code && rooms[code]) {
      const room = rooms[code];
      if (room.player === socket.id) {
        room.player = null;
        room.ready = false;
        if (room.hostSocketId) io.to(room.hostSocketId).emit('player_left', { slot: 'A' });
        io.to(code).emit('player_left', { slot: 'A' });
        broadcastLobby(code);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`NOVA STRIKE server running on http://localhost:${PORT}`);
  console.log(`Host display: http://localhost:${PORT}/`);
  console.log(`Controller (phone): http://localhost:${PORT}/controller.html`);
});
