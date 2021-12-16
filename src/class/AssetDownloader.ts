const phin = require("phin")
    .defaults({ "timeout": 12000 })

const ASSET_API = (assetId) => `https://api.brick-hill.com/v1/assets/getPoly/1/${assetId}`
const GET_ASSET_DATA = (assetId) => `https://api.brick-hill.com/v1/assets/get/${assetId}`

export interface AssetData {
    mesh: string
    texture: string
}

export class AssetDownloader {
    cache: Record<number, AssetData>

    constructor() {
        this.cache = {}
    }

    async fetchAssetUUID(type: string, assetId: number) {
        const data = await phin({ url: GET_ASSET_DATA(assetId) })

        if (data.statusCode !== 302)
            return Promise.reject(`AssetDownloader: Unexpected status code when retrieving asset data for ${assetId}.`)

        const path = data.headers.location.split("/")

        return { [type]: path.pop() }
    }

    async getAssetData(assetId: number): Promise<AssetData> {
        if (!assetId) return
        if (this.cache[assetId]) return this.cache[assetId]

        const promises = []

        const assetData = {
            mesh: null,
            texture: null
        }

        let req

        try {
            req = (await phin({ url: ASSET_API(assetId), followRedirects: true, parse: "json" })).body[0]
            if (req.error) throw new Error(req.error.message)
        } catch {
            return Promise.reject(`AssetDownloader: Failure retrieving asset data for ${assetId}.`)
        }

        const mesh = req.mesh?.replace("asset://", "")
        const texture = req.texture?.replace("asset://", "")

        if (mesh)
            promises.push(this.fetchAssetUUID("mesh", mesh))
        if (texture)
            promises.push(this.fetchAssetUUID("texture", texture))

        const assetUUID = await Promise.all(promises)

        Object.assign(assetData, ...assetUUID)

        this.cache[assetId] = Object.assign({}, assetData)

        return assetData
    }
}

const assetDownloader = new AssetDownloader()

export default assetDownloader