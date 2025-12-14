import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { initWaBot, getSock, saveOutgoingLog } from './wa.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: path.join(__dirname, 'uploads') });

const PORT = process.env.PORT || 3000;

await initWaBot(); // init and connect (will retry on failures)

// Simple pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/inbox', (req, res) => res.sendFile(path.join(__dirname, 'views', 'inbox.html')));
app.get('/chat/:number', (req, res) => res.sendFile(path.join(__dirname, 'views', 'chat.html')));
app.get('/messages', (req, res) => res.sendFile(path.join(__dirname, 'views', 'messages.html')));

// API: get chats for a number
app.get('/api/chat/:number', (req, res) => {
  const file = path.join(__dirname, 'chats', req.params.number + '.json');
  if (!fs.existsSync(file)) return res.json([]);
  return res.json(JSON.parse(fs.readFileSync(file)));
});

// API: send text to a number (used by chat page)
app.post('/api/chat/:number/send', async (req, res) => {
  const number = req.params.number.replace(/\D/g, '');
  const text = (req.body.message || '').trim();
  if (!text) return res.status(400).json({ error: 'Pesan kosong' });
  const sock = getSock();
  if (!sock) return res.status(500).json({ error: 'WA belum konek' });
  try {
    await sock.sendMessage(number + '@s.whatsapp.net', { text });
    saveOutgoingLog(number, text);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || e.toString() });
  }
});

// API: Blast via JSON list
app.post('/api/blast', async (req, res) => {
  const { numbers, message } = req.body;
  if (!numbers || !message) return res.status(400).json({ error: 'numbers & message required' });
  const sock = getSock();
  if (!sock) return res.status(500).json({ error: 'WA belum konek' });
  const results = [];
  for (const n of numbers) {
    const num = n.replace(/\D/g, '');
    try {
      await sock.sendMessage(num + '@s.whatsapp.net', { text: message });
      saveOutgoingLog(num, message);
      results.push({ number: num, status: 'sent' });
    } catch (e) {
      results.push({ number: num, status: 'error', error: e.message || e.toString() });
    }
    await new Promise(r => setTimeout(r, parseInt(process.env.DELAY_MS||'1200')));
  }
  res.json({ results });
});

// Upload image and send to one number
app.post('/api/send-image', upload.single('image'), async (req, res) => {
  try {
    const number = (req.body.number || '').replace(/\D/g, '');
    if (!number) return res.status(400).json({ error: 'number required' });
    const sock = getSock();
    if (!sock) return res.status(500).json({ error: 'WA belum konek' });
    const filePath = req.file.path;
    await sock.sendMessage(number + '@s.whatsapp.net', { image: { url: filePath }, caption: req.body.caption || '' });
    saveOutgoingLog(number, '[image] ' + (req.body.caption||''));
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || e.toString() });
  }
});

// API: inbox list (numbers)
app.get('/api/inbox', (req, res) => {
  if (!fs.existsSync('chats')) return res.json([]);
  const files = fs.readdirSync('chats').filter(f=>f.endsWith('.json')).map(f=>f.replace('.json',''));
  res.json(files);
});

app.listen(PORT, () => console.log('Server listening on', PORT));
