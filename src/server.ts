// Import dependencies
import net from "net"
import Game from "./class/Game"
import { ClientSocket } from "./class/Player"

// Post server
import postServer from "./api/postServer"

// Connection + packet handler
import parsePacket from "./net/packetHandler"
import Sanction from "./class/Sanction"

// Create socket server.
const SERVER = net.createServer(socketConnection)

function maskIP(ip): string {
    ip = ip.split(".").splice(0, 2)
    return ip.join(".") + ".x.x"
}

async function socketConnection(client: ClientSocket): Promise<void> {
    client.IPV4 = client.remoteAddress

    if (Sanction.bannedIPs.has(client.IPV4))
        return client.destroy()

    client.IP = maskIP(client.IPV4)
    client._attemptedAuthentication = false

    console.log(`<New client: ${client.IP}>`)

    client.setNoDelay(true)

    Game.emit("socketConnection", client)

    client.once("close", async () => {
        console.log(`<Client: ${client.IP}> Lost connection.`)
        if (client.player) {
            await Game._playerLeft(client.player)
                .catch(console.error)
        }
        return !client.destroyed && client.destroy()
    })

    client.on("error", () => {
        return !client.destroyed && client.destroy()
    })

    client.keepalive = {
        timer: null,

        keepAliveTime: 30000,

        kickIdlePlayer: function () {
            if (client.player && !client.destroyed)
                return client.player.kick('Lack of connectivity.')
        },

        restartTimer: function () {
            if (this.timer) clearTimeout(this.timer)
            this.timer = setTimeout(this.kickIdlePlayer, this.keepAliveTime)
        }
    }

    client.on("data", (PACKET) => {
        parsePacket(client, PACKET)
            .catch(console.error)
    })

    // If the player fails to authenticate after 15 seconds.
    setTimeout(() => { return !client.player && client.destroy() }, 15000)
}

const SERVER_LISTEN_ADDRESS = Game.ip || ((!Game.local && "0.0.0.0") || "127.0.0.1")

SERVER.listen(Game.port, SERVER_LISTEN_ADDRESS, () => {
    console.log(`Listening on port: ${Game.port}.`)

    if (Game.local) return console.log("Running server locally.")

    if (Game.serverSettings.postServer) {
        postServer().then(() => {
            console.log(`Posted to: https://www.brick-hill.com/play/${Game.gameId} successfully.`)
            setInterval(postServer, 60000)
        })
    }
})

Game.server = SERVER