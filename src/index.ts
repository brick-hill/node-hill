// Node + npm modules
import { resolve, basename, join, relative } from "path"
import { promisify } from "util"
import { NodeVM } from "vm2"
import * as fs from "fs"
import glob from "glob"

// Have to use require here because phin doesn't support .defaults with TS
const phin = require("phin")
    .defaults({ "parse": "json", "timeout": 12000 })

// VM Classes
import GameObject, { Game } from "./class/Game"

import Team from "./class/Team"
import Brick from "./class/Brick"
import Bot from "./class/Bot"
import PacketBuilder from "./net/PacketBuilder"
import Vector3 from "./class/Vector3"
import { loadBrk } from "./scripts"
import Tool from "./class/Tool"
import Outfit from "./class/Outfit"

// Utility methods
import color from "./util/color/colorModule"
import filter from "./util/filter/filterModule"
import serialize from "./util/serializer/serializerModule"
import chat from "./util/chat/chatModule"

import Player from "./class/Player"

// Bundler
import { bundleMapData } from "nh-bundle/lib"

import AssetDownloaderInstance, { AssetDownloader } from "./class/AssetDownloader"
import SanctionInstance, { Sanction } from "./class/Sanction"

const NPM_LATEST_VERSION = "https://registry.npmjs.org/node-hill/latest"

const CORE_DIRECTORY = resolve(__dirname, "./core_scripts")

// Typedoc exports
export * from "./class/Game"
export { default as Player, ClientSocket } from "./class/Player"
export { default as Team } from "./class/Team"
export { default as Brick } from "./class/Brick"
export { default as Outfit } from "./class/Outfit"
export { default as Vector3 } from "./class/Vector3"
export { default as Bot } from "./class/Bot"
export { default as Tool, ToolEvents } from "./class/Tool"
export { default as PacketBuilder, PacketBuilderOptions, PacketEnums } from "./net/PacketBuilder"
export { KeyTypes } from "./util/keys/whitelisted"
export * from "./class/AssetDownloader"
export * from "./class/Sanction"

export interface Utilities {
    filterModule: typeof filter
    serializer: typeof serialize
    color: typeof color
    chat: typeof chat
}
/**
 * Contains all the global variables that are copied into the VM.
 */
export interface VM_GLOBALS {
    /**@global */
    Game: typeof Game

    /**
     * @global
     * Shortcut to {@link Game.world}
     * */
    world: typeof GameObject.world

    /** @global */
    Team: typeof Team

    /** @global */
    Tool: typeof Tool

    /** @global */
    Brick: typeof Brick

    /** @global */
    Bot: typeof Bot

    /** @global
     * Used for setting or reading object positions / scale / etc.
    */
    Vector3: typeof Vector3

    /**@global
     * Used for setting a player / bot's body colors + assets.
     */
    Outfit: typeof Outfit

    /** @global 
     * Used internally by the library to create and distribute Brick Hill legacy client-compatible packets. \
     * This is intended for advanced users, but allows you to have complete control over the client.
    */
    PacketBuilder: typeof PacketBuilder

    AssetDownloader: typeof AssetDownloader

    Sanction: typeof Sanction

    /** @global
     * Will eventually contain handy functions. But for now only contains randomHexColor().
     */
    util: Utilities

    /**
     * A promisified version of setTimeout, useful for writing timeouts syncronously.
     * @global
     * @example
     * ```js
     * Game.on("playerJoin", async(player) => {
     *  player.message("After 5 seconds, you're gone!")
     *  await sleep(5000)
     *  player.kick("Time's up!")
     * })
     */
    sleep: Promise<void>

    /**
     * Used for locking functions until a specified time has passed.
     * @global
     * @example
     * ```js
     * Game.on("playerJoin", (player) => {
     *    player.on("mouseclick", debounce(() => {
     *        console.log("You clicked! But now you can't for 5 seconds.")
     *    }, 5000))
     * })
     * ```
     */
    debounce: (callback: (...args) => void, delay: number) => void

    /**
     * Used for locking functions for a player until a specified time has passed.
     * @global
     * @example
     * ```js
     * let brick = world.bricks.find(b => b.name === "teleporter")
     * 
     * brick.touching(debouncePlayer(p => {
     *  p.setPosition(brick.position)
     * }, 5000))
     * ```
     */
    debouncePlayer: (callback: (player: Player, ...args) => void, delay: number) => void

