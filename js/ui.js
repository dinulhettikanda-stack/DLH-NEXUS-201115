/* ===== DLH NEXUS - UI Utilities ===== */

const NexusUI = {
    toast(msg, type = 'info', duration = 3000) {
        const c = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = 'toast ' + type;
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; setTimeout(() => t.remove(), 300); }, duration);
    },

    escapeHtml(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }
};

window.NexusUI = NexusUI;
