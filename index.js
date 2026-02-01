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
const ytdl = require('ytdl-core');

const ownerNumber = "94762498519@s.whatsapp.net"; 
const pairingNumber = "94762498519"; 
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
            console.log("✅ VINU ROMAN Connected!");
            sock.sendMessage(ownerNumber, { text: "System Online! 🚀\nStable Song Downloader Active." });
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
            if (command === 'menu' || command === 'help') {
                const menuText = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n┃  ✨ *${botName}* ✨  ┃\n┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n👤 *Hi ${pushName}*\n\n*📥 DOWNLOADS*\n.song [name]\n.video [link]\n\n*📊 INFO*\n.alive\n.runtime\n\n> *POWERED BY VINU ROMAN*`;
                await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            }

            if (command === 'alive') {
                await sock.sendMessage(from, { text: `👋 *Hi ${pushName}*\n\nVINU ROMAN is Alive & Stable! ✅` }, { quoted: msg });
            }

            if (command === 'song') {
                if (!text) return sock.sendMessage(from, { text: "❌ කරුණාකර සිංදුවේ නම ඇතුළත් කරන්න." });
                await sock.sendMessage(from, { text: "🎧 *Searching and Downloading...*" });
                
                const search = await yts(text);
                const video = search.videos[0];
                if (!video) return sock.sendMessage(from, { text: "❌ සොයාගත නොහැකි විය." });

                const filePath = `./${Date.now()}.mp3`;
                const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' });
                
                stream.pipe(fs.createWriteStream(filePath)).on('finish', async () => {
                    await sock.sendMessage(from, { 
                        audio: fs.readFileSync(filePath), 
                        mimetype: 'audio/mp4',
                        fileName: `${video.title}.mp3`
                    }, { quoted: msg });
                    fs.unlinkSync(filePath);
                }).on('error', (err) => {
                    sock.sendMessage(from, { text: "❌ Download Error: YouTube Link Issue." });
                });
            }
        } catch (e) {
            console.log("Error logic: ", e);
        }
    });
}
startBot();
