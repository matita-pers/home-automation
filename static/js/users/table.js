import { get, load, store } from '/js/utils.js';
import * as g from "/js/config.js"

let defaultRows = {};

export async function createTable(table, endpoint, rowFactory, cacheKey = null, expireCache = g.DEFAULT_CACHE, callback = null) {
    let data = cacheKey ? load(cacheKey) : null;
    const time = data ? data.time : 0;
    if (!data || Date.now() - time > expireCache) data = await get(endpoint);
    else data = data.data;

if (!defaultRows[table]) defaultRows[table] = table.innerHTML;

    if (!data || data.length === 0) {
table.innerHTML= defaultRows[table];
    return;
}

    data.sort((a, b) => {
        if (a.id == null) return 1;
        if (b.id == null) return -1;
        return a.id - b.id;
    });

    if(cacheKey && time === 0) store(cacheKey, { data, time: Date.now() });

    table.innerHTML = "";
    for (const row of data) {
        const temp = document.createElement("tbody");
        temp.innerHTML = rowFactory(row).trim();

        const tr = temp.firstElementChild;
        if (!tr) continue;

        table.appendChild(tr);
        if (callback) callback (row, tr);
    }
}

export function modifyData(cacheKey, filter, updater) {
    const data = load(cacheKey);
    if (!data) return;
    for (let i = 0; i < data.data.length; i++) {
        if (!filter(data.data[i])) continue;
        data.data[i] = updater(data.data[i]);
    }
    store(cacheKey, data);
}
