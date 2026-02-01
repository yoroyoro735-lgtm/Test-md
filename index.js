const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');
const axios = require('axios'); // AI API එකට සම්බන්ධ වීමට

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
        if (connection === 'open') {
            console.log("✅ VINU ROMAN AI Connected!");
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
        const isCmd = body.startsWith(prefix);
        const command = isCmd ? body.slice(prefix.length).trim().split(/\s+/).shift().toLowerCase() : "";
        const text = isCmd ? body.slice(prefix.length + command.length).trim() : body.trim();

        try {
            // 1. COMMANDS (තිත සහිතව වැඩ කරන ඒවා)
            if (isCmd) {
                if (command === 'menu') {
                    return await sock.sendMessage(from, { text: `✨ *${botName} Menu*\n\n.song [name]\n.alive\n\nඔබට ඕනෑම දෙයක් මෙතැන Type කර අසන්න (AI).` });
                }
                if (command === 'alive') {
                    return await sock.sendMessage(from, { text: "I am Alive and Ready to Chat! 🤖" });
                }
            } 
            
            // 2. AI CHAT LOGIC (තිතක් නොමැතිව ඕනෑම දෙයකට පිළිතුරු දීම)
            else if (body && !isCmd) {
                // සරල AI API එකක් භාවිතා කිරීම (GPT-3/4 වැනි)
                try {
                    const response = await axios.get(`https://api.simsimi.vn/v2/simsimi?text=${encodeURIComponent(body)}&lc=en`);
                    const aiReply = response.data.message || "I'm not sure how to answer that.";
                    await sock.sendMessage(from, { text: `🤖 *AI:* ${aiReply}` }, { quoted: msg });
                } catch (err) {
                    // API එක වැඩ නොකරන්නේ නම් වෙනත් ChatGPT API එකක් භාවිතා කළ හැක
                    await sock.sendMessage(from, { text: "⚠️ AI එකට සම්බන්ධ වීමට නොහැකි විය." });
                }
            }

        } catch (e) {
            console.log(e);
        }
    });
}
startBot();
