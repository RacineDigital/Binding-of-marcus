// Minimal Discord Rich Presence client over Discord's local IPC socket (no dependencies).
// Shows "Playing <your Discord application's name>" plus what you're doing in the game.
// Does nothing if no client ID is set or Discord isn't running, and reconnects if Discord starts later.
const net = require('net');
const path = require('path');
const crypto = require('crypto');

const OP = { HANDSHAKE: 0, FRAME: 1, CLOSE: 2, PING: 3, PONG: 4 };

function socketPath(i) {
  if (process.platform === 'win32') return `\\\\?\\pipe\\discord-ipc-${i}`;
  const base = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
  return path.join(base, `discord-ipc-${i}`);
}

function encode(op, data) {
  const json = Buffer.from(JSON.stringify(data), 'utf8');
  const head = Buffer.alloc(8);
  head.writeInt32LE(op, 0); head.writeInt32LE(json.length, 4);
  return Buffer.concat([head, json]);
}

class DiscordPresence {
  constructor(clientId) {
    this.clientId = clientId;
    this.sock = null; this.ready = false; this.buf = Buffer.alloc(0);
    this.activity = undefined; this.sent = null; this.lastSend = 0; this.timer = null; this.retry = null;
    this.enabled = !!clientId;
  }

  start() { if (this.enabled) this.connect(0); }

  connect(i) {
    if (!this.enabled || this.sock) return;
    if (i > 9) { this.scheduleRetry(); return; }
    const s = net.createConnection(socketPath(i));
    let opened = false;
    s.once('connect', () => {
      opened = true; this.sock = s;
      s.write(encode(OP.HANDSHAKE, { v: 1, client_id: this.clientId }));
    });
    s.on('data', (d) => this.onData(d));
    s.on('error', () => { if (!opened) { s.destroy(); this.connect(i + 1); } });
    s.on('close', () => { if (opened) { this.sock = null; this.ready = false; this.sent = null; this.scheduleRetry(); } });
  }

  scheduleRetry() {
    if (this.retry || !this.enabled) return;
    this.retry = setTimeout(() => { this.retry = null; this.connect(0); }, 15000);
  }

  onData(d) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 8) {
      const op = this.buf.readInt32LE(0), len = this.buf.readInt32LE(4);
      if (this.buf.length < 8 + len) return;
      let msg = null;
      try { msg = JSON.parse(this.buf.subarray(8, 8 + len).toString('utf8')); } catch { /* ignore */ }
      this.buf = this.buf.subarray(8 + len);
      if (op === OP.PING && this.sock) this.sock.write(encode(OP.PONG, msg));
      else if (op === OP.CLOSE) { this.sock?.destroy(); }
      else if (op === OP.FRAME && msg && msg.evt === 'READY') { this.ready = true; this.flush(); }
    }
  }

  /** Queue an activity (or null to clear). Discord allows ~5 updates per 20s, so sends are spaced out. */
  set(activity) {
    this.activity = activity;
    this.flush();
  }

  flush() {
    // nothing to say until the game has reported something
    if (!this.ready || !this.sock || this.activity === undefined) return;
    const key = JSON.stringify(this.activity);
    if (key === this.sent) return;
    const wait = this.lastSend + 4500 - Date.now();
    if (wait > 0) { if (!this.timer) this.timer = setTimeout(() => { this.timer = null; this.flush(); }, wait); return; }
    this.sent = key; this.lastSend = Date.now();
    this.sock.write(encode(OP.FRAME, {
      cmd: 'SET_ACTIVITY', nonce: crypto.randomUUID(),
      args: { pid: process.pid, activity: this.activity ?? undefined },
    }));
  }

  stop() {
    this.enabled = false;
    clearTimeout(this.timer); clearTimeout(this.retry);
    if (this.sock) { try { this.sock.write(encode(OP.CLOSE, {})); } catch { /* ignore */ } this.sock.destroy(); this.sock = null; }
  }
}

module.exports = { DiscordPresence };
