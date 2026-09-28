/* ===== DLH NEXUS - UI Utilities ===== */

const NexusUI = {
    // Toast notifications
    toast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Render markdown safely
    renderMarkdown(text) {
        if (typeof marked !== 'undefined') {
            const html = marked.parse(text);
            if (typeof DOMPurify !== 'undefined') {
                return DOMPurify.sanitize(html);
            }
            return html;
        }
        return text.replace(/\n/g, '<br>');
    },

    // Highlight code blocks
    highlightCode(container) {
        if (typeof hljs !== 'undefined') {
            container.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
            // Add copy buttons
            container.querySelectorAll('pre').forEach(pre => {
                if (!pre.querySelector('.code-copy-btn')) {
                    const btn = document.createElement('button');
                    btn.className = 'code-copy-btn';
                    btn.textContent = 'Copy';
                    btn.onclick = () => {
                        const code = pre.querySelector('code');
                        if (code) {
                            navigator.clipboard.writeText(code.textContent);
                            btn.textContent = 'Copied!';
                            setTimeout(() => btn.textContent = 'Copy', 2000);
                        }
                    };
                    pre.appendChild(btn);
                }
            });
        }
    },

    // Create message element
    createMessageElement(role, content, isStreaming = false) {
        const msg = document.createElement('div');
        msg.className = `message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = role === 'user' ? 'U' : 'N';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        const roleLabel = document.createElement('div');
        roleLabel.className = 'message-role';
        roleLabel.textContent = role === 'user' ? 'You' : 'DLH NEXUS';

        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        if (isStreaming) {
            textDiv.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        } else if (role === 'assistant') {
            textDiv.innerHTML = this.renderMarkdown(content);
            this.highlightCode(textDiv);
        } else {
            textDiv.textContent = content;
        }

        contentDiv.appendChild(roleLabel);
        contentDiv.appendChild(textDiv);

        // Action buttons for assistant messages
        if (role === 'assistant' && !isStreaming) {
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'msg-action-btn';
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            copyBtn.title = 'Copy';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(content);
                this.toast('Copied to clipboard', 'success');
            };

            const speakBtn = document.createElement('button');
            speakBtn.className = 'msg-action-btn';
            speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
            speakBtn.title = 'Read aloud';
            speakBtn.onclick = () => {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(content.replace(/[*#`]/g, ''));
                    speechSynthesis.speak(utterance);
                }
            };

            actions.appendChild(copyBtn);
            actions.appendChild(speakBtn);
            contentDiv.appendChild(actions);
        }

        msg.appendChild(avatar);
        msg.appendChild(contentDiv);
        return msg;
    },

    // Create fusion status element
    createFusionStatus() {
        const div = document.createElement('div');
        div.className = 'fusion-status';
        div.innerHTML = `
            <div class="fusion-row"><div class="fusion-dot active"></div> Neural Engine A - Processing</div>
            <div class="fusion-row"><div class="fusion-dot active"></div> Neural Engine B - Processing</div>
            <div class="fusion-row"><div class="fusion-dot active"></div> Neural Engine C - Processing</div>
            <div class="fusion-row"><div class="fusion-dot active"></div> Fusion Synthesis - Waiting</div>
        `;
        return div;
    },

    // Update fusion status
    updateFusionStatus(element, statuses, results, mode) {
        const rows = element.querySelectorAll('.fusion-row');
        const labels = ['Neural Engine A - ', 'Neural Engine B - ', 'Neural Engine C - ', 'Fusion Synthesis - '];
        const statusText = { active: 'Processing', done: 'Complete', error: 'Error', waiting: 'Waiting' };
        
        const keys = ['primary', 'secondary', 'tertiary'];
        keys.forEach((key, i) => {
            const dot = rows[i].querySelector('.fusion-dot');
            const status = statuses[key] || 'waiting';
            dot.className = 'fusion-dot ' + status;
            rows[i].innerHTML = `<div class="fusion-dot ${status}"></div> ${labels[i]}${statusText[status] || status}`;
        });

        // Synthesis row
        const allDone = keys.every(k => statuses[k] === 'done' || statuses[k] === 'error');
        const synthDot = rows[3].querySelector('.fusion-dot');
        if (allDone) {
            synthDot.className = 'fusion-dot active';
            rows[3].innerHTML = `<div class="fusion-dot active"></div> ${labels[3]}Synthesizing`;
        }
    },

    // Auto-resize textarea
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    },

    // Scroll to bottom
    scrollToBottom(element) {
        element.scrollTop = element.scrollHeight;
    },

    // Debounce
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    // Format file size
    formatSize(bytes) {
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
        return (bytes / 1048576).toFixed(1) + 'MB';
    },

    // Create image card
    createImageCard(imageUrl, prompt) {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
            <img src="${imageUrl}" alt="Generated image">
            <div class="image-overlay">
                <div class="image-prompt">${this.escapeHtml(prompt)}</div>
            </div>
        `;
        card.onclick = () => {
            window.open(imageUrl, '_blank');
        };
        return card;
    },

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Create connector card
    createConnectorCard(connector) {
        const card = document.createElement('div');
        card.className = 'connector-card';
        const statusClass = connector.available ? 'available' : '';
        card.innerHTML = `
            <div class="connector-icon">${connector.icon}</div>
            <div class="connector-name">${connector.name}</div>
            <div class="connector-desc">${connector.description}</div>
            <div class="connector-status ${statusClass}">
                <div class="dot"></div>
                <span>${connector.available ? 'Available' : 'Unavailable'}</span>
            </div>
        `;
        card.onclick = () => {
            this.toast(`${connector.name} - Use in chat with @${connector.id}`, 'info');
        };
        return card;
    },

    // Create device card
    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = 'device-card';
        const statusText = device.status === 'available' ? 'Available' : 
                          device.status === 'unavailable' ? 'Unavailable' : 'Checking...';
        card.innerHTML = `
            <div class="device-header">
                <div class="device-icon">${device.icon}</div>
                <div>
                    <div class="device-name">${device.name}</div>
                    <div class="device-status">${device.description}</div>
                </div>
            </div>
            <div class="device-action" data-device-id="${device.id}">Activate</div>
            <div class="device-output hidden"></div>
        `;
        
        const actionBtn = card.querySelector('.device-action');
        const output = card.querySelector('.device-output');
        
        if (device.status !== 'available') {
            actionBtn.disabled = true;
            actionBtn.style.opacity = '0.5';
            actionBtn.style.cursor = 'not-allowed';
            actionBtn.textContent = statusText;
        }

        actionBtn.onclick = async () => {
            actionBtn.textContent = 'Activating...';
            output.classList.remove('hidden');
            output.textContent = 'Processing...';
            
            try {
                const result = await device.activate();
                if (result.success) {
                    actionBtn.textContent = 'Active';
                    if (typeof result.data === 'object') {
                        output.innerHTML = Object.entries(result.data)
                            .map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br>');
                    } else {
                        output.textContent = result.data || 'Success';
                    }
                } else {
                    actionBtn.textContent = 'Error';
                    output.textContent = 'Error: ' + (result.error || 'Unknown error');
                }
            } catch (e) {
                actionBtn.textContent = 'Error';
                output.textContent = 'Error: ' + e.message;
            }
        };

        return card;
    }
};

if (typeof window !== 'undefined') {
    window.NexusUI = NexusUI;
}
