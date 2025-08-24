/**
 * IoT设备控制台JavaScript功能
 * 包含设备状态获取、设备控制和弹窗动画功能
 * 每个弹窗都有独立的动画控制，互不干扰
 */

// 基础URL - 根据实际部署情况可能需要调整
const BASE_URL = 'https://api-iot.datao2233.top';

/**
 * 显示提示信息 - 独立弹窗版本
 * 每个弹窗都有独立的定时器，互不干扰
 * @param {string} message - 要显示的消息内容
 * @param {string} type - 弹窗类型 ('success' 或 'error')
 */
function showAlert(message, type) {
    const alert = document.getElementById(type + 'Alert');
    
    // 先停止所有正在进行的动画
    alert.classList.remove('show', 'hide');
    
    // 设置消息内容
    alert.textContent = message;
    
    // 强制重排以触发动画
    void alert.offsetWidth;
    
    // 显示并添加动画类
    alert.style.display = 'block';
    alert.classList.add('show');
    
    // 为当前弹窗设置独立的定时器
    if (alert.timeoutId) {
        clearTimeout(alert.timeoutId);
    }
    
    // 5秒后自动隐藏当前弹窗
    alert.timeoutId = setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('hide');
        
        // 动画完成后完全隐藏当前弹窗
        setTimeout(() => {
            alert.style.display = 'none';
            alert.classList.remove('hide');
            alert.timeoutId = null;
        }, 500);
    }, 4500);
}

/**
 * 更新连接状态显示
 * @param {boolean} online - 设备是否在线
 */
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

/**
 * 获取设备状态
 * 从API获取设备状态并更新界面显示
 */
async function getStatus() {
    const statusBtn = document.querySelector('.btn-primary');
    const originalText = statusBtn.innerHTML;
    
    try {
        statusBtn.innerHTML = '<span class="loading"></span> 获取中...';
        statusBtn.disabled = true;
        
        const response = await fetch(`${BASE_URL}/?action=status`);
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && typeof data.online !== 'undefined') {
            const onlineStatus = document.getElementById('onlineStatus');
            const powerStatus = document.getElementById('powerStatus');
            
            // 更新在线状态
            onlineStatus.textContent = data.online ? '在线' : '离线';
            onlineStatus.className = data.online ? 'status-value online' : 'status-value offline';
            
            // 根据API响应格式更新电源状态
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

/**
 * 控制设备
 * 发送控制命令到API并处理响应
 * @param {string} action - 要执行的操作 ('on', 'off', 'reboot', 'compulsion')
 */
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
        
        if (!response.ok) {
            throw new Error(`HTTP错误! 状态码: ${response.status}`);
        }
        
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

/**
 * 获取操作名称
 * 将操作代码转换为中文名称
 * @param {string} action - 操作代码
 * @returns {string} 操作的中文名称
 */
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
