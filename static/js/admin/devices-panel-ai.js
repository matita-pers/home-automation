document.addEventListener('DOMContentLoaded', async function() {
    loadDevices();
    loadGlobalAccess();
    
    // Add device form
    document.getElementById('addDeviceForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const deviceId = document.getElementById('deviceDeviceId').value;
        const name = document.getElementById('deviceName').value;
        
        const result = await addDevice(deviceId, name);
        if (result.success) {
            document.getElementById('addDeviceSuccess').textContent = 'Device added successfully';
            document.getElementById('addDeviceError').textContent = '';
            document.getElementById('addDeviceForm').reset();
            loadDevices();
        } else {
            document.getElementById('addDeviceError').textContent = result.message || 'Failed to add device';
            document.getElementById('addDeviceSuccess').textContent = '';
        }
    });
    
    // Add sensor form
    document.getElementById('addSensorForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const deviceId = document.getElementById('selectedDeviceId').value;
        const sensorId = document.getElementById('sensorId').value;
        const sensorName = document.getElementById('sensorName').value;
        
        const result = await addSensor(deviceId, sensorId, sensorName);
        if (result.success) {
            document.getElementById('addSensorSuccess').textContent = 'Sensor added successfully';
            document.getElementById('addSensorError').textContent = '';
            document.getElementById('addSensorForm').reset();
            loadDeviceDetails();
        } else {
            document.getElementById('addSensorError').textContent = result.message || 'Failed to add sensor';
            document.getElementById('addSensorSuccess').textContent = '';
        }
    });
    
    // Add token form
    document.getElementById('addTokenForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const deviceId = document.getElementById('selectedDeviceId').value;
        const token = document.getElementById('tokenValue').value;
        
        const result = await addDeviceToken(deviceId, token);
        if (result.success) {
            document.getElementById('addTokenSuccess').textContent = 'Token added successfully';
            document.getElementById('addTokenError').textContent = '';
            document.getElementById('addTokenForm').reset();
            loadDeviceDetails();
        } else {
            document.getElementById('addTokenError').textContent = result.message || 'Failed to add token';
            document.getElementById('addTokenSuccess').textContent = '';
        }
    });
    
    // Add access form
    document.getElementById('addAccessForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const deviceId = document.getElementById('selectedDeviceId').value;
        const token = document.getElementById('accessToken').value;
        const accessDeviceId = document.getElementById('accessDeviceId').value;
        
        const result = await addDeviceAccess(deviceId, token, accessDeviceId);
        if (result.success) {
            document.getElementById('addAccessSuccess').textContent = 'Access added successfully';
            document.getElementById('addAccessError').textContent = '';
            document.getElementById('addAccessForm').reset();
            loadDeviceDetails();
        } else {
            document.getElementById('addAccessError').textContent = result.message || 'Failed to add access';
            document.getElementById('addAccessSuccess').textContent = '';
        }
    });
    
    // Add global access form
    document.getElementById('addGlobalAccessForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const deviceLogin = document.getElementById('globalDeviceLogin').value;
        const token = document.getElementById('globalToken').value;
        const deviceAccess = document.getElementById('globalDeviceAccess').value;
        
        const result = await addGlobalDeviceAccess(deviceLogin, token, deviceAccess);
        if (result.success) {
            document.getElementById('addGlobalAccessSuccess').textContent = 'Global access added successfully';
            document.getElementById('addGlobalAccessError').textContent = '';
            document.getElementById('addGlobalAccessForm').reset();
            loadGlobalAccess();
        } else {
            document.getElementById('addGlobalAccessError').textContent = result.message || 'Failed to add global access';
            document.getElementById('addGlobalAccessSuccess').textContent = '';
        }
    });
});

async function loadDevices() {
    try {
        const response = await fetch('/api/admin/devices/list');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                displayDevices(data);
            }
        }
    } catch (error) {
        console.error('Error loading devices:', error);
        document.getElementById('devicesList').innerHTML = '<p class="error-message">Failed to load devices</p>';
    }
}

