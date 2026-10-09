import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tmi from 'tmi.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public')));

const CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const CHANNEL_LOGIN = (process.env.TWITCH_CHANNEL_LOGIN || 'blackadam678').toLowerCase();
const USER_TOKEN = (process.env.TWITCH_USER_ACCESS_TOKEN || '').replace(/^oauth:/, '');
let appToken = '';
let tokenExpiry = 0;
let broadcaster = null;
let chatterCounts = new Map();
let chatStatus = 'Chat-Statistik ist noch nicht verbunden.';

async function getAppToken() {
  if (appToken && Date.now() < tokenExpiry - 60000) return appToken;
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('Twitch API ist noch nicht konfiguriert. Bitte Client ID und Secret in .env setzen.');
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'client_credentials'})
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Twitch App-Token konnte nicht erstellt werden.');
  appToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  return appToken;
}

async function helix(endpoint, params = {}, useUserToken = false) {
  const token = useUserToken && USER_TOKEN ? USER_TOKEN : await getAppToken();
  const url = new URL(`https://api.twitch.tv/helix/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }
  const res = await fetch(url, {headers: {'Client-Id': CLIENT_ID, 'Authorization': `Bearer ${token}`}});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `Twitch API Fehler (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function getBroadcaster() {
  if (broadcaster) return broadcaster;
  const data = await helix('users', {login: CHANNEL_LOGIN});
  broadcaster = data.data?.[0] || null;
  if (!broadcaster) throw new Error(`Twitch-Kanal "${CHANNEL_LOGIN}" wurde nicht gefunden.`);
  return broadcaster;
}

async function safePart(fn, fallback) {
  try { return await fn(); } catch (error) {
    return { ...fallback, _error: error.message };
  }
}

app.get('/api/dashboard', async (_req, res) => {
  try {
    const user = await getBroadcaster();
    const id = user.id;
    const [streams, clips, schedule, moderators, vips] = await Promise.all([
      safePart(() => helix('streams', {user_id: id}), {data: []}),
      safePart(() => helix('clips', {broadcaster_id: id, first: '12'}), {data: []}),
      safePart(() => helix('schedule', {broadcaster_id: id, first: '20'}), {data: {segments: []}}),
      safePart(() => USER_TOKEN ? helix('moderation/moderators', {broadcaster_id: id, first: '100'}, true) : Promise.reject(new Error('Für die echte Mod-Liste ist ein autorisierter Twitch-User-Token mit moderator:read:moderators erforderlich.')), {data: []}),
      safePart(() => USER_TOKEN ? helix('channels/vips', {broadcaster_id: id, first: '100'}, true) : Promise.reject(new Error('Für die echte VIP-Liste ist ein autorisierter Twitch-User-Token mit channel:read:vips erforderlich.')), {data: []})
    ]);
    const live = streams.data?.[0] || null;
    const clipList = (clips.data || []).sort((a,b) => (b.view_count || 0) - (a.view_count || 0));
    res.json({
      channel: {login: user.login, name: user.display_name, avatar: user.profile_image_url, url: `https://www.twitch.tv/${user.login}`},
      live,
      clips: clipList,
      schedule: schedule.data?.segments || [],
      moderators: moderators.data || [],
      vips: vips.data || [],
      chatters: [...chatterCounts.entries()].map(([name,count]) => ({name,count})).sort((a,b) => b.count-a.count).slice(0,10),
      chatStatus,
      errors: {
        live: streams._error || null, clips: clips._error || null, schedule: schedule._error || null,
        moderators: moderators._error || null, vips: vips._error || null
      },
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({error: error.message, setupRequired: true});
  }
});

app.get('/api/health', (_req, res) => res.json({ok: true, channel: CHANNEL_LOGIN}));

// Optional live chat counter. Counts messages since this server started; it is not
// a historical all-time ranking. TMI credentials belong in server-side .env only.
if (process.env.TWITCH_CHAT_BOT_USERNAME && process.env.TWITCH_CHAT_OAUTH_TOKEN && process.env.TWITCH_CHAT_CHANNEL) {
  const client = new tmi.Client({
    options: { debug: false },
    connection: { reconnect: true, secure: true },
    identity: {
      username: process.env.TWITCH_CHAT_BOT_USERNAME,
      password: process.env.TWITCH_CHAT_OAUTH_TOKEN.startsWith('oauth:')
        ? process.env.TWITCH_CHAT_OAUTH_TOKEN
        : `oauth:${process.env.TWITCH_CHAT_OAUTH_TOKEN}`
    },
    channels: [process.env.TWITCH_CHAT_CHANNEL.replace(/^#/, '')]
  });
  client.connect().then(() => { chatStatus = 'Chat verbunden — zählt Nachrichten seit Serverstart.'; })
    .catch(() => { chatStatus = 'Chat-Bot-Verbindung fehlgeschlagen. Bitte Bot-Zugangsdaten prüfen.'; });
  client.on('message', (_channel, tags, message, self) => {
    if (self || !message.trim() || !tags.username) return;
    const name = tags['display-name'] || tags.username;
    chatterCounts.set(name, (chatterCounts.get(name) || 0) + 1);
  });
}

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`BLACKADAM678 Stream Hub läuft auf http://localhost:${port}`));
