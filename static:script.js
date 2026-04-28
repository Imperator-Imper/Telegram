let currentAccount = 1;
let currentPhone = "";
let currentChatId = null;
let darkMode = localStorage.getItem("darkMode") === "true";
let aiResponder = localStorage.getItem("aiResponder") === "true";
let offlineMode = localStorage.getItem("offlineMode") !== "false";

async function apiCall(endpoint, method = "GET", data = null) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (data) opts.body = JSON.stringify(data);
    const res = await fetch(endpoint, opts);
    return res.json();
}

function showToast(msg) {
    const t = document.getElementById("toastMsg");
    t.innerText = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2000);
}

// ========== ВХОД ==========
document.getElementById("loginBtn").onclick = async () => {
    currentAccount = parseInt(document.getElementById("accountSelect").value);
    currentPhone = document.getElementById("phoneInput").value;
    
    if (!currentPhone) {
        document.getElementById("loginStatus").innerText = "Введите номер телефона";
        return;
    }
    
    document.getElementById("loginStatus").innerHTML = "📡 Отправка запроса в Telegram...";
    
    const result = await apiCall("/api/request_code", "POST", { 
        account_id: currentAccount, 
        phone: currentPhone 
    });
    
    if (result.status === "success") {
        document.getElementById("codeSection").style.display = "block";
        document.getElementById("loginStatus").innerHTML = "✅ Код отправлен в Telegram. Если не приходит — нажмите «Отправить код через SMS»";
        document.getElementById("phoneInput").disabled = true;
    } else {
        document.getElementById("loginStatus").innerHTML = "❌ Ошибка: " + result.message;
    }
};

document.getElementById("smsCodeBtn").onclick = async () => {
    if (!currentPhone) return;
    
    document.getElementById("loginStatus").innerHTML = "📱 Отправка SMS с кодом...";
    
    const result = await apiCall("/api/request_sms", "POST", {
        account_id: currentAccount,
        phone: currentPhone
    });
    
    if (result.status === "success") {
        document.getElementById("loginStatus").innerHTML = "✅ SMS отправлена! Введите код из SMS";
    } else {
        document.getElementById("loginStatus").innerHTML = "❌ Ошибка SMS: " + result.message;
    }
};

document.getElementById("confirmCodeBtn").onclick = async () => {
    const code = document.getElementById("codeInput").value;
    if (!code) {
        document.getElementById("loginStatus").innerText = "Введите код";
        return;
    }
    
    document.getElementById("loginStatus").innerHTML = "🔐 Вход...";
    
    const result = await apiCall("/api/login", "POST", {
        account_id: currentAccount,
        phone: currentPhone,
        code: code
    });
    
    if (result.status === "success") {
        document.getElementById("loginPanel").style.display = "none";
        document.getElementById("mainUI").style.display = "flex";
        loadDialogs();
        showToast("Вход выполнен, статус офлайн");
    } else {
        document.getElementById("loginStatus").innerHTML = "❌ Ошибка: " + result.message;
    }
};

// ========== ЧАТЫ ==========
async function loadDialogs() {
    const data = await apiCall(`/api/dialogs?account_id=${currentAccount}`);
    if (data.dialogs) {
        const container = document.getElementById("chatsContainer");
        container.innerHTML = data.dialogs.map(d => `
            <div class="chat-item" data-chat-id="${d.id}">
                <div class="avatar">💬</div>
                <div class="chat-info">
                    <div class="chat-name">${d.name}</div>
                    <div class="chat-preview">${d.last_message || ""}</div>
                </div>
            </div>
        `).join("");
        document.querySelectorAll(".chat-item").forEach(el => {
            el.onclick = () => openChat(parseInt(el.dataset.chatId));
        });
    }
}

async function openChat(chatId) {
    currentChatId = chatId;
    document.getElementById("chatPanel").classList.add("open");
    const data = await apiCall(`/api/messages?account_id=${currentAccount}&chat_id=${chatId}`);
    if (data.messages) {
        const area = document.getElementById("messagesArea");
        area.innerHTML = data.messages.map(m => `
            <div class="message ${m.out ? "out" : "in"}">${m.text || "[медиа]"}</div>
        `).join("");
        area.scrollTop = area.scrollHeight;
    }
}

document.getElementById("sendMsgBtn").onclick = async () => {
    const text = document.getElementById("messageInput").value;
    if (!text || !currentChatId) return;
    await apiCall("/api/send", "POST", { account_id: currentAccount, chat_id: currentChatId, text });
    document.getElementById("messageInput").value = "";
    openChat(currentChatId);
};

// ========== НАСТРОЙКИ ==========
document.getElementById("settingsBtn").onclick = () => document.getElementById("settingsPanel").classList.add("open");
document.getElementById("closeSettingsBtn").onclick = () => document.getElementById("settingsPanel").classList.remove("open");
document.getElementById("closeChatBtn").onclick = () => document.getElementById("chatPanel").classList.remove("open");

document.getElementById("offlineToggle").onclick = async () => {
    const isActive = document.getElementById("offlineToggle").classList.toggle("active");
    await apiCall("/api/update_status", "POST", { account_id: currentAccount, offline: isActive });
    showToast(isActive ? "Офлайн-режим (невидимка)" : "Онлайн-режим");
};

document.getElementById("themeToggle").onclick = () => {
    document.getElementById("appRoot").classList.toggle("dark");
    localStorage.setItem("darkMode", document.getElementById("appRoot").classList.contains("dark"));
};

document.querySelectorAll(".log-btn").forEach(btn => {
    btn.onclick = () => {
        const period = btn.dataset.log;
        const logs = `=== ЛОГИ ЗА ${period} ===\nАккаунт: ${currentAccount}\nДата: ${new Date()}\nСтатус офлайн: активен\nИИ: ${aiResponder ? "вкл" : "выкл"}`;
        const blob = new Blob([logs], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `telegram_logs_${period}.txt`;
        a.click();
    };
});

document.getElementById("infoBtn").onclick = () => document.getElementById("infoModal").classList.add("open");
document.querySelector(".close-modal").onclick = () => document.getElementById("infoModal").classList.remove("open");

if (darkMode) document.getElementById("appRoot").classList.add("dark");