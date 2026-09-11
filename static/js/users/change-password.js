import { post } from "/js/utils.js"

async function handleChangePassword() {
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const currentPassword = document.getElementById('oldPassword').value;

    if (newPassword !== confirmPassword) {
        document.getElementById('changePasswordError').textContent = 'Passwords do not match';
        document.getElementById('changePasswordSuccess').textContent = '';
        return;
    }

    if (currentPassword === newPassword) {
        document.getElementById('changePasswordError').textContent = 'The password can\'t be the same';
        document.getElementById('changePasswordSuccess').textContent = '';
        return;
    }

    const resp = await post('/api/auth/change-password', { password: newPassword, currentPassword })
    if (resp && resp.success) {
        document.getElementById('changePasswordSuccess').textContent = resp.message || 'Password changed successfully';
        document.getElementById('changePasswordError').textContent = '';
        document.getElementById('changePasswordForm').reset();
    } else {
        document.getElementById('changePasswordSuccess').textContent = '';
        document.getElementById('changePasswordError').textContent = resp?.message || 'Password change failed';
    }
}

document.addEventListener('DOMContentLoaded', e => {
    document.getElementById('changePasswordForm').addEventListener('submit', e => {
        e.preventDefault();
        handleChangePassword().catch(console.error);
    });
});
