import * as g from "/js/config.js"

async function handleApiTest() {
    const statusCode = document.getElementById('statusCode');
    const responseBody = document.getElementById('responseBody');

    const method = document.getElementById('method').value;
    let path = document.getElementById('path').value;
    const body = document.getElementById('body').value;

    if (!path.startsWith("/")) path = "/" + path;
    path = g.BACKEND_BASE + path;

    try {
        let data = {
            method: method,
            headers: {
                "Content-Type": "application/json",
            }
        }

        if (method !== "GET" && method !== "DELETE") data.body = body;

        const resp = await fetch(path, data);

        const status = resp.status;
        const text = await resp.text();

        statusCode.textContent = `Status Code: ${status}`;
        statusCode.className = status >= 200 && status < 300 ? 'status-code success' : 'status-code error';

        try {
            const json = JSON.parse(text);
            responseBody.textContent = JSON.stringify(json, null, 2);
        } catch {
            responseBody.textContent = text;
        }
    } catch (error) {
        statusCode.textContent = 'Error: Request failed (page)';
        statusCode.className = 'status-code error';
        responseBody.textContent = error.message;
    }
}

document.addEventListener('DOMContentLoaded', e => {
    document.getElementById('apiTesterForm').addEventListener('submit', e => {
        e.preventDefault();
        handleApiTest().catch(console.error);
    });
});
