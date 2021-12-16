import Player from "../../class/Player"
import generateTitle from "./generateTitle"

export interface chatModule {
    generateTitle(p: Player, message: string): string
}

export default { generateTitle }