import { post } from "/js/utils.js"

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.getElementById('togglePassword');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.textContent = 'Hide';
    } else {
        passwordInput.type = 'password';
        toggleButton.textContent = 'Show';
    }
}

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!?@#$&+-_.:,;<>=';

    const len = new Uint8Array(1);
    crypto.getRandomValues(len);

    const randomValues = new Uint32Array(len[0] % 32 + 8);
    crypto.getRandomValues(randomValues);

    document.getElementById('password').value =
        Array.from(randomValues, value => chars[value % chars.length]).join('');
}

async function createUser(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const admin = document.getElementById('isAdmin').checked;

    const result = await post('/api/auth/register', { username, password, admin }, 'PUT')
    if (result.success) {
        document.getElementById('registerSuccess').textContent = result.message || 'User registered successfully';
        document.getElementById('registerError').textContent = '';
        document.getElementById('registerForm').reset();
    } else {
        document.getElementById('registerError').textContent = result.message || 'Registration failed';
        document.getElementById('registerSuccess').textContent = '';
    }
}

document.addEventListener('DOMContentLoaded', e => {
    document.getElementById('registerForm').addEventListener('submit', createUser);
    document.getElementById('togglePassword').addEventListener('click', togglePasswordVisibility);
    document.getElementById('generatePassword').addEventListener('click', generatePassword);
});
