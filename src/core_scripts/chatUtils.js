/*eslint no-undef: "off"*/

Game.chatUtils = {}
Game.chatUtils.events = {}

const regexMatch = /(?:"([^"]+)"+)([^"]+)?/

const rateLimit = new Set()

const COMMAND_HELP = {
    "/cmds": "Displays all core chat commands.",
    "/w \"player\" message": "Whispers to a player privately. Quotes are required for usernames with spaces.",
    "/block player": "Blocks / unblocks a player's messages."
}

function findPlayerByName(name) {
    name = name.toLowerCase()
    for (const p of Game.players) {
        if (p.username.toLowerCase() === name)
            return p
    }
}

const events = Game.chatUtils.events

events['block'] = Game.command("block", (player, args) => {
    if (!args)
        return player.message("Must provide a player name.")

    const playerArg = args.replace("block ", "")
    const target = findPlayerByName(playerArg)

    // No target found
    if (!target)
        return player.message("Invalid user: " + playerArg)

    // Cannot block yourself
    if (target === player)
        return player.message("You cannot block yourself.")

    if (!player.blockedUsers.includes(target.userId)) {
        player.blockedUsers.push(target.userId)
        player.message("Successfully blocked: " + target.username)
    } else {
        player.blockedUsers.splice(target.username, 1)
        player.message("Successfully unblocked: " + target.username)
    }
})

events['cmds'] = Game.command("cmds", (player) => {
    for (const key of Object.keys(COMMAND_HELP)) {
        player.message(key + ` (${COMMAND_HELP[key]})`)
    }
})

events['whisper'] = Game.commands(["whisper", "w"], (player, args) => {
    if (!args)
        return player.message("Incorrect usage of command.")

    try {
        const match = args.match(regexMatch)
        let playerArg, message

        // User included quotes, EX: /w "brick hill" you suck
        if (match) {
            playerArg = match[1]
            message = match[2]
        } else {
            args = args.split(" ")
            playerArg = args.shift()
            message = args.join(" ")
        }

        message = message.trim()

        if (!message || !playerArg) throw new Error("Bad arguments.")

        if (rateLimit.has(player.username))
            return player.message("You're whispering too fast!")

        // Add rate-limit to whispering
        rateLimit.add(player.username)
        setTimeout(() => rateLimit.delete(player.username), 2000)

        if (util.filter.isSwear(message))
            return player.message("Don't swear! Your message has not been sent.")

        const target = findPlayerByName(playerArg)

        if (target) {
            // You can't whisper to yourself.
            if (target === player)
                return player.message("You cannot whisper to yourself.")

            player.message(`[#ADFF2F][you -> ${target.username}]: ` + message)

            // You are blocked by this user.
            if (target.blockedUsers.includes(player.username))
                return

            target.message(`[#ADFF2F][${player.username} -> you]: ` + message)
        } else {
            player.message("Invalid user: " + playerArg)
        }
    } catch (err) {
        player.message("Failure while whispering.")
    }
})

Game.on("initialSpawn", (p) => {
    p.message("Type /cmds for a list of commands.")
})