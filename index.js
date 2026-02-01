const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs-extra');

// ⚙️ SETTINGS
const ownerNumber = "94762498519@s.whatsapp.net"; 
const pairingNumber = "94762498519"; // ඔබේ අංකය
const botName = "VINU ROMAN MESSAGER";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        printQRInTerminal: false, // අපි පාවිච්චි කරන්නේ Pairing Code එක නිසා මෙය false කරන්න
        logger: pino({ level: 'silent' }),
        browser: ["Chrome (Linux)", "", ""] // ⚠️ මෙය වැදගත් (Link Device Error එක වැළැක්වීමට)
    });

    // PAIRING CODE GENERATOR
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(pairingNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n\n==== VINU ROMAN PAIRING CODE: ${code} ====\n\n`);
            } catch (error) {
                console.error("Error requesting pairing code:", error);
            }
        }, 5000); // තත්පර 5ක් පමාවී Code එක ලබා ගනී
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
            console.log("✅ VINU ROMAN Connected Successfully!");
            sock.sendMessage(ownerNumber, { text: `*VINU ROMAN MESSAGER Connected!* ✅\n\nබොට් සාර්ථකව සම්බන්ධ විය!` });
        }
        if (connection === 'close') {
            console.log("❌ Connection Closed. Restarting...");
            startBot();
        }
    });

    // මෙතනින් පහළට ඔබේ අනෙකුත් Commands (menu, song, etc.) කලින් දුන් පරිදි ඇතුළත් කරන්න...
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (body === '.alive') {
            await sock.sendMessage(from, { text: "I am Alive! 🚀" });
        }
    });
}

startBot();
