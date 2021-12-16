import Game from "../class/Game"

const phin = require("phin")
    .defaults({
        url: "https://api.brick-hill.com/v1/games/postServer",
        method: "POST",
        timeout: 12000
    })

interface PostData {
    host_key: string
    port: number
    players: string[] // Array of player validation tokens
}

export default async function postServer(): Promise<void> {
    try {
        const postData: PostData = {
            "host_key": Game.hostKey,
            "port": Game.port,
            "players": Game.players.map(player => player.validationToken)
        }

        const response = await phin({ data: postData })

        try {
            const body = JSON.parse(response.body)
            if (body.error) {
                console.warn("Failure while posting to games page:", JSON.stringify(body.error.message || body))

                if (body.error.message === "You can only postServer once every minute") return

                return process.exit(0)
            }
        } catch (err) { } // It was successful (?)
    } catch (err) {
        console.warn("Error while posting to games page.")
        console.error(err.stack)
    }
}