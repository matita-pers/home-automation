import { get, load, store } from '/js/utils.js';
import * as g from "/js/config.js"

export async function createTable(endpoint, rowFactory, cacheKey = null, expireCache = g.DEFAULT_CACHE) {
    let data = cacheKey ? load(cacheKey) : null;
    const time = data ? data.time : 0;
    if (!data || Date.now() - time > expireCache) data = await get(endpoint);
    else data = data.data;

    if (!data || data.length === 0) return;

    data = [...data].sort((a, b) => {
        if (a.id == null) return 1;
        if (b.id == null) return -1;
        return a.id - b.id;
    });

    if(cacheKey && time === 0) store(cacheKey, { data, time: Date.now() });

    let res = "";
    for (let row of data) {
        res += rowFactory(row);
    }
    return res;
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
