require("dotenv").config()
const fs = require("fs")
const {
  default: makeWASocket,
  useMultiFileAuthState
} = require("@whiskeysockets/baileys")

async function start() {
  if (!process.env.SESSION_ID) {
    console.log("No SESSION_ID")
    return
  }

  fs.mkdirSync("./session", { recursive: true })

  const decoded = Buffer.from(process.env.SESSION_ID, "base64").toString()
  fs.writeFileSync("./session/creds.json", decoded)

  const { state, saveCreds } = await useMultiFileAuthState("session")

  const sock = makeWASocket({ auth: state })
  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async ({ connection }) => {
    if (connection === "open") {
      console.log("BOT CONNECTED")
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

start()
