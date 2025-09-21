import * as vscode from 'vscode';
import { completeCode } from './chat';
import { ThaxuAIProvider } from './thaxuAIProvider';

let thaxuProvider: ThaxuAIProvider;
let completionCooldown = false;
let inlineEditCooldown = false;

export function activate(context: vscode.ExtensionContext) {
    console.log('Thaxu AI is now active!');
    
    // Initialize the Thaxu AI Provider
    thaxuProvider = new ThaxuAIProvider(context.extensionUri);

    // Register the webview provider for the sidebar
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ThaxuAIProvider.viewType,
            thaxuProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );

    // Command: Open sidebar (for keyboard shortcut)
    context.subscriptions.push(
        vscode.commands.registerCommand('aigen.openSidebar', async () => {
            await vscode.commands.executeCommand('workbench.view.extension.thaxu-ai-sidebar');
            // Focus on the Thaxu AI view
            await vscode.commands.executeCommand('thaxu-ai-chat.focus');
        })
    );

    // Command: Explain selected code with CLEAN, SIMPLE prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('aigen.explainSelection', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('❌ No active editor found.');
                return;
            }

            const selection = editor.document.getText(editor.selection);
            if (!selection) {
                vscode.window.showInformationMessage('💡 Please select some code first.');
                return;
            }

            // Show the sidebar first
            await vscode.commands.executeCommand('workbench.view.extension.thaxu-ai-sidebar');
            
            // Wait a bit for the sidebar to load then send the CLEAN message
            setTimeout(() => {
                const languageId = editor.document.languageId;
                const fileName = editor.document.fileName.split(/[/\\]/).pop();
                
                // CLEAN, SIMPLE PROMPT - No messy formatting
                const prompt = `Explain this ${languageId} code from ${fileName}:

\`\`\`${languageId}
${selection}
\`\`\`

Please explain:
1. What this code does
2. How it works step by step
3. Key concepts used
4. Any potential improvements`;

                thaxuProvider.addUserMessage(prompt);
                thaxuProvider.processMessage(prompt);
            }, 1000);
        })
    );

    // NEW: Command: Inline Code Edit with 10-minute cooldown
    context.subscriptions.push(
        vscode.commands.registerCommand('aigen.inlineCodeEdit', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('❌ No active editor found.');
                return;
            }

            // Check cooldown (10 minutes)
            if (inlineEditCooldown) {
                vscode.window.showWarningMessage('⏰ Inline code edit is on cooldown (10 minutes). Please wait before using it again.');
                return;
            }

            const selection = editor.document.getText(editor.selection);
            if (!selection) {
                vscode.window.showInformationMessage('💡 Please select some code to edit first.');
                return;
            }

            // Get user's edit request
            const editRequest = await vscode.window.showInputBox({
                placeHolder: 'What changes would you like to make?',
                prompt: '🎯 Describe the changes you want to make to the selected code',
                value: ''
            });

            if (!editRequest) {
                return;
            }

            // Start cooldown
            inlineEditCooldown = true;
            setTimeout(() => {
                inlineEditCooldown = false;
                vscode.window.showInformationMessage('✅ Inline code edit is available again!');
            }, 600000); // 10 minutes

            const document = editor.document;
            const languageId = document.languageId;
            const fileName = document.fileName.split(/[/\\]/).pop();

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "🤖 Thaxu AI is analyzing and editing your code...",
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ increment: 25, message: "Analyzing selected code..." });
                    
                    // CLEAN, SIMPLE PROMPT for inline editing
                    const editPrompt = `Edit this ${languageId} code: "${editRequest}"

\`\`\`${languageId}
${selection}
\`\`\`

Return only the improved code in a code block.`;

                    progress.report({ increment: 25, message: "Sending to AI..." });
                    
                    // Get edited code from AI
                    const response = await completeCode(
                        selection,
                        0,
                        languageId,
                        fileName
                    );

                    progress.report({ increment: 25, message: "Processing response..." });

                    // Extract code block from response
                    const codeBlockRegex = new RegExp(`\`\`\`${languageId}\\n([\\s\\S]*?)\\n\`\`\``, 'i');
                    const match = response.match(codeBlockRegex);
                    
                    if (match && match[1]) {
                        const editedCode = match[1].trim();
                        
                        // Show preview dialog
                        const action = await vscode.window.showInformationMessage(
                            `🎯 Thaxu AI has generated the edited code. Would you like to apply the changes?`,
                            { modal: true },
                            'Apply Changes',
                            'View in Sidebar',
                            'Cancel'
                        );

                        if (action === 'Apply Changes') {
                            // Replace the selected text with edited code
                            await editor.edit(editBuilder => {
                                editBuilder.replace(editor.selection, editedCode);
                            });
                            vscode.window.showInformationMessage('✅ Code successfully edited by Thaxu AI!');
                        } else if (action === 'View in Sidebar') {
                            // Show in sidebar with CLEAN prompt
                            await vscode.commands.executeCommand('workbench.view.extension.thaxu-ai-sidebar');
                            
                            setTimeout(() => {
                                const sidebarPrompt = `Here's your edited ${languageId} code:

${response}

💡 *Inline code edit is on cooldown for 10 minutes to encourage careful review.*`;

                                thaxuProvider.addUserMessage(`Edit request: "${editRequest}"`);
                                thaxuProvider.processMessage(sidebarPrompt);
                            }, 1000);
                        }
                    } else {
                        // Show full response in sidebar if no code block found
                        await vscode.commands.executeCommand('workbench.view.extension.thaxu-ai-sidebar');
                        
                        setTimeout(() => {
                            thaxuProvider.addUserMessage(`Edit request: "${editRequest}"`);
                            thaxuProvider.processMessage(response);
                        }, 1000);
                    }

                    progress.report({ increment: 25, message: "Complete!" });
                    
                } catch (error) {
                    console.error('❌ Inline code edit error:', error);
                    vscode.window.showErrorMessage(`❌ Inline code edit failed: ${error}`);
                    inlineEditCooldown = false; // Reset cooldown on error
                }
            });
        })
    );

    // Command: Complete with AI (existing)
    context.subscriptions.push(
        vscode.commands.registerCommand('aigen.completeCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('❌ No active editor found.');
                return;
            }

            // Check cooldown (10 minutes)
            if (completionCooldown) {
                vscode.window.showWarningMessage('⏰ Code completion is on cooldown. Please wait before using it again.');
                return;
            }

            // Start cooldown
            completionCooldown = true;
            setTimeout(() => {
                completionCooldown = false;
                vscode.window.showInformationMessage('✅ Code completion is available again!');
            }, 600000); // 10 minutes

            const document = editor.document;
            const position = editor.selection.active;
            const cursorOffset = document.offsetAt(position);
            const fullText = document.getText();
            const languageId = document.languageId;
            const fileName = document.fileName.split(/[/\\]/).pop();

            // Show progress
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "🤖 Thaxu AI is analyzing and completing your code...",
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ increment: 20, message: "Reading file context..." });
                    
                    // Get some context around the cursor
                    const lineCount = document.lineCount;
                    const currentLine = position.line;
                    const startLine = Math.max(0, currentLine - 10);
                    const endLine = Math.min(lineCount - 1, currentLine + 10);
                    
                    const contextRange = new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length);
                    const contextText = document.getText(contextRange);

                    progress.report({ increment: 30, message: "Sending to AI..." });
                    
                    // Get completion from AI
                    const completion = await completeCode(
                        contextText,
                        cursorOffset - document.offsetAt(contextRange.start),
                        languageId,
                        fileName
                    );

                    progress.report({ increment: 30, message: "Processing response..." });

                    // Show the sidebar with the completion
                    await vscode.commands.executeCommand('workbench.view.extension.thaxu-ai-sidebar');
                    
                    setTimeout(() => {
                        const prompt = `Here's your ${languageId} code completion for line ${position.line + 1}:

${completion}

💡 *Code completion is on cooldown for 10 minutes to encourage independent thinking.*`;

                        thaxuProvider.addUserMessage("**Requested AI Code Completion**");
                        thaxuProvider.processMessage(prompt);
                    }, 1000);

                    progress.report({ increment: 20, message: "Complete!" });
                    
                    vscode.window.showInformationMessage('✅ Code completion ready! Check the Thaxu AI sidebar.');
                    
                } catch (error) {
                    console.error('❌ Code completion error:', error);
                    vscode.window.showErrorMessage(`❌ Code completion failed: ${error}`);
                    completionCooldown = false; // Reset cooldown on error
                }
            });
        })
    );

    // Command: Improve code with CLEAN, SIMPLE prompt
    context.subscriptions.push(
        vscode.commands.registerCommand('aigen.improveCode', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('❌ No active editor found.');
                return;
            }

            const selection = editor.document.getText(editor.selection);
            if (!selection) {
                vscode.window.showInformationMessage('💡 Please select some code first.');
                return;
            }

            // Show the sidebar first
            await vscode.commands.executeCommand('workbench.view.extension.thaxu-ai-sidebar');
            
            setTimeout(() => {
                const languageId = editor.document.languageId;
                const fileName = editor.document.fileName.split(/[/\\]/).pop();
                
                // CLEAN, SIMPLE PROMPT - No messy formatting
                const prompt = `Improve this ${languageId} code from ${fileName}:

\`\`\`${languageId}
${selection}
\`\`\`

Please provide:
1. Improved version of the code
2. What changes were made and why
3. Best practices applied
4. Performance considerations`;

                thaxuProvider.addUserMessage(prompt);
                thaxuProvider.processMessage(prompt);
            }, 1000);
        })
    );

    // Command: Generate mini project
    context.subscriptions.push(
        vscode.commands.registerCommand('aigen.generateProject', async () => {
            const topic = await vscode.window.showInputBox({
                placeHolder: 'Enter project topic (e.g., "Todo App", "Weather Dashboard", "Snake Game")',
                prompt: '🎯 What kind of mini project would you like to create?',
                value: ''
            });

            if (!topic) {
                return;
            }

            // Ask for difficulty level
            const difficulty = await vscode.window.showQuickPick(
                ['beginner', 'intermediate', 'advanced'],
                {
                    placeHolder: 'Select difficulty level',
                    title: '📊 Choose Project Difficulty'
                }
            );

            // Ask for programming language
            const language = await vscode.window.showQuickPick(
                ['JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'TypeScript'],
                {
                    placeHolder: 'Select programming language',
                    title: '💻 Choose Programming Language'
                }
            );

            // Show the sidebar first
            await vscode.commands.executeCommand('workbench.view.extension.apollo-ai-sidebar');
            
            setTimeout(() => {
                // CLEAN, SIMPLE PROMPT for project generation
                const prompt = `Create a ${difficulty || 'beginner'} ${language || 'JavaScript'} project: "${topic}"

Please include:
1. Complete working code
2. File structure
3. Setup instructions
4. How to run the project
5. Key features explanation`;

                thaxuProvider.addUserMessage(`Generate project: "${topic}"`);
                thaxuProvider.processMessage(prompt);
            }, 1000);
        })
    );

    // Command: Clear chat history
    context.subscriptions.push(
        vscode.commands.registerCommand('aigen.clearChat', () => {
            thaxuProvider.clearChat();
        })
    );

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('thaxu.hasShownWelcome', false);
    if (!hasShownWelcome) {
        setTimeout(() => {
            vscode.window.showInformationMessage(
                '🎉 Welcome to Thaxu AI Assistant! Press Ctrl+Shift+A to open the sidebar.',
                'Open Now',
                'Learn More'
            ).then(selection => {
                if (selection === 'Open Now') {
                    vscode.commands.executeCommand('aigen.openSidebar');
                } else if (selection === 'Learn More') {
                    vscode.commands.executeCommand('aigen.generateProject');
                }
            });
            context.globalState.update('thaxu.hasShownWelcome', true);
        }, 2000);
    }

    // Auto-open sidebar when extension activates (after a short delay)
    setTimeout(async () => {
        try {
            await vscode.commands.executeCommand('workbench.view.extension.thaxu-ai-sidebar');
        } catch (error) {
            console.log('Could not auto-open sidebar:', error);
        }
    }, 3000);

    console.log('✅ Thaxu AI Assistant activated successfully!');
    console.log('🎯 New features: Clean prompts, Modern UI, Copy buttons for code blocks');
}

export function deactivate() {
    console.log('👋 Thaxu AI Assistant deactivated');
}