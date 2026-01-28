const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  delay
} = require("@whiskeysockets/baileys")

const Pino = require("pino")
const fs = require("fs")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    auth: state,
    version,
    logger: Pino({ level: "silent" }),
    browser: ["X-Asena", "Chrome", "120.0"]
  })

  sock.ev.on("creds.update", saveCreds)

  // If not logged in, generate pairing code
  if (!sock.authState.creds.registered) {
    await delay(3000)

    const phoneNumber = "91XXXXXXXXXX" // <-- CHANGE THIS

    const code = await sock.requestPairingCode(phoneNumber)
    console.log("PAIRING CODE:", code)
    console.log("Enter this in WhatsApp → Linked Devices → Link with code")
  }

  sock.ev.on("connection.update", async ({ connection }) => {
    if (connection === "open") {
      console.log("✅ BOT CONNECTED")
      await sock.sendMessage(sock.user.id, { text: "✅ BOT CONNECTED" })
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    if (text === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, { text: "PONG" })
    }
  })
}

startBot()
