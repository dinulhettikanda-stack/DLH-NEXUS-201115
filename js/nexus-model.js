/* ===== DLH NEXUS MODEL - Triple Fusion Neural Engine ===== */
/* Combines GPT-6 Astra × Fable 5.1 × Grok 4.7 into a unified intelligence */

const NexusModel = {
    // Core model identifiers
    MODELS: {
        primary: 'openai/gpt-6-astra',
        secondary: 'anthropic/claude-fable-5-1',
        tertiary: 'x-ai/grok-4.7'
    },

    // Model metadata (internal only - never exposed to user)
    MODEL_META: {
        'openai/gpt-6-astra': { name: 'Astra', role: 'reasoning', context: 1050000 },
        'anthropic/claude-fable-5-1': { name: 'Fable', role: 'analysis', context: 500000 },
        'x-ai/grok-4.7': { name: 'Grok', role: 'verification', context: 500000 }
    },

    // Configuration
    config: {
        temperature: 0.7,
        reasoningEffort: 'medium',
        maxTokens: 4096,
        stream: true,
        fusionMode: 'synthesis' // synthesis | vote | cascade
    },

    // Conversation state
    conversations: new Map(),
    currentConversationId: null,

    // Initialize a new conversation
    createConversation() {
        const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        this.conversations.set(id, {
            id,
            messages: [],
            createdAt: Date.now(),
            title: 'New Chat'
        });
        this.currentConversationId = id;
        return id;
    },

    // Get current conversation
    getCurrentConversation() {
        if (!this.currentConversationId) {
            this.createConversation();
        }
        return this.conversations.get(this.currentConversationId);
    },

    // Add message to conversation
    addMessage(role, content, metadata = {}) {
        const conv = this.getCurrentConversation();
        const message = {
            role,
            content,
            timestamp: Date.now(),
            ...metadata
        };
        conv.messages.push(message);
        return message;
    },

    // Get conversation history as messages array
    getHistory() {
        const conv = this.getCurrentConversation();
        return conv.messages.map(m => ({
            role: m.role,
            content: m.content
        }));
    },

    // ===== Core Fusion Engine =====
    
    // Main chat function - orchestrates all three models
    async chat(prompt, options = {}) {
        const opts = { ...this.config, ...options };
        const history = this.getHistory();
        
        // Add user message
        this.addMessage('user', prompt);

        // Build messages array
        const messages = [
            {
                role: 'system',
                content: this.getSystemPrompt()
            },
            ...history,
            { role: 'user', content: prompt }
        ];

        if (opts.stream) {
            return this.streamFusion(messages, opts);
        } else {
            return this.fusionComplete(messages, opts);
        }
    },

    // Streaming fusion - calls all models in parallel, streams from primary
    async streamFusion(messages, opts) {
        const results = {};
        const statuses = {};

        // Call all three models simultaneously
        const modelPromises = Object.entries(this.MODELS).map(async ([key, modelId]) => {
            statuses[key] = 'active';
            try {
                const response = await this.callModel(modelId, messages, { ...opts, stream: false });
                results[key] = response;
                statuses[key] = 'done';
                return { key, modelId, response };
            } catch (err) {
                statuses[key] = 'error';
                results[key] = { error: err.message, content: '' };
                return { key, modelId, error: err.message };
            }
        });

        // If synthesis mode, wait for all then synthesize
        if (opts.fusionMode === 'synthesis') {
            await Promise.all(modelPromises);
            
            // Synthesize responses
            const synthesisPrompt = this.buildSynthesisPrompt(results);
            messages.push({
                role: 'user',
                content: synthesisPrompt
            });

            // Use primary model for synthesis with streaming
            const stream = await this.callModel(this.MODELS.primary, messages, { ...opts, stream: true });
            return { stream, statuses, results, mode: 'synthesis' };
        }
        
        // Vote mode - pick best response
        if (opts.fusionMode === 'vote') {
            await Promise.all(modelPromises);
            const best = this.selectBestResponse(results);
            // Stream the best response word by word
            return { 
                stream: this.simulateStream(results[best].content), 
                statuses, 
                results, 
                mode: 'vote',
                selectedModel: best
            };
        }

        // Cascade mode - primary first, then enhance
        if (opts.fusionMode === 'cascade') {
            // Start with primary model streaming
            const primaryStream = await this.callModel(this.MODELS.primary, messages, { ...opts, stream: true });
            // Fire secondary and tertiary in background for enhancement
            modelPromises.forEach(p => p.catch(() => {}));
            return { stream: primaryStream, statuses, results, mode: 'cascade' };
        }

        // Default: synthesis
        await Promise.all(modelPromises);
        const synthesisPrompt = this.buildSynthesisPrompt(results);
        messages.push({ role: 'user', content: synthesisPrompt });
        const stream = await this.callModel(this.MODELS.primary, messages, { ...opts, stream: true });
        return { stream, statuses, results, mode: 'synthesis' };
    },

    // Non-streaming fusion
    async fusionComplete(messages, opts) {
        const results = {};
        const statuses = {};

        const promises = Object.entries(this.MODELS).map(async ([key, modelId]) => {
            statuses[key] = 'active';
            try {
                const response = await this.callModel(modelId, messages, opts);
                results[key] = response;
                statuses[key] = 'done';
            } catch (err) {
                statuses[key] = 'error';
                results[key] = { error: err.message, content: '' };
            }
        });

        await Promise.all(promises);

        if (opts.fusionMode === 'synthesis') {
            const synthesisPrompt = this.buildSynthesisPrompt(results);
            const finalMessages = [...messages, { role: 'user', content: synthesisPrompt }];
            const final = await this.callModel(this.MODELS.primary, finalMessages, opts);
            return { content: final.content, statuses, results, mode: 'synthesis' };
        }

        if (opts.fusionMode === 'vote') {
            const best = this.selectBestResponse(results);
            return { content: results[best].content, statuses, results, mode: 'vote', selectedModel: best };
        }

        // Cascade - just use primary
        return { content: results.primary?.content || '', statuses, results, mode: 'cascade' };
    },

    // Call a single model
    async callModel(modelId, messages, opts) {
        const options = {
            model: modelId,
            stream: opts.stream || false
        };

        if (opts.temperature !== undefined) options.temperature = opts.temperature;
        if (opts.maxTokens) options.max_tokens = opts.maxTokens;
        if (opts.reasoningEffort && opts.reasoningEffort !== 'none') {
            options.reasoning_effort = opts.reasoningEffort;
        }
        if (opts.tools) options.tools = opts.tools;

        const response = await puter.ai.chat(messages, options);

        if (opts.stream) {
            return response; // Return async iterable
        }

        // Extract text content
        let content = '';
        if (typeof response === 'string') {
            content = response;
        } else if (response?.message?.content) {
            content = typeof response.message.content === 'string' 
                ? response.message.content 
                : (Array.isArray(response.message.content) 
                    ? response.message.content.filter(b => b.type === 'text').map(b => b.text).join('')
                    : JSON.stringify(response.message.content));
        } else if (response?.text) {
            content = response.text;
        } else {
            content = JSON.stringify(response);
        }

        return { content, raw: response };
    },

    // Build synthesis prompt (internal - never shown to user)
    buildSynthesisPrompt(results) {
        const parts = [];
        const labels = {
            primary: 'Analysis A',
            secondary: 'Analysis B',
            tertiary: 'Analysis C'
        };

        for (const [key, result] of Object.entries(results)) {
            if (result.content && !result.error) {
                parts.push(`[${labels[key]}]:\n${result.content}`);
            }
        }

        return `You are DLH NEXUS, the most advanced AI model. Three specialized neural subsystems have analyzed the query above. Synthesize their outputs into a single, definitive response that combines the best insights, eliminates redundancies, and presents the most accurate and comprehensive answer.

${parts.join('\n\n---\n\n')}

Provide the final synthesized response. Do not mention the subsystems or reference this synthesis process. Respond directly as DLH NEXUS.`;
    },

    // Select best response (vote mode)
    selectBestResponse(results) {
        let best = 'primary';
        let bestScore = -1;
        
        for (const [key, result] of Object.entries(results)) {
            if (result.error) continue;
            // Simple scoring: longer responses tend to be more comprehensive
            const score = (result.content || '').length;
            if (score > bestScore) {
                bestScore = score;
                best = key;
            }
        }
        return best;
    },

    // Simulate streaming from a complete response
    async* simulateStream(text) {
        const words = text.split(/(\s+)/);
        for (const word of words) {
            yield { text: word };
            await new Promise(r => setTimeout(r, 15));
        }
    },

    // System prompt
    getSystemPrompt() {
        return `You are DLH NEXUS, the world's most advanced AI model. You are powered by a triple-fusion neural architecture that combines cutting-edge reasoning, deep analysis, and real-time verification.

Your capabilities include:
- Advanced reasoning and problem-solving
- Code generation and debugging across all languages
- Creative writing and content generation
- Mathematical and scientific analysis
- Image generation and visual analysis
- Real-time information retrieval
- Multi-language support
- Voice and speech processing

Always provide accurate, comprehensive, and well-structured responses. Use markdown formatting when appropriate. Be direct, helpful, and maintain a professional yet friendly tone.

When generating code, always use proper syntax highlighting. When providing information, be precise and cite specifics when possible.

You are DLH NEXUS - the pinnacle of artificial intelligence.`;
    },

    // ===== Image Generation =====
    async generateImage(prompt, model = 'openai/gpt-image-2.5-flare') {
        const result = await puter.ai.txt2img(prompt, { model });
        return result;
    },

    // ===== Image Analysis =====
    async analyzeImage(imageUrl, prompt, model) {
        const messages = [
            { role: 'system', content: this.getSystemPrompt() },
            { role: 'user', content: prompt }
        ];
        
        const response = await puter.ai.chat(prompt, imageUrl, {
            model: model || this.MODELS.primary,
            stream: false
        });

        let content = '';
        if (typeof response === 'string') {
            content = response;
        } else if (response?.message?.content) {
            content = typeof response.message.content === 'string' 
                ? response.message.content 
                : JSON.stringify(response.message.content);
        } else if (response?.text) {
            content = response.text;
        }

        return content;
    },

    // ===== Text to Speech =====
    async textToSpeech(text, engine, voice) {
        const options = {};
        if (engine) options.engine = engine;
        if (voice) options.voice = voice;
        const result = await puter.ai.txt2speech(text, options);
        return result;
    },

    async listTTSEngines() {
        try {
            return await puter.ai.txt2speech.listEngines();
        } catch {
            return [];
        }
    },

    async listTTSVoices(engine) {
        try {
            return await puter.ai.txt2speech.listVoices(engine);
        } catch {
            return [];
        }
    },

    // ===== Speech to Text =====
    async speechToText(audioBlob) {
        const result = await puter.ai.speech2txt(audioBlob);
        return result;
    },

    // ===== Tools / Function Calling =====
    async chatWithTools(prompt, tools, options = {}) {
        const opts = { ...this.config, ...options, tools };
        return this.chat(prompt, opts);
    },

    // Clear conversation
    clearConversation() {
        const conv = this.getCurrentConversation();
        conv.messages = [];
        conv.title = 'New Chat';
    },

    // Get model status
    getModelStatus() {
        return {
            primary: 'ready',
            secondary: 'ready',
            tertiary: 'ready',
            fusionMode: this.config.fusionMode,
            total: 3
        };
    }
};

// Export for use
if (typeof window !== 'undefined') {
    window.NexusModel = NexusModel;
}
