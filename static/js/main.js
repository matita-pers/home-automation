// Main JavaScript file for common functionality

// Generate navbar HTML
async function generateNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const user = await getCurrentUser();
    
    let navHTML = `
        <div class="nav-left">
            <a href="/" class="site-title"><h1 id="siteTitle">${SITE_TITLE}</h1></a>
        </div>
        <div class="nav-right">
    `;

    if (user) {
        navHTML += `<span class="username">${user.username}</span>`;
        
        if (user.isAdmin) {
            navHTML += `<a href="/admin/panel" class="btn">Admin Panel</a>`;
            navHTML += `<a href="/users/registration" class="btn">Register User</a>`;
        }
        
        navHTML += `<a href="/users/change-password" class="btn">Change Password</a>`;
        navHTML += `<button class="btn btn-logout" onclick="logout()">Logout</button>`;
    } else {
        navHTML += `<a href="/login" class="btn">Login</a>`;
    }

    navHTML += `</div>`;
    navbar.innerHTML = navHTML;
}

// Initialize navbar on page load
document.addEventListener('DOMContentLoaded', function() {
    generateNavbar();
});
