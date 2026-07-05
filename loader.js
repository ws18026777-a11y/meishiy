// ============================================================
// 卡密验证（GitHub 存储版）
// ============================================================

var KEYS_URL = 'https://raw.githubusercontent.com/ws18026777-a11y/meishiy/refs/heads/main/keys.json';

function getDeviceId() {
    if (typeof h5gg !== 'undefined') {
        if (h5gg.getDeviceUUID) {
            var uuid = h5gg.getDeviceUUID();
            if (uuid && uuid.length > 0) return uuid;
        }
        if (h5gg.deviceId) {
            var did = h5gg.deviceId;
            if (did && did.length > 0) return did;
        }
    }
    var id = localStorage.getItem('device_id');
    if (!id) {
        id = 'DEV_' + Math.random().toString(36).substr(2, 10).toUpperCase();
        localStorage.setItem('device_id', id);
    }
    return id;
}

function checkLocalAuth() {
    var auth = localStorage.getItem('auth_info');
    if (!auth) return false;
    try {
        var data = JSON.parse(auth);
        if (data.expire === '永久') return true;
        var now = new Date();
        var expire = new Date(data.expire);
        return expire >= now;
    } catch(e) {
        return false;
    }
}

function verifyCard(cardId) {
    return new Promise(function(resolve, reject) {
        fetch(KEYS_URL + '?_=' + Date.now())
            .then(function(response) { 
                if (!response.ok) throw new Error('网络错误');
                return response.json(); 
            })
            .then(function(data) {
                var found = false;
                var expire = '';
                var type = '';
                var deviceId = getDeviceId();
                
                for (var i = 0; i < data.keys.length; i++) {
                    if (data.keys[i].password === cardId) {
                        found = true;
                        expire = data.keys[i].expire;
                        type = data.keys[i].type;
                        break;
                    }
                }
                
                if (!found) {
                    resolve({ success: false, msg: '卡密无效' });
                    return;
                }
                
                if (expire !== '永久') {
                    var today = new Date();
                    var expireDate = new Date(expire);
                    if (expireDate < today) {
                        resolve({ success: false, msg: '卡密已过期 (到期: ' + expire + ')' });
                        return;
                    }
                }
                
                localStorage.setItem('auth_info', JSON.stringify({
                    type: type,
                    expire: expire,
                    device: deviceId,
                    card: cardId
                }));
                
                resolve({ success: true, msg: '验证成功', type: type, expire: expire });
            })
            .catch(function(error) {
                resolve({ success: false, msg: '加载失败: ' + error.message });
            });
    });
}

function showLogin() {
    var old = document.getElementById('authOverlay');
    if (old) old.remove();
    
    var overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:white;font-family:system-ui;';
    
    overlay.innerHTML = `
        <div style="background:rgba(255,255,255,0.05);padding:30px;border-radius:16px;border:1px solid #333;text-align:center;max-width:380px;width:90%;">
            <h3 style="color:#90EE90;margin-bottom:6px;">🔐 美式释意</h3>
            <p style="color:#888;font-size:13px;margin-bottom:16px;">请输入卡密验证</p>
            <input type="text" id="loginCardInput" placeholder="请输入卡密" style="width:100%;padding:12px;border-radius:30px;border:2px solid #90EE90;background:#111;color:#fff;font-size:16px;text-align:center;outline:none;">
            <div id="loginError" style="color:#ff6b6b;font-size:13px;margin-top:8px;display:none;"></div>
            <button id="loginBtn" style="width:100%;padding:12px;margin-top:12px;border-radius:30px;border:none;background:#90EE90;font-weight:bold;font-size:16px;cursor:pointer;color:#000;">立即激活</button>
            <div style="font-size:11px;color:#444;margin-top:10px;">设备ID: <span id="deviceDisplay" style="color:#666;font-family:monospace;"></span></div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    document.getElementById('deviceDisplay').textContent = getDeviceId();
    
    document.getElementById('loginBtn').onclick = function() {
        var input = document.getElementById('loginCardInput');
        var error = document.getElementById('loginError');
        var card = input.value.trim();
        
        if (!card) {
            error.textContent = '请输入卡密';
            error.style.display = 'block';
            return;
        }
        
        error.style.display = 'none';
        var btn = document.getElementById('loginBtn');
        btn.textContent = '验证中...';
        btn.disabled = true;
        
        verifyCard(card).then(function(result) {
            if (result.success) {
                alert('✅ ' + result.msg + '\n类型: ' + result.type + '\n到期: ' + result.expire);
                var overlay = document.getElementById('authOverlay');
                if (overlay) overlay.remove();
                if (typeof init === 'function') {
                    init();
                }
            } else {
                error.textContent = '❌ ' + result.msg;
                error.style.display = 'block';
                btn.textContent = '立即激活';
                btn.disabled = false;
            }
        });
    };
    
    document.getElementById('loginCardInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
}

if (checkLocalAuth()) {
    if (typeof init === 'function') {
        init();
    }
} else {
    showLogin();
}