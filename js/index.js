// 分类型存储弹窗（各最多2个）
const alertLimits = { success: 2, error: 2 }; // 绿色/红色各最多2个
const alertGroups = { success: [], error: [] }; // 存储对应类型弹窗

function showAlert(message, type) {
    const group = alertGroups[type];
    const limit = alertLimits[type];

    // 1. 如果已达上限，移除最早的弹窗
    if (group.length >= limit) {
        const oldestAlert = group[0];
        // 手动触发旧弹窗消失（不等待自动消失）
        oldestAlert.classList.remove('show');
        oldestAlert.classList.add('hide');
        setTimeout(() => {
            oldestAlert.remove();
            // 从数组中删除
            alertGroups[type] = group.filter(item => item !== oldestAlert);
        }, 0); // 等待淡出动画完成
    }

    // 2. 创建新弹窗
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.dataset.type = type;

    // 3. 找/创建容器
    let container = document.querySelector('.alert-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'alert-container';
        document.body.appendChild(container);
    }

    // 4. 加到容器顶部（新弹窗在上）
    container.insertBefore(alert, container.firstChild);
    group.unshift(alert); // 加到数组开头（保持最新的在最前）

    // 5. 触发淡入动画
    setTimeout(() => {
        alert.classList.add('show');
    }, 10);

    // 6. 3秒后自动消失
    const hideDelay = 2000;
    const leaveAnimDuration = 300;
    alert.hideTimer = setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('hide');

        setTimeout(() => {
            alert.remove();
            // 从数组中删除
            alertGroups[type] = group.filter(item => item !== alert);
        }, leaveAnimDuration);
    }, hideDelay);
}

// 以下是原有设备控制功能（未修改）
const BASE_URL = 'https://api-iot.datao2233.top';

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
            
            onlineStatus.textContent = data.online ? '在线' : '离线';
            onlineStatus.className = data.online ? 'status-value online' : 'status-value offline';
            
            if (!data.online) {
                powerStatus.textContent = '未知';
                powerStatus.className = 'status-value unknown';
            } else {
                powerStatus.textContent = data.power === 'on' ? '开启' : '关闭';
                powerStatus.className = data.power === 'on' ? 'status-value on' : 'status-value off';
            }
            
            updateConnectionStatus(data.online);
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
            
            showAlert('状态更新成功', 'success');
        } else {
            throw new Error('无效的响应数据');
        }
    } catch (error) {
        console.error('获取状态失败:', error);
        showAlert('获取状态失败: ' + error.message, 'error');
        document.getElementById('powerStatus').textContent = '未知';
        document.getElementById('powerStatus').className = 'status-value unknown';
        updateConnectionStatus(false);
    } finally {
        statusBtn.innerHTML = originalText;
        statusBtn.disabled = false;
    }
}

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
        
        const md5Key = md5(key);
        const response = await fetch(`${BASE_URL}/?action=${action}&key=${encodeURIComponent(md5Key)}`);
        const data = await response.json();
        
        if (data.msg === 'OK') {
            showAlert(`操作执行成功: ${getActionName(action)}`, 'success');
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

function getActionName(action) {
    const actions = {
        'on': '开启设备',
        'off': '关闭设备',
        'reboot': '重启设备',
        'compulsion': '强制关闭',
    };
    return actions[action] || action;
}

window.onload = function() {
    getStatus();
};
