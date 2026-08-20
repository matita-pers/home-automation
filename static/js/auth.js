// Session management - using Flask server-side sessions
let cachedUser = null;

async function getCurrentUser() {
    if (cachedUser) {
        return cachedUser;
    }
    
    try {
        const response = await fetch('/api/auth/session');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.username) {
                cachedUser = { username: data.username, isAdmin: data.is_admin || false };
                return cachedUser;
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching session:', error);
        return null;
    }
}

function clearCache() {
    cachedUser = null;
}

// API calls
async function login(username, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (data.success) {
            clearCache(); // Clear cache so it will fetch fresh session data
            return { success: true, message: data.message || 'Login successful' };
        } else {
            return { success: false, message: data.message || 'Login failed' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}

async function registerUser(username, password) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        
        if (data.success) {
            return { success: true, message: data.message || 'User registered successfully' };
        } else {
            return { success: false, message: data.message || 'Registration failed' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    clearCache();
    window.location.href = 'login.html';
}

// Update navbar based on login state
async function updateNavbar() {
    const navRight = document.getElementById('navRight');
    if (!navRight) return;

    const user = await getCurrentUser();

    if (user) {
        let html = `<span class="username">${user.username}</span>`;
        
        if (user.isAdmin) {
            html += `<a href="registration.html" class="btn">Register User</a>`;
        }
        
        html += `<button class="btn btn-logout" onclick="logout()">Logout</button>`;
        navRight.innerHTML = html;
    } else {
        navRight.innerHTML = `<a href="login.html" class="btn">Login</a>`;
    }
}

// Check if user is logged in
async function isLoggedIn() {
    const user = await getCurrentUser();
    return user !== null;
}

// Check if current user is admin
async function isAdmin() {
    const user = await getCurrentUser();
    return user && user.isAdmin;
}

// Redirect to login if not authenticated
async function requireAuth() {
    if (!(await isLoggedIn())) {
        window.location.href = 'login.html';
    }
}

// Redirect to home if not admin
async function requireAdmin() {
    if (!(await isAdmin())) {
        window.location.href = 'index.html';
    }
}
