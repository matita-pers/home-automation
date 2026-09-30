import { put } from '/js/utils.js'
import * as t from '/js/users/table.js'
import * as g from "/js/config.js"

const devicesTable = document.getElementById('devicesList');
const sensorsTable = document.getElementById('sensorsList');
const deviceEditForm = document.getElementById('editDeviceForm');
const sensorEditForm = document.getElementById('editSensorForm');

function del(user) {
    if (confirm(`Are you sure you want to delete ${user}?`)) {
        alert("Unimplemented, use the db genius") //TODO
    }
}

function manageDevice(device) {
    if (!device) return;

    editDevice(device);
    loadSensors(device.id);
}

function editDevice(device) {
    if (!device) return;

    deviceEditForm.querySelector('#editInternalId').value = device.id;
    deviceEditForm.querySelector('#editDeviceId').value = device.device_id;
    deviceEditForm.querySelector('#editName').value = device.device_name;
    deviceEditForm.querySelector('#editDeviceError').value = '';
    deviceEditForm.querySelector('#editDeviceSuccess').value = '';
}

function reloadDevices(e) {
    t.createTable(devicesTable, '/api/admin/devices/list', d => `
        <tr class = "table-data">
            <td>${d.id}</td>
            <td>${d.device_id}</td>
            <td>${d.device_name}</td>
            <td id="btn-col"></td>
        </tr>
    `, { key: "devicesList", time: e instanceof MouseEvent ? g.FORCE_CACHE : g.DEFAULT_CACHE },
        t.compoundCallback(t.rowClickCallback(manageDevice),
            t.createAddButtonsCallback(
                { fn: editDevice, name: "Edit" },
                { fn: del, name: "Delete" },
            )
        ),
    ).catch(console.error);
}
document.addEventListener('DOMContentLoaded', reloadDevices);
document.getElementById('reloadDevices').addEventListener('click', reloadDevices);

async function updateDevice() {
    const id = sensorEditForm.querySelector('#editInternalId').value;
    const device_id = sensorEditForm.querySelector('#editDeviceId').value;
    const name = sensorEditForm.querySelector('#editName').value;

    const resp = await put(`/api/admin/devices/${id}/edit`, { device_id: device_id, device_name: name });
    console.log(resp)

    if (!resp || !resp.success) {
        deviceEditForm.querySelector('#editDeviceSuccess').value = '';
        deviceEditForm.querySelector('#editDeviceError').value = (resp?.message || 'Update failed') + '\ncode: ' + resp?.error_code || 'ukn';
    } else {
        t.modifyData("deviceList", e => {
            // noinspection EqualityComparisonWithCoercionJS id is a goddamn str
            return e.id == id;
        }, e => {
            e.device_id = device_id;
            e.device_name = name;
            return e;
        });
        deviceEditForm.querySelector('#editDeviceError').value = '';
        deviceEditForm.querySelector('#editDeviceSuccess').value = resp.message || 'Device updated successfully';
        reloadDevices(null);
    }
}
deviceEditForm.addEventListener('submit', e => {
    e.preventDefault();
    updateDevice().catch(console.error);
});

let _lastDeviceIDForSensor = -1;
function loadSensors(deviceId = _lastDeviceIDForSensor, force = false) {
    if (deviceId < 0) return;
    _lastDeviceIDForSensor = deviceId;

    t.createTable(sensorsTable, `/api/admin/device/${deviceId}/sensors/list`, s => `
        <tr class = "table-data">
            <td>${s.id}</td>
            <td>${s.sensor_id}</td>
            <td>${s.sensor_name}</td>
            <td id="btn-col"></td>
        </tr>
    `, { key: "sensorsList-" + deviceId, time: force ? g.FORCE_CACHE : g.DEFAULT_CACHE },
        t.compoundCallback(t.rowClickCallback(manageSensor),
            t.createAddButtonsCallback(
                { fn: manageSensor, name: "Edit" },
                { fn: deleteSensor, name: "Delete" },
            )
        ),
    ).catch(console.error);
}
document.getElementById('reloadSensors').addEventListener('click', e => loadSensors(_lastDeviceIDForSensor, true));

function manageSensor(sensor) {
    if (!sensor) return;

    sensorEditForm.querySelector('#editInternalId').value = sensor.id;
    sensorEditForm.querySelector('#editSensorId').value = sensor.sensor_id;
    sensorEditForm.querySelector('#editName').value = sensor.sensor_name;
    sensorEditForm.querySelector('#editSensorError').value = '';
    sensorEditForm.querySelector('#editSensorSuccess').value = '';
}

async function updateSensor() {
    const id = sensorEditForm.querySelector('#editInternalId').value;
    const sensor = sensorEditForm.querySelector('#editSensorId').value;
    const name = sensorEditForm.querySelector('#editName').value;

    const resp = await put(`/api/admin/device/${_lastDeviceIDForSensor}/sensor/${id}/edit`, { sensor_id: sensor, sensor_name: name });

    if (!resp || !resp.success) {
        sensorEditForm.querySelector('#editSensorSuccess').value = '';
        sensorEditForm.querySelector('#editSensorError').value = (resp?.message || 'Update failed') + '\ncode: ' + resp?.error_code || 'ukn';
    } else {
        t.modifyData("sensorsList-" + _lastDeviceIDForSensor, e => {
            // noinspection EqualityComparisonWithCoercionJS id is a goddamn str
            return e.id == id;
        }, e => {
            e.sensor_id = sensor;
            e.sensor_name = name;
            return e;
        });
        sensorEditForm.querySelector('#editSensorError').value = '';
        sensorEditForm.querySelector('#editSensorSuccess').value = resp.message || 'Device updated successfully';
        loadSensors();
    }
}
sensorEditForm.addEventListener('submit', e => {
    e.preventDefault();
    updateSensor().catch(console.error);
});

function deleteSensor(sensor) {
    console.log("Delete sensor", sensor);
}
