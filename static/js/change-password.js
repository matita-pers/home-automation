// Change password page specific JavaScript

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    if (!(await isLoggedIn())) {
        window.location.href = '/login?redirect_to=/users/change-password';
        return;
    }
    
    document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            document.getElementById('changePasswordError').textContent = 'Passwords do not match';
            document.getElementById('changePasswordSuccess').textContent = '';
            return;
        }
        
        const result = await changePassword(newPassword);
        if (result.success) {
            document.getElementById('changePasswordSuccess').textContent = result.message || 'Password changed successfully';
            document.getElementById('changePasswordError').textContent = '';
            document.getElementById('changePasswordForm').reset();
        } else {
            document.getElementById('changePasswordError').textContent = result.message || 'Password change failed';
            document.getElementById('changePasswordSuccess').textContent = '';
        }
    });
});

async function changePassword(newPassword) {
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: newPassword })
        });

        const data = await response.json();
        
        if (data.success) {
            return { success: true, message: data.message || 'Password changed successfully' };
        } else {
            return { success: false, message: data.message || 'Password change failed' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}