    /**Modules in start.js are built in host (outside of the vm). It is highly recommended to use this function
     * to require them in a VM context. If you opt to use require() instead, you may have issues.
     * @example
     * Example:
     * ```js
     * // Inside of start.js: modules: ["discord.js", "fs"]
     * 
     * // Now inside of a sample script:
     * 
     * // You can now use discord.js
     * let discord = getModule("discord.js")
     * 
     * // Login to a discord account, etc.
     * discord.login("myToken")
     * ```
     */
    getModule: (module: string) => NodeModule
}

const recursePattern = () => {
    return (GameObject.serverSettings.recursiveLoading && "/**/*.js") || "/*.js"
}

function vmLoadScriptInDirectory(vm: NodeVM, scriptDirectory: string, scriptType: string) {
    const files = glob.sync(scriptDirectory + recursePattern(), { dot: true })

    for (const filePath of files) {
        const fileName = basename(filePath)

        // We do not want to load core scripts if the user disabled them
        if (GameObject.disabledCoreScripts.includes(fileName)) {
            console.log(`[*] Disabled Core Script: ${fileName}`)
            continue
        }

        try {
            const scriptContents = fs.readFileSync(filePath, "UTF-8")
            vm.run(scriptContents, filePath)
            console.log(`[*] Loaded ${scriptType} Script: ${fileName}`)
        } catch (err) {
            console.log(`[*] Error loading ${scriptType} Script: ${fileName}`)
            console.error(err.stack)
        }
    }
}

function loadScripts() {
    const sandbox = {
        Game: GameObject,

        world: GameObject.world,

        Team: Team,

        Brick: Brick,

        Bot: Bot,

        Outfit: Outfit,

        util: { color, filter, serialize, chat },

        Tool: Tool,

        PacketBuilder: PacketBuilder,

        Sanction: SanctionInstance,

        AssetDownloader: AssetDownloaderInstance,

        sleep: promisify(setTimeout),

        // These need to be added to the VM to fix a bug with player.setInterval
        // If you don't add these, you cannot clear loops created by those functions.
        clearInterval: clearInterval,
        clearTimeout: clearTimeout,

        Vector3: Vector3,

        debounce: (func, wait) => {
            let timeout

            return function (...args) {
                if (timeout) return

                timeout = setTimeout(() => {
                    timeout = null
                }, wait)

                func.apply(this, args)
            }
        },

        debouncePlayer: (func, wait) => {
            const playerDebounce = {}

            return function (...args) {
                const player = args[0]

                if (!GameObject.players.filter(p => p === player).length)
                    throw new Error('Object passed is not a valid player.')

                if (playerDebounce[player.userId]) return

                playerDebounce[player.userId] = setTimeout(() => {
                    playerDebounce[player.userId] = null
                }, wait)

                func.apply(this, args)
            }
        },

        getModule: (name) => {
            if (!GameObject.modules[name])
                throw new Error(`No module with the name ${name} found.`)

            return GameObject.modules[name]
        }
    }

    const vm = new NodeVM({
        require: {
            external: true,
            root: process.cwd(),
            context: "sandbox"
        },
        sandbox: sandbox
    })

    if (GameObject.disabledCoreScripts[0] !== "*")
        vmLoadScriptInDirectory(vm, CORE_DIRECTORY, "Core")
    else
        console.log("[*] All Core Scripts disabled")

    if (!GameObject.userScripts) return

    vmLoadScriptInDirectory(vm, GameObject.userScripts, "User")
}

async function initiateMap() {
    if (GameObject.map && !GameObject.map.endsWith(".brk")) {
        console.log("Map selected is not a .brk file. Aborting.")
        return process.exit(0)
    }
    console.clear()
    try {
        const mapData = await loadBrk(join(GameObject.mapDirectory, GameObject.map))
        Object.assign(GameObject.world, mapData)
    } catch (err) {
        console.error("Failure parsing brk: ", err && err.stack)
        return process.exit(1)
    }
}

export interface GameSettings {
    /**The id of the Brick Hill set. */
    gameId: number,

