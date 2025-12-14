import makeWASocket, { useMultiFileAuthState, delay } from '@adiwajshing/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

let sock = null;
const sessionFolder = path.join(process.cwd(), 'session');
const chatsFolder = path.join(process.cwd(), 'chats');
if (!fs.existsSync(chatsFolder)) fs.mkdirSync(chatsFolder);
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// utility to save chat messages per number
export function saveIncoming(number, messageObj) {
  const file = path.join(chatsFolder, number + '.json');
  let history = [];
  if (fs.existsSync(file)) history = JSON.parse(fs.readFileSync(file));
  history.push(messageObj);
  fs.writeFileSync(file, JSON.stringify(history, null, 2));
}

// save outgoing in same folder
export function saveOutgoingLog(number, text) {
  saveIncoming(number, { from: number, sender: 'me', message: text, time: new Date().toISOString() });
}

async function connect() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      // keepAliveIntervalMs: 20000
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) qrcode.generate(qr, { small: true });
      console.log('connection.update', connection);
      if (connection === 'open') {
        console.log('WA Connected');
      }
      if (connection === 'close') {
        console.log('Connection closed, retrying in 5s...', update);
        setTimeout(connect, 5000);
      }
    });

    // messages.upsert handles new incoming messages and also history sync when reconnecting
    sock.ev.on('messages.upsert', async (m) => {
      try {
        const messages = m.messages || [];
        for (const msg of messages) {
          if (!msg.message) continue;
          const jid = msg.key.remoteJid;
          const number = jid?.replace('@s.whatsapp.net','') || 'unknown';
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || null;
          if (!text) continue;
          const obj = { from: number, sender: msg.key.fromMe ? 'me' : 'them', message: text, time: new Date().toISOString() };
          saveIncoming(number, obj);
          console.log('Saved incoming', number, obj.message.slice(0,80));
        }
      } catch (e) {
        console.error('messages.upsert handler error', e);
      }
    });

    // optional: message status updates
    sock.ev.on('messages.update', (updates) => {
      // you can handle delivery/read receipts here if needed
    });

    return sock;
  } catch (e) {
    console.error('connect error', e);
    setTimeout(connect, 5000);
  }
}

export async function initWaBot() {
  if (sock) return sock;
  await connect();
  return sock;
}

export function getSock() {
  return sock;
}
