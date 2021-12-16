import filterList from "./filter.json"

let regex = new RegExp(filterList.join("|"), "i")

function setFilter(filter: string[]): void {
    regex = new RegExp(filter.join("|"), "i")
}

function getFilter(): string[] {
    return filterList
}

function isSwear(input: string): boolean {
    return regex.test(input)
}

export default { getFilter, setFilter, isSwear }