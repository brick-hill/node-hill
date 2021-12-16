import { Player } from ".."

export class Sanction {
    bannedIPs: Set<string>
    allowedIPs: Set<string>

    constructor() {
        this.allowedIPs = new Set("127.0.0.1")
        this.bannedIPs = new Set()
    }

    banPlayer(player: Player) {
        if (this.bannedIPs.has(player.socket.IPV4)) throw "Player is already banned!"
        this.bannedIPs.add(player.socket.IPV4)
        player.kick("You have been banned from the server.")
    }

    banSocket(socket, expirationTime = 1000 * 60 * 60): boolean {
        // Player is already sanctioned.
        if (this.bannedIPs.has(socket.IPV4) || this.allowedIPs.has(socket.IVP4))
            return false

        this.bannedIPs.add(socket.IPV4)

        socket.destroy()

        setTimeout(() => {
            this.bannedIPs.delete(socket.IPV4)
        }, expirationTime)

        console.warn(`${socket.IPV4} was automatically banned for suspicious traffic.`)

        return true
    }
}

const sanction = new Sanction()

export default sanction