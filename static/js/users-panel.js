// Users panel specific JavaScript

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is admin
    if (!(await isAdmin())) {
        window.location.href = '/login?redirect_to=/admin/users-panel';
        return;
    }
    
    loadUsers();
    
    document.getElementById('editUserForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const userId = document.getElementById('editUserId').value;
        const username = document.getElementById('editUsername').value;
        const isAdmin = document.getElementById('editIsAdmin').checked;
        
        const result = await updateUser(userId, username, isAdmin);
        if (result.success) {
            document.getElementById('editUserSuccess').textContent = result.message || 'User updated successfully';
            document.getElementById('editUserError').textContent = '';
            document.getElementById('editUserForm').reset();
            document.getElementById('editUserId').readOnly = false;
            loadUsers(); // Reload users list
        } else {
            document.getElementById('editUserError').textContent = result.message || 'Update failed';
            document.getElementById('editUserSuccess').textContent = '';
        }
    });
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
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">';
    html += '<thead><tr style="background: #f5f5f5;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Username</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Admin</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Actions</th></tr></thead>';
    html += '<tbody>';
    
    users.forEach(user => {
        html += `<tr style="cursor: pointer;" onclick="fillEditForm(${user.id}, '${user.username}', ${user.admin})">
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${user.id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${user.username}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${user.admin ? 'Yes' : 'No'}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">
                <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin: 0;" onclick="event.stopPropagation(); fillEditForm(${user.id}, '${user.username}', ${user.admin})">Edit</button>
            </td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    usersList.innerHTML = html;
}

function fillEditForm(userId, username, isAdmin) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUsername').value = username;
    document.getElementById('editIsAdmin').checked = isAdmin;
    document.getElementById('editUserId').readOnly = true;
}

async function loadUserById() {
    const userId = document.getElementById('loadUserId').value;
    if (!userId) {
        document.getElementById('editUserError').textContent = 'Please enter a user ID';
        return;
    }
    
    try {
        const response = await fetch('/api/admin/users');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                const user = data.find(u => u.id === parseInt(userId));
                if (user) {
                    fillEditForm(user.id, user.username, user.admin);
                    document.getElementById('editUserError').textContent = '';
                } else {
                    document.getElementById('editUserError').textContent = 'User not found';
                }
            }
        }
    } catch (error) {
        console.error('Error loading user:', error);
        document.getElementById('editUserError').textContent = 'Failed to load user';
    }
}

async function updateUser(userId, username, isAdmin) {
    try {
        const response = await fetch(`/api/admin/user/${userId}/rename`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                new_name: username,
                admin: isAdmin
            })
        });

        const data = await response.json();
        
        if (data.success) {
            return { success: true, message: data.message || 'User updated successfully' };
        } else {
            return { success: false, message: data.message || 'Update failed' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}
