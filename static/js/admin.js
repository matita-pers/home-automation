// Admin panel specific JavaScript

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is admin
    if (!(await isAdmin())) {
        window.location.href = '/login?redirect_to=/admin';
        return;
    }
    
    loadUsers();
});

async function loadUsers() {
    try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                displayUsers(data);
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('usersList').innerHTML = '<p class="error-message">Failed to load users</p>';
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    if (users.length === 0) {
        usersList.innerHTML = '<p>No users found</p>';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse;">';
    html += '<thead><tr style="background: #f5f5f5;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Username</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Admin</th></tr></thead>';
    html += '<tbody>';
    
    users.forEach(user => {
        html += `<tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${user.id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${user.username}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${user.admin ? 'Yes' : 'No'}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    usersList.innerHTML = html;
}
