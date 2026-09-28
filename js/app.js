/* ===== DLH NEXUS - Main Application ===== */

(function() {
    'use strict';

    let isProcessing = false;
    let attachedImage = null;
    let mediaRecorder = null;
    let audioChunks = [];

    // ===== Boot Sequence =====
    async function boot() {
        const subtext = document.getElementById('bootSubtext');

        // Wait for puter.js to load
        let attempts = 0;
        while (!NexusModel.isReady() && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }

        if (NexusModel.isReady()) {
            if (subtext) subtext.textContent = 'Neural Engine Ready';
        } else {
            if (subtext) subtext.textContent = 'AI Engine Unavailable';
        }

        await new Promise(r => setTimeout(r, 800));

        // Check auth
        const signedIn = NexusModel.isReady() && NexusModel.isSignedIn();

        if (signedIn) {
            document.getElementById('engineStatus').textContent = 'Active';
            showApp();
        } else {
            // Show auth overlay
            document.getElementById('authOverlay').classList.remove('hidden');
            document.getElementById('bootScreen').style.display = 'none';
        }
    }

    function showApp() {
        document.getElementById('bootScreen').style.display = 'none';
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('engineStatus').textContent = 'Active';
        NexusModel.newConversation();
        NexusTools.initDevices();
        setupEvents();
        renderConnectors();
        renderDevices();
        toast('DLH NEXUS is ready', 'success');
    }

    // ===== Auth =====
    async function signIn() {
        try {
            await puter.auth.signIn();
            // Check if sign-in was successful
            if (puter.auth.isSignedIn()) {
                document.getElementById('authOverlay').classList.add('hidden');
                showApp();
            }
        } catch (e) {
            toast('Sign-in failed: ' + e.message, 'error');
        }
    }

    // ===== Toast =====
    function toast(msg, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = 'toast ' + type;
        t.textContent = msg;
        container.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transform = 'translateX(100%)';
            setTimeout(() => t.remove(), 300);
        }, duration);
    }

    // ===== Markdown =====
    function renderMd(text) {
        if (typeof marked !== 'undefined') {
            const html = marked.parse(text);
            return typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(html) : html;
        }
        return text.replace(/\n/g, '<br>');
    }

    function highlightCode(container) {
        if (typeof hljs !== 'undefined') {
            container.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }
    }

    // ===== Create Message Element =====
    function createMsg(role, content, streaming) {
        const msg = document.createElement('div');
        msg.className = 'message ' + role;

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

        if (streaming) {
            textDiv.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        } else if (role === 'assistant') {
            textDiv.innerHTML = renderMd(content);
            highlightCode(textDiv);
        } else {
            textDiv.textContent = content;
        }

        contentDiv.appendChild(roleLabel);
        contentDiv.appendChild(textDiv);

        if (role === 'assistant' && !streaming) {
            const actions = document.createElement('div');
            actions.className = 'message-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'msg-action-btn';
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            copyBtn.title = 'Copy';
            copyBtn.onclick = () => { navigator.clipboard.writeText(content); toast('Copied', 'success'); };
            actions.appendChild(copyBtn);

            const speakBtn = document.createElement('button');
            speakBtn.className = 'msg-action-btn';
            speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
            speakBtn.title = 'Read aloud';
            speakBtn.onclick = () => {
                if ('speechSynthesis' in window) {
                    speechSynthesis.speak(new SpeechSynthesisUtterance(content.replace(/[*#`]/g, '')));
                }
            };
            actions.appendChild(speakBtn);

            contentDiv.appendChild(actions);
        }

        msg.appendChild(avatar);
        msg.appendChild(contentDiv);
        return msg;
    }

    // ===== Fusion Status =====
    function createFusionStatus() {
        const div = document.createElement('div');
        div.className = 'fusion-status';
        div.innerHTML = `
            <div class="fusion-row"><div class="fusion-dot active"></div> Engine A (GPT-6 Astra) - Processing</div>
            <div class="fusion-row"><div class="fusion-dot active"></div> Engine B (Fable 5.1) - Processing</div>
            <div class="fusion-row"><div class="fusion-dot active"></div> Engine C (Grok 4.7) - Processing</div>
            <div class="fusion-row"><div class="fusion-dot"></div> Synthesis - Waiting</div>
        `;
        return div;
    }

    function updateFusionStatus(element, results, errors) {
        const rows = element.querySelectorAll('.fusion-row');
        const keys = ['primary', 'secondary', 'tertiary'];
        const names = ['GPT-6 Astra', 'Fable 5.1', 'Grok 4.7'];
        const labels = ['Engine A', 'Engine B', 'Engine C'];

        keys.forEach((key, i) => {
            const dot = rows[i].querySelector('.fusion-dot');
            if (errors[key]) {
                dot.className = 'fusion-dot error';
                rows[i].innerHTML = `<div class="fusion-dot error"></div> ${labels[i]} (${names[i]}) - Error`;
            } else if (results[key] !== undefined) {
                dot.className = 'fusion-dot done';
                rows[i].innerHTML = `<div class="fusion-dot done"></div> ${labels[i]} (${names[i]}) - Complete`;
            }
        });

        // Update synthesis row
        const anySuccess = keys.some(k => results[k] && results[k].length > 0);
        if (anySuccess) {
            rows[3].querySelector('.fusion-dot').className = 'fusion-dot active';
            rows[3].innerHTML = `<div class="fusion-dot active"></div> Synthesis - Processing`;
        }
    }

    // ===== Send Message =====
    async function sendMessage() {
        const input = document.getElementById('messageInput');
        const prompt = input.value.trim();

        if (!prompt || isProcessing) return;

        isProcessing = true;
        document.getElementById('sendBtn').disabled = true;

        // Hide welcome
        const welcome = document.getElementById('welcomeScreen');
        if (welcome) welcome.remove();

        const messagesEl = document.getElementById('messages');

        // Add user message
        messagesEl.appendChild(createMsg('user', prompt));
        scrollToBottom();

        // Clear input
        input.value = '';
        input.style.height = 'auto';

        // Add assistant message with typing indicator
        const assistantMsg = createMsg('assistant', '', true);
        messagesEl.appendChild(assistantMsg);
        scrollToBottom();

        // Add fusion status
        const fusionStatus = createFusionStatus();
        assistantMsg.querySelector('.message-content').insertBefore(fusionStatus, assistantMsg.querySelector('.message-text'));

        try {
            // Call Nexus Model
            const result = await NexusModel.chat(prompt, {
                fusionMode: NexusModel.config.fusionMode,
                stream: true
            });

            // Update fusion status
            if (result.results) {
                updateFusionStatus(fusionStatus, result.results, result.errors || {});
            }

            // Stream the response
            const textDiv = assistantMsg.querySelector('.message-text');
            let fullText = '';

            if (result.stream) {
                textDiv.innerHTML = '';
                try {
                    for await (const chunk of result.stream) {
                        const chunkText = NexusModel.extractStreamText(chunk);
                        if (chunkText) {
                            fullText += chunkText;
                            textDiv.innerHTML = renderMd(fullText);
                            highlightCode(textDiv);
                            scrollToBottom();
                        }
                    }
                } catch (streamErr) {
                    if (!fullText) {
                        fullText = 'Response generation encountered an issue. Please try again.';
                        textDiv.innerHTML = renderMd(fullText);
                    }
                }
            } else if (result.content) {
                fullText = result.content;
                textDiv.innerHTML = renderMd(fullText);
                highlightCode(textDiv);
            }

            // Remove fusion status
            setTimeout(() => {
                if (fusionStatus && fusionStatus.parentNode) {
                    fusionStatus.style.opacity = '0';
                    setTimeout(() => fusionStatus.remove(), 300);
                }
            }, 1000);

            // Save response
            NexusModel.addMessage('assistant', fullText);

            // Add action buttons
            const actions = document.createElement('div');
            actions.className = 'message-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'msg-action-btn';
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            copyBtn.title = 'Copy';
            copyBtn.onclick = () => { navigator.clipboard.writeText(fullText); toast('Copied', 'success'); };

            const speakBtn = document.createElement('button');
            speakBtn.className = 'msg-action-btn';
            speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
            speakBtn.title = 'Read aloud';
            speakBtn.onclick = () => { if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(fullText.replace(/[*#`]/g, ''))); };

            actions.appendChild(copyBtn);
            actions.appendChild(speakBtn);
            assistantMsg.querySelector('.message-content').appendChild(actions);

        } catch (error) {
            const textDiv = assistantMsg.querySelector('.message-text');
            if (error.message && error.message.includes('Authentication')) {
                textDiv.innerHTML = '<p style="color:var(--warning)">Please connect your account to use DLH NEXUS.</p>';
                document.getElementById('authOverlay').classList.remove('hidden');
            } else {
                textDiv.innerHTML = '<p style="color:var(--danger)">Error: ' + escapeHtml(error.message) + '</p>';
            }
            if (fusionStatus && fusionStatus.parentNode) {
                fusionStatus.remove();
            }
            toast('Error: ' + error.message, 'error');
        } finally {
            isProcessing = false;
            document.getElementById('sendBtn').disabled = false;
            scrollToBottom();
        }
    }

    // ===== Utility =====
    function escapeHtml(t) {
        const d = document.createElement('div');
        d.textContent = t;
        return d.innerHTML;
    }

    function scrollToBottom() {
        const el = document.getElementById('messages');
        el.scrollTop = el.scrollHeight;
    }

    function autoResize(el) {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }

    // ===== Event Listeners =====
    function setupEvents() {
        // Sidebar toggle
        document.getElementById('menuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('mobileMenuBtn').onclick = () => document.getElementById('sidebar').classList.toggle('open');

        // New chat
        document.getElementById('newChatBtn').onclick = () => {
            NexusModel.clearConversation();
            const el = document.getElementById('messages');
            el.innerHTML = `
                <div class="welcome-screen" id="welcomeScreen">
                    <div class="welcome-logo">
                        <svg viewBox="0 0 200 200" width="64" height="64">
                            <rect width="200" height="200" rx="44" fill="#000" stroke="#222" stroke-width="2"/>
                            <path d="M 50 60 L 50 140 L 72 140 L 72 98 L 112 140 L 140 140 L 140 60 L 118 60 L 118 102 L 78 60 Z" fill="#fff"/>
                        </svg>
                    </div>
                    <h2 class="welcome-title">DLH NEXUS</h2>
                    <p class="welcome-desc">The most advanced AI model, powered by triple-fusion neural architecture</p>
                    <div class="suggestion-grid">
                        <button class="suggestion-card" data-prompt="Explain quantum entanglement in simple terms">
                            <div class="suggestion-icon">⚡</div>
                            <div class="suggestion-text">Explain quantum entanglement</div>
                        </button>
                        <button class="suggestion-card" data-prompt="Write a Python function for a thread-safe LRU cache">
                            <div class="suggestion-icon">💻</div>
                            <div class="suggestion-text">Write a thread-safe LRU cache</div>
                        </button>
                        <button class="suggestion-card" data-prompt="Design a modern logo for a space technology company">
                            <div class="suggestion-icon">🚀</div>
                            <div class="suggestion-text">Design a space tech logo</div>
                        </button>
                        <button class="suggestion-card" data-prompt="What are the latest breakthroughs in fusion energy?">
                            <div class="suggestion-icon">🔬</div>
                            <div class="suggestion-text">Latest fusion energy breakthroughs</div>
                        </button>
                    </div>
                </div>
            `;
            attachSuggestionCards();
            if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
            toast('New conversation started', 'success');
        };

        // Nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                document.getElementById('view-' + item.dataset.view).classList.add('active');
                item.classList.add('active');

                const titles = {
                    chat: ['DLH NEXUS', 'Advanced AI Assistant'],
                    image: ['Image Generation', 'Create images from text'],
                    vision: ['Vision Analysis', 'Analyze images with AI'],
                    voice: ['Voice & Speech', 'Text-to-speech and speech-to-text'],
                    tools: ['Connectors', 'Tools and integrations'],
                    device: ['Device Control', 'Hardware access and control']
                };
                const t = titles[item.dataset.view] || titles.chat;
                document.getElementById('viewTitle').textContent = t[0];
                document.getElementById('viewSubtitle').textContent = t[1];

                if (window.innerWidth <= 768) document.getElementById('sidebar').classList.remove('open');
            };
        });

        // Chat input
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', () => {
            autoResize(messageInput);
            document.getElementById('sendBtn').disabled = messageInput.value.trim() === '';
        });
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        document.getElementById('sendBtn').onclick = sendMessage;

        // Suggestion cards
        attachSuggestionCards();

        // Attach image
        document.getElementById('attachBtn').onclick = () => document.getElementById('imageInput').click();
        document.getElementById('imageInput').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                attachedImage = ev.target.result;
                toast('Image attached', 'info');
                document.getElementById('sendBtn').disabled = false;
            };
            reader.readAsDataURL(file);
        };

        // Voice input
        document.getElementById('voiceInputBtn').onclick = startVoiceInput;

        // Image generation
        document.getElementById('generateImageBtn').onclick = generateImage;

        // Vision
        document.getElementById('uploadZone').onclick = () => document.getElementById('visionFileInput').click();
        document.getElementById('visionFileInput').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('visionImage').src = ev.target.result;
                document.getElementById('visionPreview').classList.remove('hidden');
                document.getElementById('uploadZone').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        };
        document.getElementById('removeImageBtn').onclick = () => {
            document.getElementById('visionImage').src = '';
            document.getElementById('visionPreview').classList.add('hidden');
            document.getElementById('uploadZone').classList.remove('hidden');
            document.getElementById('visionFileInput').value = '';
        };
        document.getElementById('analyzeImageBtn').onclick = analyzeImage;

        // Voice
        document.getElementById('speakBtn').onclick = speakText;
        document.getElementById('recordBtn').onclick = toggleRecording;

        // Settings
        document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsModal').classList.remove('hidden');
        document.getElementById('closeSettings').onclick = () => document.getElementById('settingsModal').classList.add('hidden');
        document.getElementById('settingsModal').onclick = (e) => { if (e.target.id === 'settingsModal') e.target.classList.add('hidden'); };
        document.getElementById('tempSlider').oninput = (e) => { document.getElementById('tempValue').textContent = e.target.value; NexusModel.config.temperature = parseFloat(e.target.value); };
        document.getElementById('reasoningEffort').onchange = (e) => { NexusModel.config.reasoningEffort = e.target.value; };
        document.getElementById('fusionMode').onchange = (e) => { NexusModel.config.fusionMode = e.target.value; };

        // Theme
        document.getElementById('themeBtn').onclick = () => {
            document.body.classList.toggle('light-theme');
            toast('Theme toggled', 'info');
        };

        // Sign in
        document.getElementById('signInBtn').onclick = signIn;
    }

    function attachSuggestionCards() {
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.onclick = () => {
                document.getElementById('messageInput').value = card.dataset.prompt;
                autoResize(document.getElementById('messageInput'));
                document.getElementById('sendBtn').disabled = false;
                sendMessage();
            };
        });
    }

    // ===== Voice Input =====
    function startVoiceInput() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { toast('Voice input not supported', 'error'); return; }

        const recognition = new SR();
        recognition.continuous = false;
        recognition.interimResults = true;

        const btn = document.getElementById('voiceInputBtn');
        btn.classList.add('active');

        let finalText = '';
        const input = document.getElementById('messageInput');

        recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
                else interim += event.results[i][0].transcript;
            }
            input.value = finalText + interim;
            autoResize(input);
            document.getElementById('sendBtn').disabled = false;
        };
        recognition.onend = () => btn.classList.remove('active');
        recognition.onerror = (e) => { btn.classList.remove('active'); toast('Voice error: ' + e.error, 'error'); };
        recognition.start();
    }

    // ===== Image Generation =====
    async function generateImage() {
        const prompt = document.getElementById('imagePrompt').value.trim();
        const model = document.getElementById('imageModel').value;
        const btn = document.getElementById('generateImageBtn');
        const gallery = document.getElementById('imageGallery');

        if (!prompt) { toast('Enter a prompt first', 'warning'); return; }

        btn.disabled = true;
        btn.textContent = 'Generating...';

        const loading = document.createElement('div');
        loading.className = 'image-card';
        loading.style.cssText = 'display:flex;align-items:center;justify-content:center;';
        loading.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        gallery.appendChild(loading);

        try {
            const result = await NexusModel.generateImage(prompt, model);
            loading.remove();

            let url = '';
            if (typeof result === 'string') url = result;
            else if (result?.image_url) url = result.image_url;
            else if (result?.url) url = result.url;
            else if (result?.src) url = result.src;

            if (url) {
                const card = document.createElement('div');
                card.className = 'image-card';
                card.innerHTML = `<img src="${url}" alt="Generated"><div class="image-overlay"><div class="image-prompt">${escapeHtml(prompt)}</div></div>`;
                card.onclick = () => window.open(url, '_blank');
                gallery.appendChild(card);
                toast('Image generated', 'success');
            } else {
                toast('Could not get image URL', 'error');
            }
        } catch (e) {
            loading.remove();
            toast('Error: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generate';
        }
    }

    // ===== Vision =====
    async function analyzeImage() {
        const prompt = document.getElementById('visionPrompt').value.trim() || 'Describe this image in detail.';
        const img = document.getElementById('visionImage');
        const results = document.getElementById('visionResults');
        const btn = document.getElementById('analyzeImageBtn');

        if (!img.src) { toast('Upload an image first', 'warning'); return; }

        btn.disabled = true;
        btn.textContent = 'Analyzing...';

        const loading = document.createElement('div');
        loading.className = 'vision-result';
        loading.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        results.innerHTML = '';
        results.appendChild(loading);

        try {
            const text = await NexusModel.analyzeImage(img.src, prompt);
            loading.innerHTML = renderMd(text);
            highlightCode(loading);
        } catch (e) {
            loading.innerHTML = '<p style="color:var(--danger)">Error: ' + escapeHtml(e.message) + '</p>';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Analyze';
        }
    }

    // ===== Voice =====
    async function speakText() {
        const text = document.getElementById('ttsText').value.trim();
        const btn = document.getElementById('speakBtn');
        const player = document.getElementById('audioPlayer');

        if (!text) { toast('Enter text first', 'warning'); return; }

        btn.disabled = true;
        btn.textContent = 'Generating...';

        try {
            const result = await NexusModel.textToSpeech(text);
            let url = '';
            if (typeof result === 'string') url = result;
            else if (result?.src) url = result.src;
            else if (result?.url) url = result.url;

            if (url) {
                player.src = url;
                player.classList.remove('hidden');
                player.play();
                toast('Speech generated', 'success');
            } else if ('speechSynthesis' in window) {
                speechSynthesis.speak(new SpeechSynthesisUtterance(text));
                toast('Using browser TTS', 'info');
            }
        } catch (e) {
            if ('speechSynthesis' in window) {
                speechSynthesis.speak(new SpeechSynthesisUtterance(text));
                toast('Using browser TTS', 'info');
            } else {
                toast('Error: ' + e.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Speak';
        }
    }

    async function toggleRecording() {
        const btn = document.getElementById('recordBtn');
        const result = document.getElementById('sttResult');

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            btn.classList.remove('recording');
            btn.querySelector('span').textContent = 'Start Recording';
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunks, { type: 'audio/webm' });
                result.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
                try {
                    const text = await NexusModel.speechToText(blob);
                    result.textContent = typeof text === 'string' ? text : (text?.text || JSON.stringify(text));
                } catch (e) {
                    result.textContent = 'Error: ' + e.message;
                }
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start();
            btn.classList.add('recording');
            btn.querySelector('span').textContent = 'Stop Recording';
            result.textContent = 'Recording...';
        } catch (e) {
            toast('Microphone access denied', 'error');
        }
    }

    // ===== Render Connectors =====
    function renderConnectors() {
        const grid = document.getElementById('connectorsGrid');
        grid.innerHTML = '';
        NexusTools.connectors.forEach(c => {
            const card = document.createElement('div');
            card.className = 'connector-card';
            const status = c.available ? 'available' : '';
            card.innerHTML = `
                <div class="connector-icon">${c.icon}</div>
                <div class="connector-name">${c.name}</div>
                <div class="connector-desc">${c.desc}</div>
                <div class="connector-status ${status}"><div class="dot"></div><span>${c.available ? 'Available' : 'Unavailable'}</span></div>
            `;
            card.onclick = () => toast(`${c.name} - Use in chat`, 'info');
            grid.appendChild(card);
        });
    }

    // ===== Render Devices =====
    function renderDevices() {
        const grid = document.getElementById('deviceGrid');
        grid.innerHTML = '';
        NexusTools.devices.forEach(d => {
            const card = document.createElement('div');
            card.className = 'device-card';
            const status = d.available ? 'Available' : 'Unavailable';
            card.innerHTML = `
                <div class="device-header">
                    <div class="device-icon">${d.icon}</div>
                    <div>
                        <div class="device-name">${d.name}</div>
                        <div class="device-status">${d.desc}</div>
                    </div>
                </div>
                <div class="device-action" data-id="${d.id}">${status}</div>
                <div class="device-output hidden"></div>
            `;

            const action = card.querySelector('.device-action');
            const output = card.querySelector('.device-output');

            if (!d.available) {
                action.disabled = true;
                action.style.opacity = '0.5';
                action.style.cursor = 'not-allowed';
            } else {
                action.onclick = async () => {
                    action.textContent = 'Activating...';
                    output.classList.remove('hidden');
                    output.textContent = 'Processing...';
                    try {
                        const r = await d.activate();
                        if (r.success) {
                            action.textContent = 'Active';
                            output.textContent = typeof r.data === 'object' ? JSON.stringify(r.data, null, 2) : (r.data || 'Success');
                        } else {
                            action.textContent = 'Error';
                            output.textContent = 'Error: ' + (r.error || 'Unknown');
                        }
                    } catch (e) {
                        action.textContent = 'Error';
                        output.textContent = 'Error: ' + e.message;
                    }
                };
            }

            grid.appendChild(card);
        });
    }

    // ===== Start =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
