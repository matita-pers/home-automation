import { put } from '/js/utils.js'
import * as t from '/js/users/table.js'
import * as g from "/js/config.js"

const usersTable = document.getElementById('usersList');

function deleteUser(user) {
    if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
        alert("Unimplemented, use the db genius") //TODO
    }
}

function startEditUser(user) {
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    document.getElementById('editIsAdmin').checked = user.admin;
    document.getElementById('editUserError').value = '';
    document.getElementById('editUserSuccess').value = '';
}

function reloadUsers(e) {
    t.createTable(usersTable, '/api/admin/users', user => `
        <tr class = "table-data">
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.admin ? 'Yes' : 'No'}</td>
            <td id="btn-col"></td>
        </tr>
    `, { key: "usersList", time: e instanceof MouseEvent ? g.FORCE_CACHE : g.DEFAULT_CACHE },
        t.compoundCallback(t.rowClickCallback(startEditUser),
            t.createAddButtonsCallback(
                { fn: startEditUser, name: "Edit" },
                { fn: deleteUser, name: "Delete" },
            )
        ),
    ).catch(console.error);
}

async function updateUser() {
    const id = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value;
    const admin = document.getElementById('editIsAdmin').checked;

    const resp = await put(`/api/admin/user/${id}/edit`, { new_name: username, admin: admin });

    if (!resp || !resp.success) {
        document.getElementById('editUserError').textContent = resp?.message || 'Update failed';
    } else {
        t.modifyData("usersList", e => {
            // noinspection EqualityComparisonWithCoercionJS id is a goddamn str
            return e.id == id;
        }, e => {
            e.username = username;
            e.admin = admin;
            return e;
        });
        document.getElementById('editUserSuccess').textContent = resp.message || 'User updated successfully';
        reloadUsers(null);
    }
}

document.addEventListener('DOMContentLoaded', reloadUsers);
document.getElementById('reloadUsers').addEventListener('click', reloadUsers);
document.getElementById('editUserForm').addEventListener('submit', e => {
    e.preventDefault();
    updateUser().catch(console.error);
});
