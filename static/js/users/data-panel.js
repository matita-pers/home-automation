import * as t from '/js/users/table.js'
import * as g from "/js/config.js"

const table = document.getElementById('dataList');

function reloadData(e) {
    t.createTable(table, '/api/user/data/all', d => `
        <tr class = "table-data">
            <td>${d.device}</td>
            <td>${d.sensor_name}</td>
            <td>${d.key}</td>
            <td>${d.value}</td>
            <td>${d.timestamp}</td>
            <td>${d.sent_at}</td>
            <td>${d.measured_at}</td>
        </tr>
    `, { key: "sensorDataList", time: e instanceof MouseEvent ? g.FORCE_CACHE : g.DEFAULT_CACHE },
    ).catch(console.error);
}
document.addEventListener('DOMContentLoaded', reloadData);
document.getElementById('reloadData').addEventListener('click', reloadData);
