import { getSession } from "/js/utils.js"

async function load() {
    let session = await getSession();
    if (session && session.logged_in) {
        document.querySelector("#data").innerHTML = `<a class="btn" href="/users/data-panel/">Data panel</a>`;
    }
}

document.addEventListener("DOMContentLoaded", () => load().catch(console.error))
