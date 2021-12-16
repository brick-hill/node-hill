const phin = require("phin")
    .defaults({ parse: "json", timeout: 12000 })

const API = (userId, itemId) => `https://api.brick-hill.com/v1/user/${userId}/owns/${itemId}`

async function playerOwnsAsset(userId, itemId) {
    return (await phin({url: API(userId, itemId)})).body?.owns
}

module.exports = playerOwnsAsset
