// thaxuAIProvider.ts - Optimized for Qwen2-0.5B-Instruct - Shorter responses, simpler interactions

import * as vscode from 'vscode';
import { askAI } from './chat';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export class ThaxuAIProvider implements vscode.Disposable {
    public static readonly viewType = 'thaxu-ai-sidebar';
    private readonly _extensionUri: vscode.Uri;
    private _view?: vscode.WebviewView;
    private _disposables: vscode.Disposable[] = [];
    private _chatHistory: ChatMessage[] = [];
    private _forceAnswerCooldown: boolean = false;
    private _forceAnswerEnabled: boolean = false;
    private _mentorMode: boolean = false;
    private _cooldownEndTime: number = 0;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    dispose() {
        this._disposables.forEach(d => d.dispose());
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            console.log('🔥 Received message from webview (Qwen2-0.5B):', data);
            
            try {
                switch (data.type) {
                    case 'webviewReady':
                        console.log('✅ Webview is ready, initializing Qwen2-0.5B chat...');
                        this._initializeChat();
                        this._view?.webview.postMessage({ 
                            type: 'initComplete',
                            message: 'Qwen2-0.5B Chat initialized successfully!' 
                        });
                        break;
                        
                    case 'sendMessage':
                        await this.handleUserMessage(data.message);
                        break;
                        
                    case 'toggleForceAnswer':
                        this.toggleForceAnswer();
                        break;
                        
                    case 'clearChat':
                        this.clearChat();
                        break;

                    case 'copyMessage':
                        await this.copyMessageToClipboard(data.messageIndex);
                        break;
                        
                    case 'openInEditor':
                        await this.openCodeInEditor(data.content);
                        break;
                        
                    case 'test':
                        console.log('✅ Test message received (Qwen2-0.5B)');
                        this._view?.webview.postMessage({ 
                            type: 'testResponse', 
                            message: 'Qwen2-0.5B connection test successful!' 
                        });
                        break;
                        
                    case 'debug':
                        console.log('🔧 Debug info requested (Qwen2-0.5B)');
                        this._view?.webview.postMessage({ 
                            type: 'debugResponse', 
                            data: {
                                historyLength: this._chatHistory.length,
                                cooldownActive: this._forceAnswerCooldown,
                                forceAnswerEnabled: this._forceAnswerEnabled,
                                mentorMode: this._mentorMode,
                                modelOptimization: 'qwen2_0.5B'
                            }
                        });
                        break;
                }
            } catch (error) {
                console.error('❌ Error handling webview message (Qwen2-0.5B):', error);
                this._view?.webview.postMessage({
                    type: 'error',
                    message: `Error: ${error}`
                });
            }
        });

        console.log('🚀 Webview setup complete for Qwen2-0.5B, waiting for webviewReady...');
    }

    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    private _initializeChat() {
        console.log('🔄 Initializing Qwen2-0.5B chat...');
        this._chatHistory = [];
        this._forceAnswerCooldown = false;
        this._forceAnswerEnabled = false;
        this._mentorMode = false;
        this._cooldownEndTime = 0;
        this._updateWebview();
        
        this._view?.webview.postMessage({
            type: 'forceReset',
            messages: [],
            cooldownActive: false,
            forceAnswerEnabled: false,
            mentorMode: false,
            cooldownEndTime: 0
        });
    }

    private async handleUserMessage(message: string) {
        if (!message.trim()) {
            return;
        }

        console.log('📝 Handling user message in Qwen2-0.5B mode:', this._forceAnswerEnabled ? 'FORCE' : 'MENTOR');
        
        // Show mentor mode during cooldown (frontend-only mentor responses for 0.5B)
        if (this._mentorMode && this._forceAnswerCooldown && !this._forceAnswerEnabled) {
            this.addUserMessage(message);
            
            const mentorResponse = this._generateSimpleMentorResponse(message);
            
            this._chatHistory.push({
                role: 'assistant',
                content: mentorResponse,
                timestamp: Date.now()
            });
            this._updateWebview();
            return;
        }

        this.addUserMessage(message);
        
        // Process with AI - Pass mode to backend (optimized for 0.5B)
        await this.processMessage(message, this._forceAnswerEnabled);
        
        // Start cooldown only if force answer was used
        if (this._forceAnswerEnabled && !this._forceAnswerCooldown) {
            this._startCooldown();
        }
    }

    private _startCooldown() {
        this._forceAnswerCooldown = true;
        this._mentorMode = true;
        this._cooldownEndTime = Date.now() + 120000; // 2 minutes
        
        console.log('🕐 Starting force answer cooldown for 2 minutes (Qwen2-0.5B)');
        
        setTimeout(() => {
            this._forceAnswerCooldown = false;
            this._mentorMode = false;
            this._updateWebview();
            vscode.window.showInformationMessage('✅ Force Answer cooldown expired! (Qwen2-0.5B ready)');
            console.log('✅ Force answer cooldown ended (Qwen2-0.5B)');
        }, 120000);
        
        this._updateWebview();
    }

    private _generateSimpleMentorResponse(message: string): string {
        const lowerMessage = message.toLowerCase();
        
        // Simplified mentor responses for 0.5B model - shorter and more direct
        if (lowerMessage.includes('python') || lowerMessage.includes('code') || lowerMessage.includes('function')) {
            return `## 🎓 Learning Mode (Qwen2-0.5B)

Let's think step by step:

**What to try:**
1. Break down the problem
2. Look up documentation
3. Start simple
4. Test your idea

**Learning tip:** Practice makes perfect!

*Force Answer cooldown: ${Math.ceil((this._cooldownEndTime - Date.now()) / 1000)} seconds*`;
        }
        
        // Default simple mentor response for 0.5B
        return `## 🎓 Learning Mode (Qwen2-0.5B)

Good question! Consider:

**Think about:**
- What do you want to achieve?
- What tools might help?
- How can you break it down?

**Next step:** Try researching the basics first.

*Cooldown: ${Math.ceil((this._cooldownEndTime - Date.now()) / 1000)} seconds*`;
    }

    private toggleForceAnswer() {
        if (this._forceAnswerCooldown) {
            const remaining = Math.ceil((this._cooldownEndTime - Date.now()) / 1000);
            vscode.window.showWarningMessage(`⏰ Force Answer is on cooldown (Qwen2-0.5B). Wait ${remaining} seconds.`);
            return;
        }
        
        this._forceAnswerEnabled = !this._forceAnswerEnabled;
        console.log('🚨 Force Answer toggled to (Qwen2-0.5B):', this._forceAnswerEnabled);
        
        if (this._forceAnswerEnabled) {
            vscode.window.showInformationMessage('⚡ Force Answer ENABLED! (Qwen2-0.5B) Direct answers will be provided.');
        } else {
            vscode.window.showInformationMessage('💭 Force Answer DISABLED. (Qwen2-0.5B) Learning mode resumed.');
        }
        
        this._updateWebview();
    }

    public addUserMessage(message: string) {
        this._chatHistory.push({
            role: 'user',
            content: message,
            timestamp: Date.now()
        });
        this._updateWebview();
    }

    public async processMessage(message: string, forceMode: boolean = false) {
        this._view?.webview.postMessage({ type: 'showTyping' });
        
        try {
            console.log('🤖 Processing message with Qwen2-0.5B AI in mode:', forceMode ? 'FORCE' : 'MENTOR');
            
            // Conservative settings for 0.5B model
            const maxTokens = forceMode ? 150 : 200;  // Shorter for 0.5B
            const temperature = forceMode ? 0.1 : 0.3; // Lower for 0.5B
            
            console.log('📊 Using maxTokens:', maxTokens, 'temperature:', temperature, 'forceMode:', forceMode, 'model: Qwen2-0.5B');
            
            // Get AI response - Backend handles ALL cleaning and mode logic for 0.5B
            const response = await askAI(message, { 
                forceMode: forceMode,
                includeContext: true,
                temperature: temperature,
                maxTokens: maxTokens
            });
            
            console.log('✅ Qwen2-0.5B AI response received from backend, length:', response.length);
            
            // CRITICAL: NO FRONTEND CLEANING - Trust Qwen2-0.5B optimized backend completely
            if (response && response.length > 0) {
                this._chatHistory.push({
                    role: 'assistant',
                    content: response, // Use response exactly as received from Qwen2-0.5B backend
                    timestamp: Date.now()
                });
                console.log('✅ Added Qwen2-0.5B backend response to chat history unchanged');
            } else {
                console.log('⚠️ Empty response from Qwen2-0.5B backend');
                this._chatHistory.push({
                    role: 'assistant',
                    content: 'I apologize, but I couldn\'t generate a proper response. Could you please rephrase your question?',
                    timestamp: Date.now()
                });
            }
            
            this._updateWebview();
        } catch (error) {
            console.error('❌ Error processing message with Qwen2-0.5B:', error);
            this._chatHistory.push({
                role: 'assistant',
                content: `❌ I encountered an error: ${error}. Please try again.`,
                timestamp: Date.now()
            });
            this._updateWebview();
            vscode.window.showErrorMessage(`❌ Thaxu AI (Qwen2-0.5B) Error: ${error}`);
        }
        
        this._view?.webview.postMessage({ type: 'hideTyping' });
    }

    private async copyMessageToClipboard(messageIndex: number) {
        if (messageIndex >= 0 && messageIndex < this._chatHistory.length) {
            const message = this._chatHistory[messageIndex];
            try {
                await vscode.env.clipboard.writeText(message.content);
                vscode.window.showInformationMessage('📋 Message copied to clipboard! (Qwen2-0.5B)');
            } catch (error) {
                vscode.window.showErrorMessage('❌ Failed to copy message to clipboard.');
            }
        }
    }

    private async openCodeInEditor(codeContent: string) {
        try {
            // Create a new untitled document with the code content
            const document = await vscode.workspace.openTextDocument({
                content: codeContent,
                language: 'plaintext' // Will be auto-detected based on content
            });
            
            // Show the document in a new editor
            await vscode.window.showTextDocument(document, {
                preview: false,
                viewColumn: vscode.ViewColumn.One
            });
            
            vscode.window.showInformationMessage('📝 Code opened in editor! (Qwen2-0.5B)');
        } catch (error) {
            console.error('❌ Failed to open code in editor (Qwen2-0.5B):', error);
            vscode.window.showErrorMessage('❌ Failed to open code in editor.');
        }
    }

    public clearChat() {
        console.log('🧹 Clearing Qwen2-0.5B chat history...');
        this._chatHistory = [];
        this._forceAnswerCooldown = false;
        this._forceAnswerEnabled = false;
        this._mentorMode = false;
        this._cooldownEndTime = 0;
        this._updateWebview();
        vscode.window.showInformationMessage('🧹 Qwen2-0.5B Chat history cleared!');
        
        this._view?.webview.postMessage({
            type: 'forceReset',
            messages: [],
            cooldownActive: false,
            forceAnswerEnabled: false,
            mentorMode: false,
            cooldownEndTime: 0
        });
    }

    private _updateWebview() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateChat',
                messages: this._chatHistory,
                cooldownActive: this._forceAnswerCooldown,
                forceAnswerEnabled: this._forceAnswerEnabled,
                mentorMode: this._mentorMode,
                cooldownEndTime: this._cooldownEndTime
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = this._getNonce();

        // Try multiple paths to find the HTML template
        const possiblePaths = [
            vscode.Uri.joinPath(this._extensionUri, 'src', 'webview.html'),
            vscode.Uri.joinPath(this._extensionUri, 'webview.html'),
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview.html')
        ];
        
        let html = '';
        let found = false;
        
        for (const htmlPath of possiblePaths) {
            try {
                html = require('fs').readFileSync(htmlPath.fsPath, 'utf8');
                console.log('✅ Successfully loaded HTML template for Qwen2-0.5B from:', htmlPath.fsPath);
                found = true;
                break;
            } catch (error) {
                console.log('⚠️ Failed to load from:', htmlPath.fsPath);
            }
        }
        
        if (!found) {
            console.error('❌ Failed to read HTML template from all possible paths, using embedded template for Qwen2-0.5B');
            // Use embedded HTML template as fallback
            html = this._getEmbeddedHtmlTemplate(nonce);
        }
        
        html = html.replace(/\{\{NONCE\}\}/g, nonce);
        return html;
    }

    private _getEmbeddedHtmlTemplate(nonce: string): string {
        // Return reference to the main webview.html file
        return `<!-- Fallback embedded template for Qwen2-0.5B - use webview.html instead -->
<p>Please use the updated webview.html file for the full Qwen2-0.5B interface.</p>`;
    }
}