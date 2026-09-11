import { getSession, post, refreshSession } from "/js/utils.js"

const redirectTo = new URLSearchParams(window.location.search).get('redirect_to') || '/';

async function handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const resp = await post('/api/auth/login', { username, password })
    if (resp && resp.success) {
        await refreshSession();
        window.location.href = redirectTo;
    } else {
        document.getElementById('loginError').textContent = resp?.message || 'Login failed';
    }
}

document.addEventListener('DOMContentLoaded', e => {
    getSession().then(user => {
        if (user) {
            console.log('User is already logged in:', user);
            console.log('Redirecting to:', redirectTo);
            window.location.href = redirectTo;
        }
    });

    const input = document.getElementById("password");
    document.getElementById('toggle').addEventListener('click', e => {
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    document.getElementById('loginForm').addEventListener('submit', e => {
        e.preventDefault();
        handleLogin().catch(console.error);
    });
});
