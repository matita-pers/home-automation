import { get, load, store } from '/js/utils.js';
import * as g from "/js/config.js"

let defaultRows = {};

export async function createTable(table, endpoint, rowFactory, cache = null, callback = null) {
    const cacheKey = cache?.key || table.id + "." + endpoint;
    const expireCache = cache?.time || g.DEFAULT_CACHE
    let data = load(cacheKey);
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

    if(time === 0) store(cacheKey, { data, time: Date.now() });

    table.innerHTML = "";
    for (const row of data) {
        const temp = document.createElement("tbody");
        temp.innerHTML = rowFactory(row).trim();

        const tr = temp.firstElementChild;
        if (!tr) continue;

        table.appendChild(tr);
        if (callback) callback(row, tr);
    }
}

export function addData(cacheKey, row) {
    const data = load(cacheKey);
    if (!data) return;
    data.data.push(row);
    store(cacheKey, data);
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

export function deleteData(cacheKey, filter) {
    const data = load(cacheKey);
    if (!data) return;
    data.data = filter(data);
    store(cacheKey, data);
}

export function createAddButtonsCallback(...btnList) {
    return function (data, row) {
         const section = row.querySelector("#btn-col");
        btnList.forEach(btn => {
            const btnEl = document.createElement("button");

            btnEl.innerHTML = btn.name;

            btnEl.classList.add("btn");
            if (btn.classes) btn.classes.forEach(btnEl.classList.add);

            btnEl.onclick = () => btn.fn(data);

            section.insertBefore(btnEl, null);
            if (btn.callback) btn.callback(btnEl);
        })
    }
}

export function compoundCallback(...callbacks) {
    return function (data, row) {
        callbacks.forEach(c => c(data, row));
    }
}

export function rowClickCallback(fn) {
    return function (data, row) {
        row.onclick = () => fn(data);
    }
}
