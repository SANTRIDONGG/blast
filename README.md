# WA Blast + Inbox (Render-ready)

This project uses Baileys (WhatsApp Web) and Express. It's adapted to the Render free-hosting model:
- The bot will reconnect on wake.
- When the service is started again after sleeping, WhatsApp will push recent messages (history sync) and `messages.upsert` handlers will save them.

## Deploy steps (Render)
1. Push this repo to GitHub.
2. Create a new **Web Service** on Render (Connect GitHub).
3. Root: the repo root.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. IMPORTANT: Add a **Persistent Disk** (Render Volumes) to keep `session/` between restarts. If you don't add a volume, session may be lost on redeploy.
7. Set environment variables if needed:
   - `DELAY_MS` (ms between blast messages, default 1200)

## Notes
- Render Free sleeps after minutes of idle; when it wakes, Baileys reconnects and WhatsApp pushes recent messages.
- For stable 24/7 bot use Railway paid plan or a VPS.

