// ═══════════════════════════════════════════════════════
//  NOVA STRIKE — SERVER
//  Express + Socket.io: room codes, solo or duel lobby,
//  tilt-input relay (slot-tagged), spectator broadcast
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
//   mode: 'solo' | 'duel',
//   players: { A: socketId|null, B: socketId|null },
//   ready: { A: false, B: false },
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

function slotsNeeded(mode) {
  return mode === 'duel' ? ['A', 'B'] : ['A'];
}

function nextOpenSlot(room) {
  for (const slot of slotsNeeded(room.mode)) {
    if (!room.players[slot]) return slot;
  }
  return null;
}

function lobbyData(room) {
  return {
    mode: room.mode,
    A: !!room.players.A,
    B: !!room.players.B,
    readyA: room.ready.A,
    readyB: room.ready.B
  };
}

function broadcastLobby(code) {
  const room = rooms[code];
  if (!room) return;
  const data = lobbyData(room);
  room.lastLobby = data;
  if (room.hostSocketId) io.to(room.hostSocketId).emit('game_event', { event: 'lobby_ready_update', data });
  if (room.players.A) io.to(room.players.A).emit('game_event', { event: 'lobby_ready_update', data });
  if (room.players.B) io.to(room.players.B).emit('game_event', { event: 'lobby_ready_update', data });
  io.to(spectatorRoom(code)).emit('lobby_update', data);
}

function spectatorRoom(code) {
  return code + ':watch';
}

function allReady(room) {
  return slotsNeeded(room.mode).every(slot => room.players[slot] && room.ready[slot]);
}

io.on('connection', (socket) => {

  // ── HOST: create a new game ──
  socket.on('create_game', (opts) => {
    const mode = (opts && opts.mode === 'duel') ? 'duel' : 'solo';
    const code = genCode();
    rooms[code] = {
      hostSocketId: socket.id,
      mode,
      players: { A: null, B: null },
      ready: { A: false, B: false },
      started: false,
      spectatorCount: 0,
      lastLobby: null,
      lastState: null
    };
    socket.data.hostCode = code;
    socket.emit('game_created', { code, mode });
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
    const slot = nextOpenSlot(room);
    if (!slot) {
      socket.emit('join_error', 'room full');
      return;
    }

    room.players[slot] = socket.id;
    socket.data.code = code;
    socket.data.slot = slot;
    socket.join(code);

    socket.emit('joined', { slot, code, mode: room.mode });

    io.to(code).emit('player_joined', { slot, players: { A: !!room.players.A, B: !!room.players.B } });
    if (room.hostSocketId) io.to(room.hostSocketId).emit('player_joined', { slot, players: { A: !!room.players.A, B: !!room.players.B } });
    broadcastLobby(code);
  });

  // ── CONTROLLER: rejoin after reconnect ──
  socket.on('rejoin_game', ({ code, slot }) => {
    const room = rooms[code];
    if (!room) return;
    const useSlot = (slot === 'A' || slot === 'B') ? slot : nextOpenSlot(room);
    if (!useSlot) return;
    room.players[useSlot] = socket.id;
    socket.data.code = code;
    socket.data.slot = useSlot;
    socket.join(code);
    socket.emit('joined', { slot: useSlot, code, mode: room.mode });
    broadcastLobby(code);
    if (room.started) {
      socket.emit('game_start', { mode: room.mode });
    }
  });

  // ── CONTROLLER: ready up ──
  socket.on('player_ready', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    const slot = socket.data.slot;
    if (!slot || !room.players[slot]) return;
    room.ready[slot] = true;
    broadcastLobby(code);

    if (!room.started && allReady(room)) {
      room.started = true;
      io.to(code).emit('game_start', { mode: room.mode });
      if (room.hostSocketId) io.to(room.hostSocketId).emit('game_start', { mode: room.mode });
    }
  });

  // ── CONTROLLER: tilt input stream — {fwd, strafe(=turn)} each in [-1,1] ──
  socket.on('ctrl_input', ({ code, fwd, strafe }) => {
    const room = rooms[code];
    if (!room || !room.hostSocketId) return;
    const slot = socket.data.slot || 'A';
    io.to(room.hostSocketId).emit('ctrl_input', { slot, fwd, strafe });
  });

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
    socket.emit('spectate_ok', { code, mode: room.mode });
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
      if (room.players.A) io.to(room.players.A).emit('host_disconnected');
      if (room.players.B) io.to(room.players.B).emit('host_disconnected');
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
      const slot = socket.data.slot;
      if (slot && room.players[slot] === socket.id) {
        room.players[slot] = null;
        room.ready[slot] = false;
        if (room.hostSocketId) io.to(room.hostSocketId).emit('player_left', { slot });
        io.to(code).emit('player_left', { slot });
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
