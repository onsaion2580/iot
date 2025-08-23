// 基础URL - 根据实际部署情况可能需要调整
const BASE_URL = 'https://api-iot.datao2233.top'; // 如果与Worker同一域名，可以留空

// 显示提示信息
function showAlert(message, type) {
    const alert = document.getElementById(type + 'Alert');
    alert.textContent = message;
    alert.style.display = 'block';
    
    // 5秒后自动隐藏
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// 更新连接状态显示
function updateConnectionStatus(online) {
    const connectionIndicator = document.getElementById('connectionIndicator');
    const connectionText = document.getElementById('connectionText');
    
    if (connectionIndicator && connectionText) {
        if (online) {
            connectionIndicator.className = 'status-indicator online';
            connectionText.textContent = '已连接设备';
        } else {
            connectionIndicator.className = 'status-indicator offline';
            connectionText.textContent = '无法连接设备';
        }
    }
}

// 获取设备状态
async function getStatus() {
    const statusBtn = document.querySelector('.btn-primary');
    const originalText = statusBtn.innerHTML;
    
    try {
        statusBtn.innerHTML = '<span class="loading"></span> 获取中...';
        statusBtn.disabled = true;
        
        const response = await fetch(`${BASE_URL}/?action=status`);
        const data = await response.json();
        
        if (data && typeof data.online !== 'undefined') {
            const onlineStatus = document.getElementById('onlineStatus');
            const powerStatus = document.getElementById('powerStatus');
            
            // 更新在线状态
            onlineStatus.textContent = data.online ? '在线' : '离线';
            onlineStatus.className = data.online ? 'status-value online' : 'status-value offline';
            
            // 根据API响应格式更新电源状态
            // 注意：power字段是字符串"on"或"off"，不是布尔值
            if (!data.online) {
                // 设备离线时，电源状态显示为未知
                powerStatus.textContent = '未知';
                powerStatus.className = 'status-value unknown';
            } else {
                // 设备在线时，显示实际的电源状态
                powerStatus.textContent = data.power === 'on' ? '开启' : '关闭';
                powerStatus.className = data.power === 'on' ? 'status-value on' : 'status-value off';
            }
            
            // 更新连接状态显示
            updateConnectionStatus(data.online);
            
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
            
            showAlert('状态更新成功', 'success');
        } else {
            throw new Error('无效的响应数据');
        }
    } catch (error) {
        console.error('获取状态失败:', error);
        showAlert('获取状态失败: ' + error.message, 'error');
        
        // 出错时设置状态为未知
        document.getElementById('powerStatus').textContent = '未知';
        document.getElementById('powerStatus').className = 'status-value unknown';
        
        // 出错时显示无法连接设备
        updateConnectionStatus(false);
    } finally {
        statusBtn.innerHTML = originalText;
        statusBtn.disabled = false;
    }
}

// 控制设备
async function controlDevice(action) {
    const key = document.getElementById('keyInput').value;
    if (!key) {
        showAlert('请输入密码', 'error');
        return;
    }
    
    let buttons;
    try {
        buttons = document.querySelectorAll('.controls button');
        buttons.forEach(btn => btn.disabled = true);
        
        // 将密码转换为MD5
        const md5Key = md5(key);
        
        const response = await fetch(`${BASE_URL}/?action=${action}&key=${encodeURIComponent(md5Key)}`);
        const data = await response.json();
        
        if (data.msg === 'OK') {
            showAlert(`操作执行成功: ${getActionName(action)}`, 'success');
            // 更新状态
            setTimeout(getStatus, 3000);
        } else {
            throw new Error(data.msg || '操作执行失败');
        }
    } catch (error) {
        console.error('操作执行失败:', error);
        showAlert('操作执行失败: ' + error.message, 'error');
    } finally {
        if (buttons) {
            buttons.forEach(btn => btn.disabled = false);
        }
    }
}

// 获取操作名称
function getActionName(action) {
    const actions = {
        'on': '开启设备',
        'off': '关闭设备',
        'reboot': '重启设备',
        'compulsion': '强制关闭',
    };
    return actions[action] || action;
}

// 页面加载时获取初始状态
window.onload = function() {
    getStatus();
};