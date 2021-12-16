const phin = require("phin")
    .defaults({ parse: "json", timeout: 12000 })

const API = `https://api.brick-hill.com/v1/sets/`

async function getSetData(setId) {
    const data = (await phin({url: API + parseInt(setId)})).body
    return data
}

module.exports = getSetData
