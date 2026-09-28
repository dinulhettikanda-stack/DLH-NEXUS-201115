/* ===== DLH NEXUS - Connectors & Device Control ===== */

const NexusTools = {
    // ===== Connectors (like Grok AI integrations) =====
    connectors: [
        {
            id: 'web-search',
            name: 'Web Search',
            icon: '🔍',
            description: 'Search the web for real-time information',
            available: true,
            action: async (query) => {
                // Use puter's built-in search or a web fetch
                try {
                    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`);
                    const data = await response.json();
                    return data.AbstractText || 'No results found';
                } catch (e) {
                    return 'Search unavailable';
                }
            }
        },
        {
            id: 'weather',
            name: 'Weather',
            icon: '🌤️',
            description: 'Get current weather for any location',
            available: true,
            action: async (location) => {
                try {
                    const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=3`);
                    const text = await response.text();
                    return text;
                } catch (e) {
                    return 'Weather unavailable';
                }
            }
        },
        {
            id: 'calculator',
            name: 'Calculator',
            icon: '🧮',
            description: 'Perform mathematical calculations',
            available: true,
            action: async (expression) => {
                try {
                    // Safe eval for math expressions
                    const sanitized = expression.replace(/[^0-9+\-*/.()^% ]/g, '');
                    const result = Function('"use strict";return (' + sanitized + ')')();
                    return String(result);
                } catch (e) {
                    return 'Invalid expression';
                }
            }
        },
        {
            id: 'translator',
            name: 'Translator',
            icon: '🌐',
            description: 'Translate text between languages',
            available: true,
            action: async (text, targetLang = 'en') => {
                try {
                    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`);
                    const data = await response.json();
                    return data[0].map(t => t[0]).join('');
                } catch (e) {
                    return 'Translation unavailable';
                }
            }
        },
        {
            id: 'unit-converter',
            name: 'Unit Converter',
            icon: '📏',
            description: 'Convert between units of measurement',
            available: true,
            action: async (input) => {
                return 'Use the AI chat to convert units - just ask!';
            }
        },
        {
            id: 'qr-generator',
            name: 'QR Generator',
            icon: '📱',
            description: 'Generate QR codes from text or URLs',
            available: true,
            action: async (text) => {
                return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
            }
        },
        {
            id: 'color-picker',
            name: 'Color Tool',
            icon: '🎨',
            description: 'Generate and convert color formats',
            available: true,
            action: async (input) => {
                return 'Use the AI chat for color help';
            }
        },
        {
            id: 'code-runner',
            name: 'Code Runner',
            icon: '💻',
            description: 'Execute code snippets in browser',
            available: true,
            action: async (code) => {
                try {
                    const result = Function('"use strict";return (' + code + ')')();
                    return String(result);
                } catch (e) {
                    return 'Error: ' + e.message;
                }
            }
        },
        {
            id: 'text-diff',
            name: 'Text Compare',
            icon: '📝',
            description: 'Compare two pieces of text',
            available: true,
            action: async () => 'Use AI chat to compare texts'
        },
        {
            id: 'ip-info',
            name: 'IP Info',
            icon: '📡',
            description: 'Get IP address and network info',
            available: true,
            action: async () => {
                try {
                    const response = await fetch('https://api.ipify.org?format=json');
                    const data = await response.json();
                    return 'Your IP: ' + data.ip;
                } catch (e) {
                    return 'Unable to get IP';
                }
            }
        },
        {
            id: 'timestamp',
            name: 'Timestamp',
            icon: '⏰',
            description: 'Get current time and timestamps',
            available: true,
            action: async () => {
                const now = new Date();
                return `Current: ${now.toLocaleString()}\nUnix: ${Math.floor(now.getTime() / 1000)}\nISO: ${now.toISOString()}`;
            }
        },
        {
            id: 'random',
            name: 'Random Gen',
            icon: '🎲',
            description: 'Generate random numbers, passwords, UUIDs',
            available: true,
            action: async (type = 'uuid') => {
                if (type === 'uuid' || type === '') {
                    return crypto.randomUUID();
                } else if (type === 'password') {
                    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
                    let pwd = '';
                    for (let i = 0; i < 16; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
                    return pwd;
                } else {
                    return String(Math.random());
                }
            }
        }
    ],

    // ===== Device Control =====
    deviceControls: [
        {
            id: 'camera',
            name: 'Camera',
            icon: '📷',
            description: 'Access device camera',
            status: 'checking',
            init: async function() {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    return { success: true, stream };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
        },
        {
            id: 'microphone',
            name: 'Microphone',
            icon: '🎤',
            description: 'Access device microphone',
            status: 'checking',
            init: async function() {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    return { success: true, stream };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
        },
        {
            id: 'geolocation',
            name: 'Geolocation',
            icon: '📍',
            description: 'Get device location',
            status: 'checking',
            init: async function() {
                if (!navigator.geolocation) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                return new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => resolve({
                            success: true,
                            data: {
                                lat: pos.coords.latitude,
                                lon: pos.coords.longitude,
                                accuracy: pos.coords.accuracy
                            }
                        }),
                        (err) => resolve({ success: false, error: err.message }),
                        { timeout: 10000 }
                    );
                });
            }
        },
        {
            id: 'battery',
            name: 'Battery',
            icon: '🔋',
            description: 'Check battery status',
            status: 'checking',
            init: async function() {
                if (!navigator.getBattery) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                try {
                    const battery = await navigator.getBattery();
                    return {
                        success: true,
                        data: {
                            level: Math.round(battery.level * 100) + '%',
                            charging: battery.charging,
                            chargingTime: battery.chargingTime,
                            dischargingTime: battery.dischargingTime
                        }
                    };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
        },
        {
            id: 'vibration',
            name: 'Vibration',
            icon: '📳',
            description: 'Trigger device vibration',
            status: 'checking',
            init: async function() {
                if (!navigator.vibrate) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                navigator.vibrate([100, 50, 100, 50, 200]);
                return { success: true, data: 'Vibration triggered' };
            }
        },
        {
            id: 'fullscreen',
            name: 'Fullscreen',
            icon: '🖥️',
            description: 'Toggle fullscreen mode',
            status: 'checking',
            init: async function() {
                this.status = 'available';
                return true;
            },
            activate: async function() {
                try {
                    const doc = document.documentElement;
                    if (doc.requestFullscreen && !document.fullscreenElement) {
                        await doc.requestFullscreen();
                        return { success: true, data: 'Fullscreen enabled' };
                    } else if (document.fullscreenElement && document.exitFullscreen) {
                        await document.exitFullscreen();
                        return { success: true, data: 'Fullscreen disabled' };
                    }
                    return { success: true, data: 'Fullscreen toggled' };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
        },
        {
            id: 'screen-capture',
            name: 'Screen Capture',
            icon: '📸',
            description: 'Capture screen content',
            status: 'checking',
            init: async function() {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                try {
                    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    return { success: true, stream };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
        },
        {
            id: 'clipboard',
            name: 'Clipboard',
            icon: '📋',
            description: 'Read and write clipboard',
            status: 'checking',
            init: async function() {
                if (!navigator.clipboard) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                try {
                    const text = await navigator.clipboard.readText();
                    return { success: true, data: text };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
        },
        {
            id: 'network',
            name: 'Network Info',
            icon: '📶',
            description: 'Check network connection status',
            status: 'checking',
            init: async function() {
                if (!navigator.connection) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                const conn = navigator.connection;
                return {
                    success: true,
                    data: {
                        type: conn.effectiveType,
                        downlink: conn.downlink + ' Mbps',
                        rtt: conn.rtt + 'ms',
                        saveData: conn.saveData
                    }
                };
            }
        },
        {
            id: 'speech-synthesis',
            name: 'Speech Output',
            icon: '🔊',
            description: 'Text-to-speech via browser',
            status: 'checking',
            init: async function() {
                if (!('speechSynthesis' in window)) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function(text = 'DLH NEXUS is online') {
                const utterance = new SpeechSynthesisUtterance(text);
                speechSynthesis.speak(utterance);
                return { success: true, data: 'Speaking: ' + text };
            }
        },
        {
            id: 'notifications',
            name: 'Notifications',
            icon: '🔔',
            description: 'Send browser notifications',
            status: 'checking',
            init: async function() {
                if (!('Notification' in window)) {
                    this.status = 'unavailable';
                    return false;
                }
                this.status = 'available';
                return true;
            },
            activate: async function() {
                if (Notification.permission === 'granted') {
                    new Notification('DLH NEXUS', { body: 'Notification system active' });
                    return { success: true, data: 'Notification sent' };
                } else if (Notification.permission !== 'denied') {
                    const perm = await Notification.requestPermission();
                    if (perm === 'granted') {
                        new Notification('DLH NEXUS', { body: 'Notification system active' });
                        return { success: true, data: 'Notification sent' };
                    }
                    return { success: false, error: 'Permission denied' };
                }
                return { success: false, error: 'Permission denied' };
            }
        },
        {
            id: 'device-info',
            name: 'Device Info',
            icon: 'ℹ️',
            description: 'Get device and browser information',
            status: 'available',
            init: async function() { this.status = 'available'; return true; },
            activate: async function() {
                const info = {
                    platform: navigator.platform,
                    language: navigator.language,
                    userAgent: navigator.userAgent.substring(0, 100),
                    online: navigator.onLine,
                    cookies: navigator.cookieEnabled,
                    screen: `${screen.width}×${screen.height}`,
                    viewport: `${window.innerWidth}×${window.innerHeight}`,
                    pixelRatio: window.devicePixelRatio,
                    cores: navigator.hardwareConcurrency || 'N/A',
                    memory: navigator.deviceMemory ? navigator.deviceMemory + 'GB' : 'N/A'
                };
                return { success: true, data: info };
            }
        }
    ],

    // Initialize all device controls
    async initDevices() {
        for (const device of this.deviceControls) {
            try {
                await device.init();
            } catch (e) {
                device.status = 'unavailable';
            }
        }
    },

    // Get connector by ID
    getConnector(id) {
        return this.connectors.find(c => c.id === id);
    },

    // Get device by ID
    getDevice(id) {
        return this.deviceControls.find(d => d.id === id);
    }
};

if (typeof window !== 'undefined') {
    window.NexusTools = NexusTools;
}
