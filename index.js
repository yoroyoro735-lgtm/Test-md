const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const yts = require('yt-search');
const { downloadTrack } = require("@neeraj-x0/yt-downloader"); // Stable Downloader

// ⚙️ CONFIGURATION
const ownerNumber = "94762498519@s.whatsapp.net"; 
const pairingNumber = "94762498519"; 
const botName = "VINU ROMAN MESSAGER";
let mode = "public"; 

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 15000
    });

    // PAIRING CODE
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(pairingNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n==== 🔑 YOUR PAIRING CODE: ${code} ====\n\n`);
            } catch (err) { console.error("Pairing Error: ", err); }
        }, 8000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("✅ VINU ROMAN Connected!");
            sock.sendMessage(ownerNumber, { text: "System Online! 🚀\n(No-Photo Mode Active)" });
        }
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const pushName = msg.pushName || 'User';
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const prefix = ".";

        if (!body.startsWith(prefix)) return;
        const args = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        const text = args.join(" ");

        try {
            switch (command) {
                case 'menu':
                case 'help':
                    const menu = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  ✨ *${botName}* ✨  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                                 `👤 *User:* ${pushName}\n⚙️ *Mode:* ${mode}\n\n` +
                                 `*📥 DOWNLOADS*\n.song [name]\n.video [link]\n\n` +
                                 `*📊 INFO*\n.alive\n.runtime\n.owner\n\n` +
                                 `*⚙️ ADMIN*\n.public\n.private\n\n` +
                                 `> *POWERED BY VINU ROMAN*`;
                    await sock.sendMessage(from, { text: menu }, { quoted: msg });
                    break;

                case 'alive':
                    await sock.sendMessage(from, { text: `👋 *Hi ${pushName}*\n\nI am Alive and Running! ✅\n\n🚀 *Speed:* Optimized\n📂 *Mode:* ${mode}` }, { quoted: msg });
                    break;

                case 'song':
                    if (!text) return sock.sendMessage(from, { text: "❌ සිංදුවේ නම හෝ ලින්ක් එකක් දෙන්න." });
                    await sock.sendMessage(from, { text: "🎧 *සිංදුව සොයමින් පවතියි...*" });
                    
                    const search = await yts(text);
                    const video = search.videos[0];
                    if (!video) return sock.sendMessage(from, { text: "❌ සොයාගත නොහැකි විය." });

                    const res = await downloadTrack(video.url); // Stable download logic
                    await sock.sendMessage(from, { 
                        audio: { url: res.url }, 
                        mimetype: 'audio/mp4',
                        fileName: `${video.title}.mp3`
                    }, { quoted: msg });
                    break;

                case 'owner':
                    await sock.sendMessage(from, { text: `👑 *Owner:* VINU ROMAN\n📱 *Number:* ${ownerNumber.split('@')[0]}` });
                    break;

                case 'runtime':
                    const uptime = process.uptime();
                    const hrs = Math.floor(uptime / 3600);
                    const mins = Math.floor((uptime % 3600) / 60);
                    await sock.sendMessage(from, { text: `🚀 *Runtime:* ${hrs}h ${mins}m` });
                    break;

                case 'public':
                    if (msg.key.participant !== ownerNumber && from !== ownerNumber) return;
                    mode = "public";
                    await sock.sendMessage(from, { text: "🔓 *Mode:* PUBLIC" });
                    break;

                case 'private':
                    if (msg.key.participant !== ownerNumber && from !== ownerNumber) return;
                    mode = "private";
                    await sock.sendMessage(from, { text: "🔒 *Mode:* PRIVATE" });
                    break;
            }
        } catch (e) {
            console.log(e);
            sock.sendMessage(from, { text: "❌ දෝෂයක් සිදු විය. කරුණාකර පසුව උත්සාහ කරන්න." });
        }
    });
}
startBot();
