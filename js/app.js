/* ===== DLH NEXUS - Main Application ===== */

(function() {
    'use strict';

    // ===== State =====
    let isProcessing = false;
    let currentView = 'chat';
    let mediaRecorder = null;
    let audioChunks = [];
    let attachedImage = null;
    let webSearchEnabled = false;

    // ===== Boot Sequence =====
    async function bootSequence() {
        // Wait for puter.js to be available
        const puterReady = await NexusModel.waitForPuter(20000);
        
        // Also wait a minimum time for UI animation
        await new Promise(r => setTimeout(r, 1500));
        
        const bootScreen = document.getElementById('bootScreen');
        const bootSubtext = document.querySelector('.boot-subtext');
        
        if (puterReady) {
            if (bootSubtext) bootSubtext.textContent = 'Neural Engine Ready';
        } else {
            if (bootSubtext) bootSubtext.textContent = 'Running in limited mode';
        }
        
        await new Promise(r => setTimeout(r, 500));
        
        bootScreen.classList.add('fade-out');
        document.getElementById('app').classList.remove('hidden');
        
        setTimeout(() => {
            bootScreen.style.display = 'none';
            initApp();
        }, 500);
    }

    // ===== Initialize App =====
    async function initApp() {
        NexusModel.createConversation();
        await NexusTools.initDevices();
        setupEventListeners();
        renderConnectors();
        renderDevices();
        loadVoiceOptions();
        
        if (NexusModel.isPuterAvailable()) {
            NexusUI.toast('DLH NEXUS is ready', 'success');
        } else {
            NexusUI.toast('AI engine loading - features will activate shortly', 'warning', 5000);
        }
    }

    // ===== Event Listeners =====
    function setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
        document.getElementById('menuBtn').addEventListener('click', toggleSidebar);

        // New chat
        document.getElementById('newChatBtn').addEventListener('click', newChat);

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view));
        });

        // Chat input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        messageInput.addEventListener('input', () => {
            NexusUI.autoResize(messageInput);
            sendBtn.disabled = messageInput.value.trim() === '' && !attachedImage;
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);

        // Suggestion cards
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                messageInput.value = prompt;
                NexusUI.autoResize(messageInput);
                sendBtn.disabled = false;
                sendMessage();
            });
        });

        // Image attachment
        document.getElementById('attachBtn').addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });
        document.getElementById('imageInput').addEventListener('change', handleImageAttach);

        // Web search toggle
        document.getElementById('webSearchBtn').addEventListener('click', toggleWebSearch);

        // Voice input
        document.getElementById('voiceInputBtn').addEventListener('click', startVoiceInput);

        // Image generation
        document.getElementById('generateImageBtn').addEventListener('click', generateImage);

        // Vision
        document.getElementById('uploadZone').addEventListener('click', () => {
            document.getElementById('visionFileInput').click();
        });
        document.getElementById('visionFileInput').addEventListener('change', handleVisionUpload);
        document.getElementById('removeImageBtn').addEventListener('click', removeVisionImage);
        document.getElementById('analyzeImageBtn').addEventListener('click', analyzeImage);

        // Voice
        document.getElementById('speakBtn').addEventListener('click', speakText);
        document.getElementById('recordBtn').addEventListener('click', toggleRecording);
        document.getElementById('ttsEngine').addEventListener('change', loadVoices);

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.remove('hidden');
        });
        document.getElementById('closeSettings').addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('hidden');
        });
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target.id === 'settingsModal') {
                document.getElementById('settingsModal').classList.add('hidden');
            }
        });

        // Settings controls
        document.getElementById('tempSlider').addEventListener('input', (e) => {
            document.getElementById('tempValue').textContent = e.target.value;
            NexusModel.config.temperature = parseFloat(e.target.value);
        });
        document.getElementById('reasoningEffort').addEventListener('change', (e) => {
            NexusModel.config.reasoningEffort = e.target.value;
        });
        document.getElementById('maxTokens').addEventListener('input', (e) => {
            NexusModel.config.maxTokens = parseInt(e.target.value) || 4096;
        });
        document.getElementById('streamToggle').addEventListener('change', (e) => {
            NexusModel.config.stream = e.target.checked;
        });
        document.getElementById('fusionMode').addEventListener('change', (e) => {
            NexusModel.config.fusionMode = e.target.value;
        });

        // Theme toggle
        document.getElementById('themeBtn').addEventListener('click', toggleTheme);

        // Sidebar overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.addEventListener('click', toggleSidebar);
        document.body.appendChild(overlay);
    }

    // ===== Sidebar =====
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    }

    // ===== New Chat =====
    function newChat() {
        NexusModel.createConversation();
        const messages = document.getElementById('messages');
        messages.innerHTML = '';
        showWelcomeScreen();
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
        NexusUI.toast('New conversation started', 'success');
    }

    function showWelcomeScreen() {
        const messages = document.getElementById('messages');
        messages.innerHTML = `
            <div class="welcome-screen" id="welcomeScreen">
                <div class="welcome-logo">
                    <svg viewBox="0 0 200 200" width="80" height="80">
                        <defs>
                            <linearGradient id="welcomeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#fff;stop-opacity:1"/>
                                <stop offset="100%" style="stop-color:#777;stop-opacity:1"/>
                            </linearGradient>
                        </defs>
                        <rect width="200" height="200" rx="44" fill="#000" stroke="#222" stroke-width="2"/>
                        <path d="M 50 60 L 50 140 L 70 140 L 70 100 L 110 140 L 140 140 L 140 60 L 120 60 L 120 100 L 80 60 Z" fill="url(#welcomeGrad)"/>
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
        // Re-attach suggestion card listeners
        document.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', () => {
                const prompt = card.dataset.prompt;
                document.getElementById('messageInput').value = prompt;
                NexusUI.autoResize(document.getElementById('messageInput'));
                document.getElementById('sendBtn').disabled = false;
                sendMessage();
            });
        });
    }

    // ===== View Switching =====
    function switchView(view) {
        currentView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`.nav-item[data-view="${view}"]`).classList.add('active');

        const titles = {
            chat: { title: 'DLH NEXUS', subtitle: 'Advanced AI Assistant' },
            image: { title: 'Image Generation', subtitle: 'Create images from text' },
            vision: { title: 'Vision Analysis', subtitle: 'Analyze images with AI' },
            voice: { title: 'Voice & Speech', subtitle: 'Text-to-speech and speech-to-text' },
            tools: { title: 'Connectors', subtitle: 'Tools and integrations' },
            device: { title: 'Device Control', subtitle: 'Hardware access and control' }
        };

        const t = titles[view] || titles.chat;
        document.getElementById('viewTitle').textContent = t.title;
        document.getElementById('viewSubtitle').textContent = t.subtitle;

        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
            document.querySelector('.sidebar-overlay')?.classList.remove('active');
        }
    }

    // ===== Send Message =====
    async function sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message && !attachedImage) return;
        if (isProcessing) return;

        isProcessing = true;
        document.getElementById('sendBtn').disabled = true;

        // Hide welcome screen
        const welcome = document.getElementById('welcomeScreen');
        if (welcome) welcome.remove();

        const messagesContainer = document.getElementById('messages');

        // Add user message
        let userContent = message;
        if (attachedImage) {
            userContent = message + ' [Image attached]';
        }
        const userMsg = NexusUI.createMessageElement('user', userContent);
        messagesContainer.appendChild(userMsg);

        // If image attached, handle as vision
        if (attachedImage) {
            await handleVisionChat(message, attachedImage);
            attachedImage = null;
            input.value = '';
            NexusUI.autoResize(input);
            isProcessing = false;
            document.getElementById('sendBtn').disabled = true;
            return;
        }

        // Clear input
        input.value = '';
        NexusUI.autoResize(input);

        // Add assistant message with typing indicator
        const assistantMsg = NexusUI.createMessageElement('assistant', '', true);
        messagesContainer.appendChild(assistantMsg);
        NexusUI.scrollToBottom(messagesContainer);

        // Add fusion status
        const fusionStatus = NexusUI.createFusionStatus();
        assistantMsg.querySelector('.message-content').insertBefore(
            fusionStatus,
            assistantMsg.querySelector('.message-text')
        );

        try {
            // Process with Nexus Model
            const result = await NexusModel.chat(message, {
                webSearch: webSearchEnabled
            });

            // Update fusion status
            if (result.statuses) {
                NexusUI.updateFusionStatus(fusionStatus, result.statuses, result.results, result.mode);
            }

            // Stream response
            const textDiv = assistantMsg.querySelector('.message-text');
            let fullResponse = '';

            if (result.stream) {
                // Remove typing indicator
                textDiv.innerHTML = '';
                
                try {
                    for await (const part of result.stream) {
                        if (part.text) {
                            fullResponse += part.text;
                            textDiv.innerHTML = NexusUI.renderMarkdown(fullResponse);
                            NexusUI.highlightCode(textDiv);
                            NexusUI.scrollToBottom(messagesContainer);
                        } else if (part.type === 'text' && part.text) {
                            fullResponse += part.text;
                            textDiv.innerHTML = NexusUI.renderMarkdown(fullResponse);
                            NexusUI.highlightCode(textDiv);
                            NexusUI.scrollToBottom(messagesContainer);
                        }
                    }
                } catch (streamErr) {
                    // Fallback if streaming fails
                    fullResponse = result.results?.primary?.content || 'Response generation completed.';
                    textDiv.innerHTML = NexusUI.renderMarkdown(fullResponse);
                }
            } else if (result.content) {
                fullResponse = result.content;
                textDiv.innerHTML = NexusUI.renderMarkdown(fullResponse);
                NexusUI.highlightCode(textDiv);
            }

            // Remove fusion status after completion
            setTimeout(() => {
                if (fusionStatus && fusionStatus.parentNode) {
                    fusionStatus.style.opacity = '0';
                    setTimeout(() => fusionStatus.remove(), 300);
                }
            }, 1000);

            // Add action buttons
            NexusUI.highlightCode(textDiv);
            
            // Add copy and speak buttons
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'msg-action-btn';
            copyBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
            copyBtn.title = 'Copy';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(fullResponse);
                NexusUI.toast('Copied to clipboard', 'success');
            };

            const speakBtn = document.createElement('button');
            speakBtn.className = 'msg-action-btn';
            speakBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
            speakBtn.title = 'Read aloud';
            speakBtn.onclick = () => {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(fullResponse.replace(/[*#`]/g, ''));
                    speechSynthesis.speak(utterance);
                }
            };

            actions.appendChild(copyBtn);
            actions.appendChild(speakBtn);
            assistantMsg.querySelector('.message-content').appendChild(actions);

            // Save to conversation
            NexusModel.addMessage('assistant', fullResponse);

            // Update conversation title
            const conv = NexusModel.getCurrentConversation();
            if (conv.messages.length <= 2) {
                conv.title = message.substring(0, 40);
            }

        } catch (error) {
            const textDiv = assistantMsg.querySelector('.message-text');
            textDiv.innerHTML = `<p style="color: var(--danger);">Error: ${NexusUI.escapeHtml(error.message)}</p>`;
            NexusUI.toast('Error: ' + error.message, 'error');
        } finally {
            isProcessing = false;
            document.getElementById('sendBtn').disabled = input.value.trim() === '';
            NexusUI.scrollToBottom(messagesContainer);
        }
    }

    // ===== Image Attach =====
    function handleImageAttach(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            attachedImage = e.target.result;
            NexusUI.toast('Image attached - your next message will include it', 'info');
            document.getElementById('sendBtn').disabled = false;
        };
        reader.readAsDataURL(file);
    }

    // ===== Vision Chat =====
    async function handleVisionChat(prompt, imageDataUrl) {
        const messagesContainer = document.getElementById('messages');
        const assistantMsg = NexusUI.createMessageElement('assistant', '', true);
        messagesContainer.appendChild(assistantMsg);
        NexusUI.scrollToBottom(messagesContainer);

        try {
            const response = await NexusModel.analyzeImage(imageDataUrl, prompt || 'Describe this image in detail.');
            const textDiv = assistantMsg.querySelector('.message-text');
            textDiv.innerHTML = NexusUI.renderMarkdown(response);
            NexusUI.highlightCode(textDiv);
            NexusModel.addMessage('assistant', response);
        } catch (error) {
            assistantMsg.querySelector('.message-text').innerHTML = 
                `<p style="color: var(--danger);">Error: ${NexusUI.escapeHtml(error.message)}</p>`;
        } finally {
            isProcessing = false;
            document.getElementById('sendBtn').disabled = true;
        }
    }

    // ===== Web Search Toggle =====
    function toggleWebSearch() {
        webSearchEnabled = !webSearchEnabled;
        const btn = document.getElementById('webSearchBtn');
        btn.classList.toggle('active', webSearchEnabled);
        NexusUI.toast(`Web search ${webSearchEnabled ? 'enabled' : 'disabled'}`, 'info');
    }

    // ===== Voice Input =====
    function startVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            NexusUI.toast('Voice input not supported in this browser', 'error');
            return;
        }

        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new Recognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        const btn = document.getElementById('voiceInputBtn');
        btn.classList.add('active');

        let finalText = '';
        const input = document.getElementById('messageInput');

        recognition.onresult = (event) => {
            let interimText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalText += event.results[i][0].transcript;
                } else {
                    interimText += event.results[i][0].transcript;
                }
            }
            input.value = finalText + interimText;
            NexusUI.autoResize(input);
            document.getElementById('sendBtn').disabled = false;
        };

        recognition.onend = () => {
            btn.classList.remove('active');
        };

        recognition.onerror = (e) => {
            btn.classList.remove('active');
            NexusUI.toast('Voice input error: ' + e.error, 'error');
        };

        recognition.start();
    }

    // ===== Image Generation =====
    async function generateImage() {
        const prompt = document.getElementById('imagePrompt').value.trim();
        const model = document.getElementById('imageModel').value;
        const btn = document.getElementById('generateImageBtn');
        const gallery = document.getElementById('imageGallery');

        if (!prompt) {
            NexusUI.toast('Please enter a prompt', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Generating...';

        // Show loading
        const loadingCard = document.createElement('div');
        loadingCard.className = 'image-card';
        loadingCard.style.display = 'flex';
        loadingCard.style.alignItems = 'center';
        loadingCard.style.justifyContent = 'center';
        loadingCard.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        gallery.appendChild(loadingCard);

        try {
            const result = await NexusModel.generateImage(prompt, model);
            
            // Get image URL
            let imageUrl = '';
            if (typeof result === 'string') {
                imageUrl = result;
            } else if (result?.image_url) {
                imageUrl = result.image_url;
            } else if (result?.url) {
                imageUrl = result.url;
            } else if (result?.src) {
                imageUrl = result.src;
            } else if (result?.toString) {
                imageUrl = String(result);
            }

            loadingCard.remove();
            const imgCard = NexusUI.createImageCard(imageUrl, prompt);
            gallery.appendChild(imgCard);
            NexusUI.toast('Image generated successfully', 'success');
        } catch (error) {
            loadingCard.remove();
            NexusUI.toast('Error generating image: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Generate';
        }
    }

    // ===== Vision =====
    function handleVisionUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('visionImage').src = e.target.result;
            document.getElementById('visionPreview').classList.remove('hidden');
            document.getElementById('visionUpload').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }

    function removeVisionImage() {
        document.getElementById('visionImage').src = '';
        document.getElementById('visionPreview').classList.add('hidden');
        document.getElementById('visionUpload').classList.remove('hidden');
        document.getElementById('visionFileInput').value = '';
    }

    async function analyzeImage() {
        const prompt = document.getElementById('visionPrompt').value.trim() || 'Describe this image in detail.';
        const img = document.getElementById('visionImage');
        const results = document.getElementById('visionResults');
        const btn = document.getElementById('analyzeImageBtn');

        if (!img.src) {
            NexusUI.toast('Please upload an image first', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Analyzing...';

        const loading = document.createElement('div');
        loading.className = 'vision-result';
        loading.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
        results.innerHTML = '';
        results.appendChild(loading);

        try {
            const response = await NexusModel.analyzeImage(img.src, prompt);
            loading.innerHTML = NexusUI.renderMarkdown(response);
            NexusUI.highlightCode(loading);
        } catch (error) {
            loading.innerHTML = `<p style="color: var(--danger);">Error: ${NexusUI.escapeHtml(error.message)}</p>`;
        } finally {
            btn.disabled = false;
            btn.textContent = 'Analyze';
        }
    }

    // ===== Voice / Speech =====
    async function loadVoiceOptions() {
        // Load TTS engines
        const engineSelect = document.getElementById('ttsEngine');
        try {
            const engines = await NexusModel.listTTSEngines();
            engineSelect.innerHTML = '';
            if (engines && engines.length > 0) {
                engines.forEach(engine => {
                    const option = document.createElement('option');
                    option.value = engine.id || engine.name || engine;
                    option.textContent = engine.name || engine.id || engine;
                    engineSelect.appendChild(option);
                });
            } else {
                engineSelect.innerHTML = '<option value="">Default</option>';
            }
        } catch {
            engineSelect.innerHTML = '<option value="">Default</option>';
        }
        await loadVoices();
    }

    async function loadVoices() {
        const voiceSelect = document.getElementById('ttsVoice');
        const engine = document.getElementById('ttsEngine').value;
        try {
            const voices = await NexusModel.listTTSVoices(engine);
            voiceSelect.innerHTML = '';
            if (voices && voices.length > 0) {
                voices.forEach(voice => {
                    const option = document.createElement('option');
                    option.value = voice.id || voice.name || voice;
                    option.textContent = voice.name || voice.id || voice;
                    voiceSelect.appendChild(option);
                });
            } else {
                voiceSelect.innerHTML = '<option value="">Default Voice</option>';
            }
        } catch {
            voiceSelect.innerHTML = '<option value="">Default Voice</option>';
        }
    }

    async function speakText() {
        const text = document.getElementById('ttsText').value.trim();
        const engine = document.getElementById('ttsEngine').value;
        const voice = document.getElementById('ttsVoice').value;
        const btn = document.getElementById('speakBtn');
        const player = document.getElementById('audioPlayer');

        if (!text) {
            NexusUI.toast('Please enter text to speak', 'warning');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Generating...';

        try {
            const result = await NexusModel.textToSpeech(text, engine || undefined, voice || undefined);
            let audioUrl = '';
            
            if (typeof result === 'string') {
                audioUrl = result;
            } else if (result?.src) {
                audioUrl = result.src;
            } else if (result?.url) {
                audioUrl = result.url;
            }

            if (audioUrl) {
                player.src = audioUrl;
                player.classList.remove('hidden');
                player.play();
                NexusUI.toast('Speech generated', 'success');
            } else {
                // Fallback to browser TTS
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    speechSynthesis.speak(utterance);
                    NexusUI.toast('Using browser TTS', 'info');
                } else {
                    throw new Error('No TTS available');
                }
            }
        } catch (error) {
            // Fallback to browser TTS
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                speechSynthesis.speak(utterance);
                NexusUI.toast('Using browser TTS', 'info');
            } else {
                NexusUI.toast('Error: ' + error.message, 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = 'Speak';
        }
    }

    // ===== Recording =====
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

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                result.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
                
                try {
                    const text = await NexusModel.speechToText(audioBlob);
                    let transcribed = '';
                    if (typeof text === 'string') {
                        transcribed = text;
                    } else if (text?.text) {
                        transcribed = text.text;
                    } else if (text?.transcript) {
                        transcribed = text.transcript;
                    }
                    result.textContent = transcribed || 'No speech detected';
                } catch (error) {
                    result.textContent = 'Error: ' + error.message;
                }

                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            btn.classList.add('recording');
            btn.querySelector('span').textContent = 'Stop Recording';
            result.textContent = 'Recording...';
        } catch (error) {
            NexusUI.toast('Microphone access denied', 'error');
        }
    }

    // ===== Render Connectors =====
    function renderConnectors() {
        const grid = document.getElementById('connectorsGrid');
        grid.innerHTML = '';
        NexusTools.connectors.forEach(connector => {
            grid.appendChild(NexusUI.createConnectorCard(connector));
        });
    }

    // ===== Render Devices =====
    function renderDevices() {
        const grid = document.getElementById('deviceGrid');
        grid.innerHTML = '';
        NexusTools.deviceControls.forEach(device => {
            grid.appendChild(NexusUI.createDeviceCard(device));
        });
    }

    // ===== Theme Toggle =====
    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        NexusUI.toast(`Switched to ${isLight ? 'light' : 'dark'} theme`, 'info');
    }

    // ===== Start =====
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootSequence);
    } else {
        bootSequence();
    }
})();
