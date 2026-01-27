const express = require("express")
const fs = require("fs")
const path = require("path")
const QRCode = require("qrcode")

const {
  default: makeWASocket,
  useMultiFileAuthState,
  delay
} = require("@whiskeysockets/baileys")

const app = express()
app.use(express.json())
app.use(express.static("public"))

let activeSocket = null

app.post("/pair", async (req, res) => {
  const number = req.body.number
  if (!number) return res.json({ error: "Number required" })

  const sessionDir = "./temp/" + Date.now()
  fs.mkdirSync(sessionDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

  const sock = makeWASocket({ auth: state })
  activeSocket = sock

  sock.ev.on("creds.update", saveCreds)

  await delay(2000)
  const code = await sock.requestPairingCode(number.replace(/\D/g, ""))
  res.json({ code })

  sock.ev.on("connection.update", async ({ connection }) => {
    if (connection === "open") {
      const creds = fs.readFileSync(sessionDir + "/creds.json")
      const session = Buffer.from(creds).toString("base64")

      await sock.sendMessage(sock.user.id, {
        text: `✅ Session Generated\n\nSESSION_ID:\n${session}`
      })

      console.log("SESSION:", session)
    }
  })
})

app.get("/qr", async (req, res) => {
  const sessionDir = "./temp/" + Date.now()
  fs.mkdirSync(sessionDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const sock = makeWASocket({ auth: state })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async ({ qr, connection }) => {
    if (qr) {
      const img = await QRCode.toDataURL(qr)
      res.send(`<img src="${img}" />`)
    }

    if (connection === "open") {
      const creds = fs.readFileSync(sessionDir + "/creds.json")
      const session = Buffer.from(creds).toString("base64")

      await sock.sendMessage(sock.user.id, {
        text: `✅ Session Generated\n\nSESSION_ID:\n${session}`
      })

      console.log("SESSION:", session)
    }
  })
})

app.listen(3000, () => {
  console.log("Session Generator running on port 3000")
})
