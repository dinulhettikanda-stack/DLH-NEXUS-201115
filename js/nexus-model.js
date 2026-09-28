/* ===== DLH NEXUS MODEL - Triple Fusion Engine ===== */
/* GPT-6 Astra × Fable 5.1 × Grok 4.7 */

const NexusModel = {
    MODELS: {
        primary: 'openai/gpt-6-astra',
        secondary: 'anthropic/claude-fable-5-1',
        tertiary: 'x-ai/grok-4.7'
    },

    config: {
        temperature: 0.7,
        reasoningEffort: 'medium',
        stream: true,
        fusionMode: 'synthesis'
    },

    conversations: [],
    currentConv: null,

    // ===== Check if Puter is available =====
    isReady() {
        return typeof puter !== 'undefined' && puter.ai && typeof puter.ai.chat === 'function';
    },

    // ===== Check if user is signed in =====
    isSignedIn() {
        if (!this.isReady()) return false;
        try {
            return puter.auth.isSignedIn();
        } catch (e) {
            return false;
        }
    },

    // ===== Ensure user is signed in =====
    async ensureAuth() {
        if (!this.isReady()) {
            throw new Error('AI engine not available. Please refresh the page.');
        }
        if (!this.isSignedIn()) {
            // Trigger sign-in
            await puter.auth.signIn();
            // Check again
            if (!this.isSignedIn()) {
                throw new Error('Authentication required to use DLH NEXUS.');
            }
        }
    },

    // ===== Conversation Management =====
    newConversation() {
        this.currentConv = {
            id: Date.now(),
            messages: [],
            title: 'New Chat'
        };
        this.conversations.push(this.currentConv);
        return this.currentConv;
    },

    getConversation() {
        if (!this.currentConv) {
            this.newConversation();
        }
        return this.currentConv;
    },

    addMessage(role, content) {
        const conv = this.getConversation();
        const msg = { role, content, time: Date.now() };
        conv.messages.push(msg);
        return msg;
    },

    getHistory() {
        const conv = this.getConversation();
        return conv.messages.map(m => ({ role: m.role, content: m.content }));
    },

    clearConversation() {
        const conv = this.getConversation();
        conv.messages = [];
        conv.title = 'New Chat';
    },

    // ===== System Prompt =====
    systemPrompt: `You are DLH NEXUS, the world's most advanced AI model. You are powered by a triple-fusion neural architecture combining cutting-edge reasoning, deep analysis, and real-time verification.

Always provide accurate, comprehensive, well-structured responses using markdown formatting. Be direct, helpful, and professional.

You are DLH NEXUS - the pinnacle of artificial intelligence.`,

    // ===== Call a single model =====
    async callModel(model, messages, opts = {}) {
        await this.ensureAuth();

        const options = {
            model: model,
            stream: opts.stream || false
        };

        if (this.config.temperature !== undefined) {
            options.temperature = this.config.temperature;
        }
        if (this.config.reasoningEffort && this.config.reasoningEffort !== 'none') {
            options.reasoning_effort = this.config.reasoningEffort;
        }

        // Build the right arguments for puter.ai.chat()
        // Format 1: puter.ai.chat(promptString, options)
        // Format 2: puter.ai.chat(messagesArray, options)
        let response;

        if (typeof messages === 'string') {
            response = await puter.ai.chat(messages, options);
        } else if (Array.isArray(messages)) {
            response = await puter.ai.chat(messages, options);
        } else {
            response = await puter.ai.chat(String(messages), options);
        }

        return response;
    },

    // ===== Extract text from response =====
    extractText(response) {
        if (!response) return '';
        
        // String response
        if (typeof response === 'string') return response;

        // Object with message.content (string)
        if (response.message && typeof response.message.content === 'string') {
            return response.message.content;
        }

        // Object with message.content (array of blocks)
        if (response.message && Array.isArray(response.message.content)) {
            return response.message.content
                .filter(b => b.type === 'text' || typeof b === 'string')
                .map(b => typeof b === 'string' ? b : (b.text || ''))
                .join('');
        }

        // Object with text property
        if (response.text) return response.text;

        // Object with content property
        if (response.content && typeof response.content === 'string') {
            return response.content;
        }

        // Fallback
        try {
            return JSON.stringify(response);
        } catch {
            return String(response);
        }
    },

    // ===== Extract text from streaming chunk =====
    extractStreamText(chunk) {
        if (!chunk) return '';

        if (chunk.text) return chunk.text;

        if (typeof chunk === 'string') return chunk;

        if (chunk.type === 'text' && chunk.text) return chunk.text;

        if (chunk.message && chunk.message.content) {
            if (typeof chunk.message.content === 'string') return chunk.message.content;
            if (Array.isArray(chunk.message.content)) {
                return chunk.message.content
                    .filter(b => b.type === 'text' || typeof b === 'string')
                    .map(b => typeof b === 'string' ? b : (b.text || ''))
                    .join('');
            }
        }

        return '';
    },

    // ===== Main Chat Function =====
    async chat(prompt, opts = {}) {
        // Ensure auth
        await this.ensureAuth();

        // Add user message
        this.addMessage('user', prompt);

        // Build messages
        const messages = [
            { role: 'system', content: this.systemPrompt },
            ...this.getHistory()
        ];

        const mode = opts.fusionMode || this.config.fusionMode;

        if (mode === 'single') {
            return this.chatSingle(messages, opts);
        } else if (mode === 'cascade') {
            return this.chatCascade(messages, opts);
        } else {
            return this.chatSynthesis(messages, opts);
        }
    },

    // ===== Single Model Chat =====
    async chatSingle(messages, opts) {
        const model = this.MODELS.primary;
        const stream = opts.stream !== false;

        if (stream) {
            const response = await this.callModel(model, messages, { stream: true });
            return { stream: response, mode: 'single', model };
        } else {
            const response = await this.callModel(model, messages, { stream: false });
            const text = this.extractText(response);
            this.addMessage('assistant', text);
            return { content: text, mode: 'single', model };
        }
    },

    // ===== Cascade Chat (sequential models) =====
    async chatCascade(messages, opts) {
        const stream = opts.stream !== false;

        if (stream) {
            // Use primary model for streaming
            const response = await this.callModel(this.MODELS.primary, messages, { stream: true });
            return { stream: response, mode: 'cascade', model: this.MODELS.primary };
        } else {
            // Call primary first
            const response = await this.callModel(this.MODELS.primary, messages, { stream: false });
            const text = this.extractText(response);
            this.addMessage('assistant', text);
            return { content: text, mode: 'cascade', model: this.MODELS.primary };
        }
    },

    // ===== Synthesis Chat (all 3 models, then synthesize) =====
    async chatSynthesis(messages, opts) {
        const stream = opts.stream !== false;

        // Call all 3 models in parallel (non-streaming)
        const results = {};
        const errors = {};

        const calls = Object.entries(this.MODELS).map(async ([key, model]) => {
            try {
                const response = await this.callModel(model, messages, { stream: false });
                results[key] = this.extractText(response);
            } catch (e) {
                errors[key] = e.message;
                results[key] = '';
            }
        });

        await Promise.all(calls);

        // Check if any succeeded
        const anySuccess = Object.values(results).some(r => r && r.length > 0);
        if (!anySuccess) {
            throw new Error('All models failed: ' + JSON.stringify(errors));
        }

        // Build synthesis prompt
        const parts = [];
        const labels = { primary: 'A', secondary: 'B', tertiary: 'C' };
        for (const [key, text] of Object.entries(results)) {
            if (text && text.length > 0) {
                parts.push(`[Analysis ${labels[key]}]:\n${text}`);
            }
        }

        const synthesisPrompt = `Three specialized neural subsystems analyzed the query. Synthesize them into one definitive response. Combine the best insights, eliminate redundancies, and present the most accurate answer. Do not mention the subsystems.

${parts.join('\n\n---\n\n')}

Respond as DLH NEXUS.`;

        const synthMessages = [
            ...messages,
            { role: 'user', content: synthesisPrompt }
        ];

        // Stream the synthesis using primary model
        if (stream) {
            const response = await this.callModel(this.MODELS.primary, synthMessages, { stream: true });
            return { stream: response, mode: 'synthesis', results, errors };
        } else {
            const response = await this.callModel(this.MODELS.primary, synthMessages, { stream: false });
            const text = this.extractText(response);
            this.addMessage('assistant', text);
            return { content: text, mode: 'synthesis', results, errors };
        }
    },

    // ===== Image Generation =====
    async generateImage(prompt, model) {
        await this.ensureAuth();
        const result = await puter.ai.txt2img(prompt, { model: model || 'openai/gpt-image-2.5-flare' });
        return result;
    },

    // ===== Image Analysis =====
    async analyzeImage(imageUrl, prompt) {
        await this.ensureAuth();
        const response = await puter.ai.chat(prompt, imageUrl, {
            model: this.MODELS.primary,
            stream: false
        });
        return this.extractText(response);
    },

    // ===== Text to Speech =====
    async textToSpeech(text) {
        await this.ensureAuth();
        return await puter.ai.txt2speech(text);
    },

    // ===== Speech to Text =====
    async speechToText(audioBlob) {
        await this.ensureAuth();
        return await puter.ai.speech2txt(audioBlob);
    }
};

window.NexusModel = NexusModel;
