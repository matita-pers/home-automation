// Login page specific JavaScript

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect_to');
    
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        const result = await login(username, password);
        if (result.success) {
            if (redirectTo) {
                window.location.href = redirectTo;
            } else {
                window.location.href = '/';
            }
        } else {
            document.getElementById('loginError').textContent = result.message || 'Login failed';
        }
    });
});
