// Dependencies
import { SmartBuffer } from "smart-buffer"
import { ClientSocket } from "../class/Player"

import zlib from "zlib"

// Game objects
import Game from "../class/Game"
import Player from "../class/Player"

// Utility
import whiteListedKeys from "../util/keys/whitelisted"
import generateTitle from "../util/chat/generateTitle"
import { readUIntV } from "./uintv"

import scripts from "../scripts"

import checkAuth from "../api/checkAuth"
import Sanction from "../class/Sanction"

export enum ClientPacketType {
    Authentication = 1,
    Position = 2,
    Command = 3,
    Projectile = 4,
    ClickDetection = 5,
    PlayerInput = 6,
    Heartbeat = 18
}

async function handlePacketType(type: ClientPacketType, socket: ClientSocket, reader: SmartBuffer) {
    const player = socket.player

    // Drop auth-required packets if the client isn't authenticated.
    if (type !== ClientPacketType.Authentication && !player) return

    switch (type) {
        case ClientPacketType.Authentication: {
            if (socket._attemptedAuthentication) {
                if (Sanction.banSocket(socket))
                    console.warn("[SANCTION] Client attempted to authenticate more than once.")
                return
            }

            socket._attemptedAuthentication = true

            const authResponse = await checkAuth(socket, reader)

            // User could not authenticate properly.
            if (typeof authResponse === "string") {
                console.log(`<Client: ${socket.IP}> Failed verification.`)
                return scripts.kick(socket, authResponse)
            }

            // Check if the users socket is still active after authentication.
            if (socket.destroyed) return

            // Check if player is already in game + kick them if so.
            for (const player of Game.players) {
                if (player.userId === authResponse.userId)
                    return scripts.kick(socket, "You can only join this game once per account.")
            }

            const authUser = new Player(socket)

            // Make properties readonly.
            Object.defineProperties(authUser, {
                userId: { value: authResponse.userId },
                username: { value: authResponse.username },
                admin: { value: authResponse.admin },
                membershipType: { value: authResponse.membershipType },
                client: { value: authResponse.client },
                validationToken: { value: authResponse.validator }
            })

            console.log(`Successfully verified! (Username: ${authUser.username} | ID: ${authUser.userId} | Admin: ${authUser.admin})`)

            // Finalize the player joining process.
            Game._newPlayer(authUser)

            break
        }
        case ClientPacketType.Position: {
            let xpos,
                ypos,
                zpos,
                zrot,
                xrot
            try {
                xpos = reader.readFloatLE()
                ypos = reader.readFloatLE()
                zpos = reader.readFloatLE()
                zrot = reader.readFloatLE()
                xrot = reader.readFloatLE()
            } catch (err) {
                return
            }
            player._updatePositionForOthers([
                xpos, ypos, zpos, zrot, xrot
            ])
            break
        }
        case ClientPacketType.Command: {
            let command, args

            try {
                command = reader.readStringNT()
                args = reader.readStringNT()
            } catch (err) {
                return
            }

            if (command !== "chat")
                return Game.emit("command", command, player, args)

            if (!args.length) return

            // The host wants to manage chat on their own
            if (Game.listeners("chat").length)
                return Game.emit("chat", player, args, generateTitle(player, args))

            player.messageAll(args)

            break
        }
        case ClientPacketType.Projectile: {
            break
        }
        case ClientPacketType.ClickDetection: {
            try {
                const brickId = reader.readUInt32LE()

                // Check for global bricks with that Id.
                const brick = Game.world.bricks.find(brick => brick.netId === brickId)
                if (brick && brick.clickable)
                    return brick.emit("clicked", player)

                // The brick might be local.
                const localBricks = player.localBricks
                const localBrick = localBricks.find(brick => brick.netId === brickId)

                if (localBrick && localBrick.clickable)
                    return localBrick.emit("clicked", player)
            } catch (err) {
                return
            }
            break
        }
        case ClientPacketType.PlayerInput: {
            try {
                const click = Boolean(reader.readUInt8())
                const key = reader.readStringNT()

                if (click) player.emit("mouseclick")

                if (key && whiteListedKeys.includes(key))
                    player.emit("keypress", key)
            } catch (err) {
                return
            }
            break
        }
        case ClientPacketType.Heartbeat: {
            player.socket.keepalive.restartTimer()
        }
    }
}

export default async function parsePacket(socket: ClientSocket, rawBuffer: Buffer) {
    const packets = []

    if (rawBuffer.length <= 1) return;

    // This isn't implemented correctly, but clients are not going to send large packet data anyways.
    (function readMessages(buffer) {
        const { messageSize, end } = readUIntV(buffer)
        if (end >= buffer.length) return

        if (messageSize >= 5000) {
            if (Sanction.banSocket(socket))
                console.warn("[SANCTION] Client sent a packet with a huge message size.")
            return
        }

        const packet = buffer.slice(end)

        // Packet is complete
        if (packet.length === messageSize)
            return packets.push(packet)

        // Read remaining buffer
        if (messageSize < packet.length) {
            packets.push(packet.slice(0, messageSize))
            readMessages(packet.slice(messageSize))
            return packets
        }
    })(rawBuffer)

    for (let packet of packets) {
        try {
            packet = zlib.inflateSync(packet)
        } catch (err) { }

        const reader = SmartBuffer.fromBuffer(packet)

        // Check for the packet type
        let type: number
        try {
            type = reader.readUInt8()
        } catch (err) { }

        // Packet ID was not valid
        if (Game.banNonClientTraffic && !Object.values(ClientPacketType).includes(type)) {
            if (Sanction.banSocket(socket))
                console.warn("[SANCTION] Client sent non-Brick Hill traffic.")
        }

        // For performance reasons, I'm going to verify scripts are actually listening to gmPacket
        // before initiating a SmartBuffer instance for every packet.
        if (socket.listenerCount("gmPacket")) {
            socket.emit("gmPacket", {
                packetId: type,
                data: SmartBuffer.fromBuffer(packet)
            })
        }

        handlePacketType(type, socket, reader)
    }
}