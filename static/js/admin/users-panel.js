import { post, load } from '/js/utils.js'
import { createTable, modifyData } from '/users/js/table.js'
import * as g from "/js/config.js"

let defaultUsersRow = null;
const usersTable = document.getElementById('usersList');

function deleteUser(user) {
    if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
        alert("Unimplemented, use the db genius") //TODO
    }
}

function startEditUser(userid) {
    if (!userid) return;
    // noinspection EqualityComparisonWithCoercionJS loose comparison so string and int can be equal
    const user = load("usersList")?.data?.find(u => u.id == userid);
    if (!user) {
        alert("User not found, refresh the data");
        return;
    }

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editIsAdmin').checked = user.admin;
    document.getElementById('editUserError').value = '';
    document.getElementById('editUserSuccess').value = '';
}

async function reloadUsers(e) {
    if (!defaultUsersRow) defaultUsersRow = usersTable.innerHTML

    const users = await createTable('/api/admin/users', user => `
        <tr class = "table-data" onclick="startEditUser(${user.id})">
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.admin ? 'Yes' : 'No'}</td>
            <td>
                <button class="btn" onclick="startEditUser(${user.id})">Edit</button>
                <button class="btn" onclick="deleteUser(${user.id})">Delete</button>
            </td>
        </tr>
    `, "usersList", e instanceof MouseEvent ? g.FORCE_CACHE : g.DEFAULT_CACHE);

    usersTable.innerHTML = users ? users : defaultUsersRow;
}

async function updateUser() {
    const id = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value;
    const admin = document.getElementById('editIsAdmin').checked;

    const resp = await post(`/api/admin/user/${id}/rename`, { new_name: username, admin: admin });

    if (!resp || !resp.success) {
        document.getElementById('editUserError').textContent = resp?.message || 'Update failed';
    } else {
        modifyData("usersList", e => {
            // noinspection EqualityComparisonWithCoercionJS id is a goddamn str
            return e.id == id;
        }, e => {
            e.username = username;
            e.admin = admin;
            return e;
        });
        document.getElementById('editUserSuccess').textContent = resp.message || 'User updated successfully';
        await reloadUsers(null);
    }
}

// makes the functions globally accessible
window.startEditUser = startEditUser;
window.deleteUser = deleteUser;

document.addEventListener('DOMContentLoaded', reloadUsers);
document.getElementById('reloadUsers').addEventListener('click', reloadUsers);
document.getElementById('editUserForm').addEventListener('submit', e => {
    e.preventDefault();
    updateUser().catch(console.error);
});
document.getElementById('loadUserForEdit').addEventListener('click', () => {
    startEditUser(document.getElementById('loadUserId').value);
});