    /**The host key of the Brick Hill set. */
    hostKey: string,

    /**Whether or not the server will be posted to the games page. */
    postServer: boolean,

    /**IP to bind the server to (Default 127.0.0.1 on local, 0.0.0.0 otherwise) */
    ip?: string,

    /**The port the server will be running on. (Default is 42480).*/
    port?: number,

    /** The name of the brk file to be hosted. (ex: `hello.brk`) */
    map?: string,

    /**The file path to server's map folder. */
    mapDirectory?: string,

    /**An array containing the names of core scripts you do not want to run. \
     * For ex: `["admin.js"]`
     * 
     * You can use `["*"]` to disable ALL core scripts.
     * 
     * @default true
    */
    disabledCoreScripts?: Array<string>,

    /**
     * An array containing the names of npm modules / core node.js modules you want to compile from host, and use inside the VM context.
     * 
     * You can require them with {@link getModule}
     */
    modules?: Array<string>,

    /**A link to your scripts directory. ex: (`/myfolder/user_scripts`) */
    scripts?: string,

    /**A boolean indicating if the server is locally hosted or not. Uses port 42480 by default. \
     * Port forwarding is not required
     * @default false
    */
    local?: boolean,

    /**If enabled, all files (even inside of folders) in user_scripts will be loaded recursively */
    recursiveLoading?: boolean
}

/** Starts a node-hill server with the specified settings.*/
export async function startServer(settings: GameSettings): Promise<Game> {
    if (!settings.port || isNaN(settings.port)) {
        console.log("No port specified. Defaulted to 42480.")
        settings.port = 42480
    }

    settings.postServer = (typeof settings.postServer === 'undefined' && true) || settings.postServer

    if (settings.scripts) {
        settings.scripts = resolve(process.cwd(), settings.scripts)
        GameObject.userScripts = settings.scripts
    }
    GameObject.ip = settings.ip
    GameObject.port = Number(settings.port)
    GameObject.hostKey = settings.hostKey
    GameObject.gameId = Number(settings.gameId)
    GameObject.disabledCoreScripts = settings.disabledCoreScripts || []
    GameObject.mapDirectory = settings.mapDirectory

    // Load the modules into Game.modules so the user can call them with getModule()
    settings.modules?.forEach((module) => {
        if (typeof module === 'string') {
            GameObject.modules[module] = require(module)
        } else if (typeof module === 'object') {
            Object.assign(GameObject.modules, module)
        }
    })

    GameObject.recursiveLoading = Boolean(settings.recursiveLoading)
    GameObject.local = Boolean(settings.local)

    if (!GameObject.hostKey && !GameObject.local) {
        console.log("No host key specified.")
        return process.exit(0)
    }
    if (settings.mapDirectory && settings.map) {
        GameObject.mapDirectory = resolve(process.cwd(), settings.mapDirectory)
        GameObject.map = settings.map
        await initiateMap()
    } else {
        console.warn("WARNING: No map or mapDirectory set. Defaulting to empty baseplate.")
        GameObject.map = null
    }

    GameObject.serverSettings = settings

    // Add support for bundle option.
    const args = process.argv.slice(2)
    for (const arg of args) {
        if (arg === '--bundle') {
            return bundleMapData({
                map: (GameObject.map && join(GameObject.mapDirectory, GameObject.map)),
                scripts: {
                    directory: relative(process.cwd(), GameObject.userScripts),
                    files: ["**/*.js"]
                }
            })
        }
    }

    // Do version check
    _getLatestnpmVersion()
        .then((package_version) => {
            if (package_version !== GameObject.version) {
                console.warn(`WARNING: node-hill version is out of date. [Latest version: ${package_version}]. \nRun \`npm i node-hill@latest\` to resolve.`)
            }
        })
        .catch(() => {
            console.warn('WARNING: Failure while checking for latest node-hill version.')
        })

    console.log(`<<<Port: ${GameObject.port} | Game: ${GameObject.gameId} | Map: ${GameObject.map}>>>`)

    require("./server")

    loadScripts()

    GameObject.emit("scriptsLoaded")

    return GameObject
}

async function _getLatestnpmVersion() {
    const data = (await phin({ url: NPM_LATEST_VERSION })).body
    return data.version
}