function displayDevices(devices) {
    const devicesList = document.getElementById('devicesList');
    if (devices.length === 0) {
        devicesList.innerHTML = '<p>No devices found</p>';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">';
    html += '<thead><tr style="background: #f5f5f5;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Device ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Device Name</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Actions</th></tr></thead>';
    html += '<tbody>';
    
    devices.forEach(device => {
        html += `<tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${device.id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${device.device_id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${device.device_name}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">
                <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin: 0;" onclick="selectDevice(${device.id})">Manage</button>
            </td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    devicesList.innerHTML = html;
}

function selectDevice(deviceId) {
    document.getElementById('selectedDeviceId').value = deviceId;
    document.getElementById('deviceDetailsSection').style.display = 'block';
    loadDeviceDetails();
}

async function loadDeviceDetails() {
    const deviceId = document.getElementById('selectedDeviceId').value;
    if (!deviceId) {
        document.getElementById('deviceInfo').innerHTML = '<p class="error-message">Please select a device</p>';
        return;
    }
    
    // Load sensors, tokens, and access
    await Promise.all([
        loadSensors(deviceId),
        loadTokens(deviceId),
        loadAccess(deviceId)
    ]);
    
    document.getElementById('deviceInfo').innerHTML = `<p>Managing Device ID: ${deviceId}</p>`;
}

async function loadSensors(deviceId) {
    try {
        const response = await fetch(`/api/admin/device/${deviceId}/sensors/list`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                displaySensors(data, deviceId);
            }
        }
    } catch (error) {
        console.error('Error loading sensors:', error);
        document.getElementById('sensorsList').innerHTML = '<p class="error-message">Failed to load sensors</p>';
    }
}

function displaySensors(sensors, deviceId) {
    const sensorsList = document.getElementById('sensorsList');
    if (sensors.length === 0) {
        sensorsList.innerHTML = '<p>No sensors found</p>';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">';
    html += '<thead><tr style="background: #f5f5f5;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Sensor ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Sensor Name</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Actions</th></tr></thead>';
    html += '<tbody>';
    
    sensors.forEach(sensor => {
        html += `<tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${sensor.id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${sensor.sensor_id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${sensor.sensor_name}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">
                <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin: 0; background-color: #f44336;" onclick="removeSensor(${deviceId}, ${sensor.id})">Remove</button>
            </td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    sensorsList.innerHTML = html;
}

async function loadTokens(deviceId) {
    try {
        const response = await fetch(`/api/admin/device/${deviceId}/tokens`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                displayTokens(data, deviceId);
            }
        }
    } catch (error) {
        console.error('Error loading tokens:', error);
        document.getElementById('tokensList').innerHTML = '<p class="error-message">Failed to load tokens</p>';
    }
}

function displayTokens(tokens, deviceId) {
    const tokensList = document.getElementById('tokensList');
    if (tokens.length === 0) {
        tokensList.innerHTML = '<p>No tokens found</p>';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">';
    html += '<thead><tr style="background: #f5f5f5;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Token</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Actions</th></tr></thead>';
    html += '<tbody>';
    
    tokens.forEach(token => {
        html += `<tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${token.id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${token.token}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">
                <button class="btn" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin: 0; background-color: #f44336;" onclick="revokeToken(${deviceId}, '${token.token}')">Revoke</button>
            </td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    tokensList.innerHTML = html;
}

async function loadAccess(deviceId) {
    try {
        const response = await fetch(`/api/admin/device/${deviceId}/access`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                displayAccess(data);
            }
        }
    } catch (error) {
        console.error('Error loading access:', error);
        document.getElementById('accessList').innerHTML = '<p class="error-message">Failed to load access</p>';
    }
}

function displayAccess(accessList) {
    const accessListEl = document.getElementById('accessList');
    if (accessList.length === 0) {
        accessListEl.innerHTML = '<p>No access rules found</p>';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">';
    html += '<thead><tr style="background: #f5f5f5;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Device ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Token</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Device</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Auth Device</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Auth Device ID</th></tr></thead>';
    html += '<tbody>';
    
    accessList.forEach(access => {
        html += `<tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.device_id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.token}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.device}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.auth_device}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.auth_device_id}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    accessListEl.innerHTML = html;
}

async function loadGlobalAccess() {
    try {
        const response = await fetch('/api/admin/devices/access');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                displayGlobalAccess(data);
            }
        }
    } catch (error) {
        console.error('Error loading global access:', error);
        document.getElementById('globalAccessList').innerHTML = '<p class="error-message">Failed to load global access</p>';
    }
}

function displayGlobalAccess(accessList) {
    const globalAccessList = document.getElementById('globalAccessList');
    if (accessList.length === 0) {
        globalAccessList.innerHTML = '<p>No global access rules found</p>';
        return;
    }
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">';
    html += '<thead><tr style="background: #f5f5f5;"><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Device ID</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Token</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Device</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Auth Device</th><th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Auth Device ID</th></tr></thead>';
    html += '<tbody>';
    
    accessList.forEach(access => {
        html += `<tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.device_id}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.token}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.device}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.auth_device}</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">${access.auth_device_id}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    globalAccessList.innerHTML = html;
}

async function addDevice(deviceId, name) {
    try {
        const response = await fetch('/api/admin/devices/add', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                device_id: deviceId,
                name: name
            })
        });

        const data = await response.json();
        
        if (data.success || data.success === 'true') {
            return { success: true, message: 'Device added successfully' };
        } else {
            return { success: false, message: data.message || 'Failed to add device' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}

async function addSensor(deviceId, sensorId, sensorName) {
    try {
        const response = await fetch(`/api/admin/device/${deviceId}/sensors/add`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                sensor_id: sensorId,
                name: sensorName
            })
        });

        const data = await response.json();
        
        if (data.success || data.success === 'true') {
            return { success: true, message: 'Sensor added successfully' };
        } else {
            return { success: false, message: data.message || 'Failed to add sensor' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}

async function removeSensor(deviceId, sensorId) {
    if (!confirm('Are you sure you want to remove this sensor?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/device/${deviceId}/sensor/${sensorId}/remove`, {
            method: 'PUT'
        });

        const data = await response.json();
        
        if (data.success) {
            loadDeviceDetails();
        } else {
            alert('Failed to remove sensor: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        alert('Network error: ' + error.message);
    }
}

async function addDeviceToken(deviceId, token) {
    try {
        const response = await fetch(`/api/admin/device/${deviceId}/token/add`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                token: token
            })
        });

        const data = await response.json();
        
        if (data.success) {
            return { success: true, message: 'Token added successfully' };
        } else {
            return { success: false, message: data.message || 'Failed to add token' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}

async function revokeToken(deviceId, token) {
    if (!confirm('Are you sure you want to revoke this token?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/device/${deviceId}/token/revoke`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                token: token
            })
        });

        const data = await response.json();
        
        if (data.success) {
            loadDeviceDetails();
        } else {
            alert('Failed to revoke token: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        alert('Network error: ' + error.message);
    }
}

async function addDeviceAccess(deviceId, token, accessDeviceId) {
    try {
        const response = await fetch(`/api/admin/device/${deviceId}/access/add`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                token: token,
                device_id: accessDeviceId
            })
        });

        const data = await response.json();
        
        if (data.success || data.success === 'true') {
            return { success: true, message: 'Access added successfully' };
        } else {
            return { success: false, message: data.message || 'Failed to add access' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}

async function addGlobalDeviceAccess(deviceLogin, token, deviceAccess) {
    try {
        const response = await fetch('/api/admin/devices/access/add', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                device_login: deviceLogin,
                token: token,
                device_access: deviceAccess
            })
        });

        const data = await response.json();
        
        if (data.success || data.success === 'true') {
            return { success: true, message: 'Global access added successfully' };
        } else {
            return { success: false, message: data.message || 'Failed to add global access' };
        }
    } catch (error) {
        return { success: false, message: 'Network error: ' + error.message };
    }
}

function switchTab(tabName) {
    // Hide all tabs
    document.getElementById('sensorsTab').style.display = 'none';
    document.getElementById('tokensTab').style.display = 'none';
    document.getElementById('accessTab').style.display = 'none';
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab and add active class
    document.getElementById(tabName + 'Tab').style.display = 'block';
    event.target.classList.add('active');
}
