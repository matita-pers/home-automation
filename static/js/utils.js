import * as g from "/js/config.js"

export function remove(key) {
  localStorage.removeItem(key);
}

export function store(key, value) {
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function load(key) {
  if (!key) return null;
  return JSON.parse(localStorage.getItem(key));
}

export async function get(path) {
  const response = await fetch(g.BACKEND_BASE + path);
  if (!response.ok) return null;
  return response.json();
}

export async function post(path, data, method = "POST") {
  if (!path.startsWith("/")) path = "/" + path;

  try {
    const response = await fetch(g.BACKEND_BASE + path, {
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  } catch (error) {
    return { success: false, message: "Network error:" + error.message };
  }
}

export async function refreshSession() {
  remove("session");
  return await getSession();
}

export async function getSession() {
  let session = load("session");
  if (session && session.time) {
    if (Date.now() - session.time < g.LOGIN_SESSION_TIME) return session;
    store("session", null);
  }

  session = await readSessionCookie();
  if (!session || !session.logged_in) session = await get("/api/auth/session");

  if (!session || !(session.logged_in || session.success)) return null;

  session.time = Date.now();
  store("session", session);
  return session;
}

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split("; ") : [];

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");
    const cookieName = cookie.slice(0, separatorIndex);
    const cookieValue = cookie.slice(separatorIndex + 1);

    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }

  return null;
}

async function readSessionCookie() {
  const cookie = getCookie(g.COOKIE_NAME);

  if (!cookie) return null;

  let compressed = false;
  let payload = cookie;

  if (payload.startsWith(".")) {
    compressed = true;
    payload = payload.slice(1);
  }

  let base64 = payload.split(".")[0];

  const binary = atob(base64);
  let data = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i);
  }
  
  if (compressed) {
    const decompressed = new Blob([data]).stream()
        .pipeThrough(new DecompressionStream("deflate"))
    data = await new Uint8Array(await new Response(decompressed).arrayBuffer());
  }

  return JSON.parse(new TextDecoder("utf-8").decode(data));
}
