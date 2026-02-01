const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    downloadContentFromMessage,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const pino = require('pino');
const fs = require('fs-extra');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const axios = require('axios');

// ⚙️ CONFIGURATION
const ownerNumber = "94762498519@s.whatsapp.net"; 
const pairingNumber = "94762498519"; 
const botName = "VINU ROMAN MESSAGER";
const aliveImage = "https://i.ibb.co/vzP4S8S/vinu-roman-bot.jpg";
const menuImage = "https://i.ibb.co/L5hY5M5/vinu-menu-img.jpg";
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
        browser: ["Ubuntu", "Chrome", "20.0.04"], // ලින්ක් වීමේ ගැටලුවට විසඳුම
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 10000
    });

    // PAIRING CODE GENERATOR
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(pairingNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n==== 🔑 YOUR PAIRING CODE: ${code} ====\n\n`);
            } catch (err) { console.error(err); }
        }, 6000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("✅ VINU ROMAN Connected!");
            sock.sendMessage(ownerNumber, { text: "System Online! 🚀" });
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
        const type = Object.keys(msg.message)[0];
        const isGroup = from.endsWith('@g.us');
        const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
        const isOwner = sender === ownerNumber;

        const body = (type === 'conversation') ? msg.message.conversation : 
                     (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? msg.message.imageMessage.caption : '';

        const prefix = ".";
        if (!body.startsWith(prefix)) return;
        const args = body.slice(prefix.length).trim().split(/\s+/);
        const command = args.shift().toLowerCase();
        const text = args.join(" ");

        if (mode === "private" && !isOwner) return;

        // --- COMMANDS ---
        switch (command) {
            case 'menu':
                const menu = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  ✨ *${botName}* ✨  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                             `*📥 DOWNLOADS*\n.song | .video | .fb | .tiktok | .film\n\n` +
                             `*🛠️ TOOLS*\n.sticker | .ai | .trt | .weather\n\n` +
                             `*⚙️ ADMIN*\n.public | .private | .kick | .hidetag\n\n` +
                             `> *POWERED BY VINU ROMAN*`;
                await sock.sendMessage(from, { image: { url: menuImage }, caption: menu }, { quoted: msg });
                break;

            case 'alive':
                await sock.sendMessage(from, { image: { url: aliveImage }, caption: `👋 *Hi ${pushName}*\n\nI am Alive & Fast! ✅\n\n*Mode:* ${mode}` }, { quoted: msg });
                break;

            case 'song':
                if (!text) return sock.sendMessage(from, { text: "නමක් දෙන්න." });
                const res = await yts(text);
                const vid = res.videos[0];
                await sock.sendMessage(from, { text: `🎧 *Downloading:* ${vid.title}` });
                const stream = ytdl(vid.url, { filter: 'audioonly' });
                stream.pipe(fs.createWriteStream('./s.mp3')).on('finish', async () => {
                    await sock.sendMessage(from, { audio: fs.readFileSync('./s.mp3'), mimetype: 'audio/mp4' }, { quoted: msg });
                    fs.unlinkSync('./s.mp3');
                });
                break;

            case 'sticker':
                const isImg = type === 'imageMessage' || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
                if (!isImg) return sock.sendMessage(from, { text: "පින්තූරයකට Reply කරන්න." });
                const qImg = isImg ? (msg.message.imageMessage || msg.message.extendedTextMessage.contextInfo.quotedMessage.imageMessage) : null;
                const bufferImg = await downloadContentFromMessage(qImg, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of bufferImg) buffer = Buffer.concat([buffer, chunk]);
                const st = new Sticker(buffer, { pack: botName, author: pushName, type: StickerTypes.FULL });
                await sock.sendMessage(from, { sticker: await st.toBuffer() });
                break;

            case 'private': if (isOwner) { mode = "private"; await sock.sendMessage(from, { text: "🔒 Private Mode On" }); } break;
            case 'public': if (isOwner) { mode = "public"; await sock.sendMessage(from, { text: "🔓 Public Mode On" }); } break;
            
            case 'kick':
                if (!isGroup || !isOwner) return;
                const target = msg.message.extendedTextMessage?.contextInfo?.participant;
                if (target) await sock.groupParticipantsUpdate(from, [target], "remove");
                break;
        }
    });
}
startBot();
