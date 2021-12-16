const addBrickProperties = require("./sendBrick")
const AssetDownloader = require("../../class/AssetDownloader").default
const PacketBuilder = require("../../net/PacketBuilder").default

async function loadBricks(bricks = []) {
    if (!bricks.length) return

    const packet = new PacketBuilder("SendBrick", { compression: true })
        .write("uint32", bricks.length)

    const assetRequests = []

    for (const brick of bricks)
        assetRequests.push(AssetDownloader.getAssetData(brick.model).catch(() => { }))

    await Promise.all(assetRequests)

    for (const brick of bricks)
        await addBrickProperties(packet, brick)

    return packet
}

module.exports = loadBricks