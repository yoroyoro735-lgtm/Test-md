const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const yts = require('yt-search');

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

    // PAIRING CODE
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
    sock.ev.on('connection.update', (up) => { 
        if (up.connection === 'open') console.log("✅ VINU ROMAN AI IS READY!");
        if (up.connection === 'close') startBot(); 
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
            // 1️⃣ COMMANDS (තිත සහිතව වැඩ කරන ඒවා)
            if (isCmd) {
                switch (command) {
                    case 'menu':
                        const menuText = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  ✨ *${botName}* ✨  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
                                         `👤 *User:* ${pushName}\n\n` +
                                         `*📥 DOWNLOADS*\n.song [name]\n.video [name]\n.fb [link]\n.tt [link]\n.ig [link]\n\n` +
                                         `🤖 *AI:* තිත (.) නැතිව ඕනෑම දෙයක් අසන්න.`;
                        await sock.sendMessage(from, { text: menuText }, { quoted: msg });
                        break;

                    case 'song':
                        if (!text) return sock.sendMessage(from, { text: "❌ නමක් ලබා දෙන්න." });
                        await sock.sendMessage(from, { text: "🎧 *Searching Audio...*" });
                        const s = await yts(text);
                        const resS = await axios.get(`https://api.dhammika-v2.me/api/ytmp3?url=${s.videos[0].url}`);
                        await sock.sendMessage(from, { audio: { url: resS.data.result.url }, mimetype: 'audio/mp4' }, { quoted: msg });
                        break;

                    case 'fb':
                    case 'facebook':
                        if (!text) return sock.sendMessage(from, { text: "❌ Facebook Link එකක් දෙන්න." });
                        await sock.sendMessage(from, { text: "📥 *Downloading FB Video...*" });
                        const resFb = await axios.get(`https://api.dhammika-v2.me/api/fb?url=${text}`);
                        await sock.sendMessage(from, { video: { url: resFb.data.result.hd || resFb.data.result.sd } }, { quoted: msg });
                        break;

                    case 'tt':
                    case 'tiktok':
                        if (!text) return sock.sendMessage(from, { text: "❌ TikTok Link එකක් දෙන්න." });
                        await sock.sendMessage(from, { text: "📥 *Downloading TikTok Video...*" });
                        const resTt = await axios.get(`https://api.dhammika-v2.me/api/tiktok?url=${text}`);
                        await sock.sendMessage(from, { video: { url: resTt.data.result.no_watermark } }, { quoted: msg });
                        break;
                }
            } 
            
            // 2️⃣ SMART AI (තිතක් නොමැතිව ඕනෑම දෙයකට පිළිතුරු දීම)
            else if (body.trim().length > 1 && !isCmd) {
                try {
                    // Blackbox AI API (Coding වලටත් සුපිරියි)
                    const aiRes = await axios.get(`https://itzpire.com/ai/blackbox-ai?q=${encodeURIComponent(body)}`);
                    const reply = aiRes.data.data;
                    
                    if (reply) {
                        await sock.sendMessage(from, { text: reply }, { quoted: msg });
                    }
                } catch (e) {
                    // Backup AI (පළමු එක වැඩ නැත්නම්)
                    try {
                        const backupAi = await axios.get(`https://api.simsimi.vn/v2/simsimi?text=${encodeURIComponent(body)}&lc=en`);
                        await sock.sendMessage(from, { text: backupAi.data.message }, { quoted: msg });
                    } catch (err) {
                        console.log("AI Error");
                    }
                }
            }

        } catch (e) { console.log("System Error"); }
    });
}
startBot();
