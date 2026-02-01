const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('ytdl-core');

const ownerNumber = "94762498519@s.whatsapp.net"; 
const pairingNumber = "94762498519"; 
const botName = "VINU ROMAN AI";

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
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(pairingNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n==== 🔑 YOUR PAIRING CODE: ${code} ====\n\n`);
            } catch (err) { }
        }, 8000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') console.log("✅ VINU ROMAN AI IS READY!");
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const pushName = msg.pushName || 'User';
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        
        const prefix = ".";
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(/\s+/).shift().toLowerCase() : "";
        const text = isCmd ? body.slice(prefix.length + command.length).trim() : body.trim();

        try {
            // 1. COMMANDS (With Prefix)
            if (isCmd) {
                if (command === 'menu') {
                    return await sock.sendMessage(from, { text: `✨ *${botName} Menu*\n\n.song [name]\n.alive\n\nඕනෑම දෙයක් අසන්න, මම පිළිතුරු දෙන්නෙමි (AI).` });
                }
                if (command === 'alive') {
                    return await sock.sendMessage(from, { text: "Online! 🤖 ඔබට උදව් කරන්නේ කෙසේද?" });
                }
                if (command === 'song') {
                    if (!text) return sock.sendMessage(from, { text: "❌ නමක් දෙන්න." });
                    const search = await yts(text);
                    const video = search.videos[0];
                    if (!video) return sock.sendMessage(from, { text: "❌ ලැබුණේ නැත." });
                    
                    const filePath = `./${Date.now()}.mp3`;
                    ytdl(video.url, { filter: 'audioonly' }).pipe(fs.createWriteStream(filePath)).on('finish', async () => {
                        await sock.sendMessage(from, { audio: fs.readFileSync(filePath), mimetype: 'audio/mp4' }, { quoted: msg });
                        fs.unlinkSync(filePath);
                    });
                    return;
                }
            } 
            
            // 2. SMART AI LOGIC (No Prefix - Reply to everything)
            else if (body && !isCmd) {
                try {
                    // වඩාත් හොඳ AI API එකක් (Blackbox/Llama)
                    const aiRes = await axios.get(`https://itzpire.com/ai/blackbox-ai?q=${encodeURIComponent(body)}`);
                    const reply = aiRes.data.data || "මට සමාවෙන්න, ඒකට පිළිතුරක් දැනට මා සතුව නැහැ.";
                    
                    await sock.sendMessage(from, { text: reply }, { quoted: msg });
                } catch (err) {
                    // Backup AI (සමහර විට API එකක් වැඩ නොකරන විට)
                    await sock.sendMessage(from, { text: "🤖 තාක්ෂණික දෝෂයක්. කරුණාකර නැවත අසන්න." });
                }
            }

        } catch (e) {
            console.error(e);
        }
    });
}
startBot();
