import { SmartBuffer } from "smart-buffer"
import Game from "../class/Game"
import { ClientSocket } from "../class/Player"

const phin = require("phin")
    .defaults({ "parse": "json", "timeout": 12000 })

const AUTHENTICATION_API = (token: string, hostKey: string) => (
    `https://api.brick-hill.com/v1/auth/verifyToken?token=${encodeURIComponent(token)}&host_key=${encodeURIComponent(hostKey)}`
)

const UID_REGEX = /[\w]{8}(-[\w]{4}){3}-[\w]{12}/

// For local servers
let playerId = 0

interface AuthenticationData {
    username: string
    userId: number
    admin: boolean
    membershipType: number
    client: number
    validator?: string
}

interface ClientInfo {
    token: string
    version: string
    clientId: number
}

type AuthenticationResponse = Partial<AuthenticationData> | string

export default async function checkAuth(socket: ClientSocket, reader: SmartBuffer): Promise<AuthenticationResponse> {
    // Don't use any of this, it needs to be verified.
    const USER: ClientInfo = {
        token: reader.readStringNT(),
        version: reader.readStringNT(),
        clientId: 0
    }

    // Version check
    if (USER.version !== "0.3.1.0")
        return "Client version does not match this server's client version."

    // User might be using Brickplayer
    if (reader.remaining())
        USER.clientId = reader.readUInt8() || 0

    console.log(`<Client: ${socket.IP}> Attempting authentication.`)

    if (Game.local) {
        playerId++
        return {
            username: "Player" + playerId,
            userId: playerId,
            admin: false,
            membershipType: 1,
            client: USER.clientId
        }
    }

    // Invalid token format.
    if (!UID_REGEX.test(USER.token)) return "Token format is incorrect."

    try {
        const data = (await phin({ url: AUTHENTICATION_API(USER.token, Game.hostKey) })).body
        if (!data.error) {
            return {
                username: data.user.username,
                userId: Number(data.user.id),
                admin: data.user.is_admin,
                // screw you jefemy
                membershipType: (data.user.membership && data.user.membership.membership) || 1,
                client: USER.clientId,
                validator: data.validator,
            }
        }
    } catch (err) {
        console.warn(`<Error while authenticating: ${socket.IP}>`, err.message)
        return "Server error while authenticating."
    }

    return "Invalid authentication token provided."
}