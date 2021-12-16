const PacketBuilder = require("../../net/PacketBuilder").default

const { hexToDec } = require("../../util/color/colorModule").default

const formatHex = require("../../util/color/formatHex").default

const PACKET_TYPES = {
    "tool":     false,
    "face":     "Q",
    "shirt":    "R",
    "pants":    "S",
    "tshirt":   "T",
    "hat1":     "U",
    "hat2":     "V",
    "hat3":     "W",
}

async function botPacket(bot) {
    const botBuffer = new PacketBuilder("Bot")
        .write("uint32", bot.netId)
        .write("string", bot.name)

        // Position
        .write("float", bot.position.x)
        .write("float", bot.position.y)
        .write("float", bot.position.z)

        // Rotation
        .write("float", bot.rotation.x)
        .write("float", bot.rotation.y)
        .write("float", bot.rotation.z)

        // Scale
        .write("float", bot.scale.x)
        .write("float", bot.scale.y)
        .write("float", bot.scale.z)

        // Part Colors
        .write("uint32", hexToDec(bot.colors.head))
        .write("uint32", hexToDec(bot.colors.torso))
        .write("uint32", hexToDec(bot.colors.leftArm))
        .write("uint32", hexToDec(bot.colors.rightArm))
        .write("uint32", hexToDec(bot.colors.leftLeg))
        .write("uint32", hexToDec(bot.colors.rightLeg))

        // Speech
        .write("string", formatHex(bot.speech))

    botBuffer.idString = "ABCDEFGHIJKLMNOPX"

    for (const type of Object.keys(bot.assets)) {
        if (bot.assets[type] && PACKET_TYPES[type]) {
            await botBuffer.writeAsset(bot.assets[type])
            botBuffer.idString += PACKET_TYPES[type]
        }
    }

    return botBuffer
}

module.exports = botPacket