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
    sock.ev.on('connection.update', (up) => { if (up.connection === 'close') startBot(); });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const prefix = ".";
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(/\s+/).shift().toLowerCase() : "";
        const text = isCmd ? body.slice(prefix.length + command.length).trim() : body.trim();

        try {
            if (isCmd) {
                switch (command) {
                    case 'menu':
                        await sock.sendMessage(from, { text: `✨ *VINU ROMAN FIX-V4*\n\n📥 .fb [link]\n📥 .tt [link]\n🎵 .song [name]\n🎥 .video [name]\n\n🤖 AI: Type anything!` }, { quoted: msg });
                        break;

                    case 'fb':
                    case 'facebook':
                        if (!text) return sock.sendMessage(from, { text: "❌ FB Link එකක් දෙන්න." });
                        await sock.sendMessage(from, { text: "📥 *FB Video එක බාගත කරමින්...*" });
                        
                        let fbDone = false;
                        const fbApis = [
                            `https://api.dhammika-v2.me/api/fb?url=${text}`,
                            `https://api.giftedtech.my.id/api/download/facebook?url=${encodeURIComponent(text)}&apikey=gifted`,
                            `https://api.botcahlx.eu.org/api/dowloader/fbdown?url=${text}&apikey=vinu`
                        ];

                        for (let api of fbApis) {
                            try {
                                const res = await axios.get(api);
                                const url = res.data.result?.hd || res.data.result?.url || res.data.url;
                                if (url) {
                                    await sock.sendMessage(from, { video: { url: url }, caption: "✅ FB Video Downloaded" }, { quoted: msg });
                                    fbDone = true; break;
                                }
                            } catch (e) { continue; }
                        }
                        if (!fbDone) await sock.sendMessage(from, { text: "⚠️ FB සර්වර් සියල්ල කාර්යබහුලයි." });
                        break;

                    case 'tt':
                    case 'tiktok':
                        if (!text) return sock.sendMessage(from, { text: "❌ TikTok Link එකක් දෙන්න." });
                        await sock.sendMessage(from, { text: "📥 *TikTok Video එක බාගත කරමින්...*" });

                        let ttDone = false;
                        const ttApis = [
                            `https://api.dhammika-v2.me/api/tiktok?url=${text}`,
                            `https://api.giftedtech.my.id/api/download/tiktok?url=${encodeURIComponent(text)}&apikey=gifted`,
                            `https://api.botcahlx.eu.org/api/dowloader/tiktok?url=${text}&apikey=vinu`
                        ];

                        for (let api of ttApis) {
                            try {
                                const res = await axios.get(api);
                                const url = res.data.result?.no_watermark || res.data.result?.video || res.data.url;
                                if (url) {
                                    await sock.sendMessage(from, { video: { url: url }, caption: "✅ TikTok Video Downloaded" }, { quoted: msg });
                                    ttDone = true; break;
                                }
                            } catch (e) { continue; }
                        }
                        if (!ttDone) await sock.sendMessage(from, { text: "⚠️ TikTok සර්වර් සියල්ල කාර්යබහුලයි." });
                        break;

                    case 'song':
                        const s = await yts(text);
                        const resS = await axios.get(`https://api.dhammika-v2.me/api/ytmp3?url=${s.videos[0].url}`);
                        await sock.sendMessage(from, { audio: { url: resS.data.result.url }, mimetype: 'audio/mp4' }, { quoted: msg });
                        break;
                }
            } else if (body.length > 2) {
                // AI FIX: itzpire API එක වැඩ නැත්නම් Blackbox Backup පාවිච්චි කරයි
                try {
                    const aiRes = await axios.get(`https://itzpire.com/ai/blackbox-ai?q=${encodeURIComponent(body)}`);
                    await sock.sendMessage(from, { text: `🤖 ${aiRes.data.data}` }, { quoted: msg });
                } catch {
                    const aiBackup = await axios.get(`https://api.simsimi.vn/v2/simsimi?text=${encodeURIComponent(body)}&lc=en`);
                    await sock.sendMessage(from, { text: `🤖 ${aiBackup.data.message}` }, { quoted: msg });
                }
            }
        } catch (e) { console.log("Global Error"); }
    });
}
startBot();
