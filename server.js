const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config: max 5MB, images only
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).substr(2, 6) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  }
});

app.use(express.static(path.join(__dirname, 'public')));

// Image upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/uploads/' + req.file.filename });
});

// In-memory state
const clients = new Map(); // ws -> { nickname, color }
const messageHistory = [];
const MAX_HISTORY = 80;

const COLORS = [
  '#e05c5c','#e07a5c','#e0a85c','#c9e05c','#5ce07a',
  '#5ce0c9','#5ca8e0','#7a5ce0','#c95ce0','#e05ca8'
];
let colorIdx = 0;

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

function getUsers() {
  return Array.from(clients.values()).map(c => ({ nickname: c.nickname, color: c.color }));
}

wss.on('connection', (ws) => {
  // Send history
  ws.send(JSON.stringify({ type: 'history', messages: messageHistory }));

  ws.on('message', (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }

    if (data.type === 'join') {
      const nickname = String(data.nickname || '').trim().slice(0, 20);
      if (!nickname) return;

      // Reject duplicate nicknames
      const taken = Array.from(clients.values()).some(c => c.nickname === nickname);
      if (taken) {
        ws.send(JSON.stringify({ type: 'error', message: '昵称已被使用，请换一个' }));
        return;
      }

      const color = COLORS[colorIdx % COLORS.length];
      colorIdx++;
      clients.set(ws, { nickname, color });

      ws.send(JSON.stringify({ type: 'joined', nickname, color }));

      const sysMsg = { type: 'system', text: `${nickname} 加入了聊天室`, time: Date.now() };
      messageHistory.push(sysMsg);
      if (messageHistory.length > MAX_HISTORY) messageHistory.shift();
      broadcast(sysMsg);
      broadcast({ type: 'users', users: getUsers() });
      return;
    }

    const client = clients.get(ws);
    if (!client) return;

    if (data.type === 'message') {
      const text = String(data.text || '').trim().slice(0, 1000);
      if (!text) return;
      const msg = {
        type: 'message',
        nickname: client.nickname,
        color: client.color,
        text,
        time: Date.now()
      };
      messageHistory.push(msg);
      if (messageHistory.length > MAX_HISTORY) messageHistory.shift();
      broadcast(msg);
    }

    if (data.type === 'image') {
      const url = String(data.url || '');
      if (!url.startsWith('/uploads/')) return;
      const msg = {
        type: 'image',
        nickname: client.nickname,
        color: client.color,
        url,
        time: Date.now()
      };
      messageHistory.push(msg);
      if (messageHistory.length > MAX_HISTORY) messageHistory.shift();
      broadcast(msg);
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      clients.delete(ws);
      const sysMsg = { type: 'system', text: `${client.nickname} 离开了聊天室`, time: Date.now() };
      messageHistory.push(sysMsg);
      if (messageHistory.length > MAX_HISTORY) messageHistory.shift();
      broadcast(sysMsg);
      broadcast({ type: 'users', users: getUsers() });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Chatroom running on port ${PORT}`);
});
