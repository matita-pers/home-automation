// Registration page specific JavaScript

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const isAdmin = document.getElementById('isAdmin').checked;
        
        if (password !== confirmPassword) {
            document.getElementById('registerError').textContent = 'Passwords do not match';
            document.getElementById('registerSuccess').textContent = '';
            return;
        }
        
        const result = await registerUser(username, password, isAdmin);
        if (result.success) {
            document.getElementById('registerSuccess').textContent = result.message || 'User registered successfully';
            document.getElementById('registerError').textContent = '';
            document.getElementById('registerForm').reset();
        } else {
            document.getElementById('registerError').textContent = result.message || 'Registration failed';
            document.getElementById('registerSuccess').textContent = '';
        }
    });
});
