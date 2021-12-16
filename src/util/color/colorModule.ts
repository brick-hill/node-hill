// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

function rgbToBgr(rgb: string): string {
    return rgb.substring(4, 6) + rgb.substring(2, 4) + rgb.substring(0, 2)
}

// Convert RGB to decimal
function rgbToDec(r: number, g: number, b: number): string {
    const rgb = r | (g << 8) | (b << 16)
    return rgb.toString(10)
}

function randomHexColor(): string {
    return '#' + ('00000' + (Math.random() * (1 << 24) | 0).toString(16)).slice(-6)
}

// Convert hex to decimal
function hexToDec(hex: string, bgr = false): string {
    hex = hex.replace(/^#/, "")
    const rgb = hexToRGB(hex)
    if (!bgr) {
        return rgbToDec(rgb[0], rgb[1], rgb[2])
    } else {
        return rgbToDec(rgb[2], rgb[1], rgb[0])
    }
}

// Convert hex to RGB
function hexToRGB(hex: string): number[] {
    hex = hex.replace(/^#/, "")
    const bigint = parseInt(hex, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return [r, g, b]
}

// Converts RGB from OpenGL format to proper format (e.g. [0, 0, 1] => [0, 0, 255])
function convertRGB(r: number, g: number, b: number): number[] {
    r = Number(r)
    g = Number(g)
    b = Number(b)
    r *= 255, g *= 255, b *= 255
    return [Math.ceil(r), Math.ceil(g), Math.ceil(b)]
}

export default { randomHexColor, rgbToHex, rgbToDec, hexToRGB, hexToDec, convertRGB, rgbToBgr }