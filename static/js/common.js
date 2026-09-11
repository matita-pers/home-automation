import * as g from "/js/config.js"
import { getSession, refreshSession } from "/js/utils.js"

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    await refreshSession();
    window.location.href = '/login';
}

async function generateNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) {
        console.error('Navbar element not found');
        return;
    }

    const user = await getSession();
    
    let navHTML = `
        <div class="nav-left">
            <a href="/" class="site-title"><h1 id="siteTitle">${g.SITE_TITLE}</h1></a>
        </div>
        <div class="nav-right">
    `;

    if (!user) {
        navHTML += `<a href="/login" class="btn">Login</a>`;
    } else {
        navHTML += `<span class="username">${user.username}</span>`;

        if (user.admin) {
            try {
                const { adminNavbar } = await import("/admin/js/admin.js");
                navHTML += adminNavbar();
            } catch (error) {
                console.error("Error loading admin navbar:", error);
            }
        }

        navHTML += `<a href="/users/change-password" class="btn">Change Password</a>`;
        navHTML += `<button class="btn btn-logout">Logout</button>`;
    }

    navHTML += `</div>`;
    navbar.innerHTML = navHTML;

    if (user) document.getElementsByClassName("btn btn-logout")[0].addEventListener('click', logout);
}

function addFavicon() {
    let favicon = document.querySelector('link[rel="icon"]');
    if (favicon) return;

    favicon = document.createElement("link");
    favicon.href = "/favicon.ico";
    favicon.rel = "icon";

    document.head.appendChild(favicon);
}

function addGeneratedParts() {
    generateNavbar().catch(console.error);
    addFavicon();
    if (document.title && document.title.includes(" - ")) {
        document.title = document.title.split(" - ")[0] + " - " + g.SITE_NAME;
    } else document.title = g.SITE_NAME;
}

document.addEventListener('DOMContentLoaded', addGeneratedParts);
