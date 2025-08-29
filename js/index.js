// 弹窗配置：红（error）/绿（success）各仅1个，完全隔离
const alertConfig = {
    success: { limit: 1, group: [] }, // 绿色弹窗：最多1个，独立数组
    error: { limit: 1, group: [] }    // 红色弹窗：最多1个，独立数组
};

/**
 * 显示弹窗（修复版）
 * @param {string} message - 弹窗内容
 * @param {string} type - 弹窗类型（success/error）
 */
function showAlert(message, type) {
    // 1. 校验类型合法性，默认error
    const config = alertConfig[type] || alertConfig.error;
    const { limit, group } = config;

    // 2. 过滤重复弹窗：同一类型+同一内容，短时间内不重复显示
    const isDuplicate = group.some(alert => alert.textContent === message);
    if (isDuplicate) return;

    // 3. 超出数量限制：先移除当前类型的旧弹窗（无论是否在动画中）
    if (group.length >= limit) {
        const oldAlert = group[0];
        // 先从数组中删除（关键：确保新弹窗创建时数量判断准确）
        config.group = group.filter(alert => alert !== oldAlert);
        // 触发旧弹窗淡出动画
        oldAlert.classList.remove('show');
        oldAlert.classList.add('hide');
        // 动画结束后删除DOM
        setTimeout(() => oldAlert.remove(), 300);
    }

    // 4. 创建新弹窗
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    // 存储弹窗创建时间（用于后续重复判断）
    alert.dataset.createTime = Date.now();

    // 5. 获取/创建弹窗容器
    let container = document.querySelector('.alert-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'alert-container';
        document.body.appendChild(container);
    }

    // 6. 添加到容器（新弹窗在最顶部）和数组
    container.insertBefore(alert, container.firstChild);
    config.group.push(alert);

    // 7. 触发淡入动画（延迟10ms确保DOM渲染完成）
    setTimeout(() => alert.classList.add('show'), 10);

    // 8. 自动消失：2秒后淡出，结束后清理数组和DOM
    const autoHideDelay = 2000; // 弹窗显示时长
    alert.hideTimer = setTimeout(() => {
        alert.classList.remove('show');
        alert.classList.add('hide');
        // 动画结束后清理
        setTimeout(() => {
            alert.remove();
            // 从数组中删除当前弹窗
            config.group = config.group.filter(item => item !== alert);
        }, 300);
    }, autoHideDelay);
}

// 更新颜色点状态+悬停提示
function updateConnectionStatus(online) {
    const connectionIndicator = document.getElementById('connectionIndicator');
    if (connectionIndicator) {
        if (online) {
            connectionIndicator.className = 'status-indicator online';
            connectionIndicator.setAttribute('title', '在线');
        } else {
            connectionIndicator.className = 'status-indicator offline';
            connectionIndicator.setAttribute('title', '离线');
        }
    }
}

// 设备选择器变化时的处理函数
function handleDeviceChange() {
    const deviceSelector = document.getElementById('deviceSelector');
    const selectedDevice = deviceSelector.options[deviceSelector.selectedIndex].text;
    
    // 显示切换提示
    showAlert(`已切换至 ${selectedDevice}`, 'success');
    
    // 重置状态显示
    document.getElementById('powerStatus').textContent = '检查中...';
    document.getElementById('powerStatus').className = 'status-value unknown';
    document.getElementById('lastUpdate').textContent = '-';
    
    // 更新指示器为检查中状态
    const connectionIndicator = document.getElementById('connectionIndicator');
    connectionIndicator.className = 'status-indicator status';
    connectionIndicator.setAttribute('title', '检查中...');
    
    // 延迟获取新设备状态，模拟加载过程
    setTimeout(getStatus, 800);
}

// 初始化设备选择器事件监听
function initDeviceSelector() {
    const deviceSelector = document.getElementById('deviceSelector');
    deviceSelector.addEventListener('change', handleDeviceChange);
}

// API基础地址
const BASE_URL = 'https://api-iot.datao2233.top';

// 获取设备状态
async function getStatus() {
    const statusBtn = document.querySelector('.btn-primary');
    const originalText = statusBtn.innerHTML;
    const selectedDeviceId = document.getElementById('deviceSelector').value;
    
    try {
        statusBtn.innerHTML = '<span class="loading"></span> 获取中...';
        statusBtn.disabled = true;
        
        // 发送请求时带上选中的设备ID
        const response = await fetch(`${BASE_URL}/?action=status&device=${selectedDeviceId}`);
        const data = await response.json();
        
        if (data && typeof data.online !== 'undefined') {
            const powerStatus = document.getElementById('powerStatus');
            
            updateConnectionStatus(data.online);
            
            if (!data.online) {
                powerStatus.textContent = '未知';
                powerStatus.className = 'status-value unknown';
            } else {
                powerStatus.textContent = data.power === 'on' ? '开启' : '关闭';
                powerStatus.className = data.power === 'on' ? 'status-value on' : 'status-value off';
            }
            
            document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
            showAlert('状态更新成功', 'success'); // 绿色弹窗
        } else {
            throw new Error('无效的响应数据');
        }
    } catch (error) {
        console.error('获取状态失败:', error);
        showAlert('获取状态失败: ' + error.message, 'error'); // 红色弹窗
        
        const powerStatus = document.getElementById('powerStatus');
        updateConnectionStatus(false);
        powerStatus.textContent = '未知';
        powerStatus.className = 'status-value unknown';
    } finally {
        statusBtn.innerHTML = originalText;
        statusBtn.disabled = false;
    }
}

// 设备控制
async function controlDevice(action) {
    const key = document.getElementById('keyInput').value;
    const selectedDeviceId = document.getElementById('deviceSelector').value;
    
    if (!key) {
        showAlert('请输入密码', 'error'); // 红色弹窗
        return;
    }
    
    let buttons;
    try {
        buttons = document.querySelectorAll('.controls button');
        buttons.forEach(btn => btn.disabled = true);
        
        const md5Key = md5(key);
        // 控制请求带上设备ID
        const response = await fetch(`${BASE_URL}/?action=${action}&key=${encodeURIComponent(md5Key)}&device=${selectedDeviceId}`);
        const data = await response.json();
        
        if (data.msg === 'OK') {
            showAlert(`操作执行成功: ${getActionName(action)}`, 'success'); // 绿色弹窗
            setTimeout(getStatus, 3000);
        } else {
            throw new Error(data.msg || '操作执行失败');
        }
    } catch (error) {
        console.error('操作执行失败:', error);
        showAlert('操作执行失败: ' + error.message, 'error'); // 红色弹窗
    } finally {
        if (buttons) {
            buttons.forEach(btn => btn.disabled = false);
        }
    }
}

// 操作名称映射
function getActionName(action) {
    const actions = {
        'on': '开启设备',
        'off': '关闭设备',
        'reboot': '重启设备',
        'compulsion': '强制关闭',
    };
    return actions[action] || action;
}

// 页面加载初始化
window.onload = function() {
    initDeviceSelector(); // 初始化设备选择器
    getStatus();
};
