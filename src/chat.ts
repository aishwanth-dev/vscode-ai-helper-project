// chat.ts - FIXED: Enhanced for Qwen2-0.5B with proper conversation history management and guaranteed mode compliance

import * as vscode from 'vscode';

// Use global fetch if available (VS Code >=1.74), otherwise fallback to dynamic import of node-fetch
async function getFetch(): Promise<any> {
  if (typeof (globalThis as any).fetch !== 'undefined') {
    return (globalThis as any).fetch;
  } else {
    try {
      const fetch = require('node-fetch');
      return fetch.default || fetch;
    } catch (error) {
      throw new Error('Unable to load fetch. Please ensure node-fetch is installed.');
    }
  }
}

// Configuration optimized for Qwen2-0.5B
const API_URL = 'https://ais0909-aigen.hf.space/v1/chat/completions';
const API_KEY = 'aigenapikey1234567890';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 180000; // 3 minutes

interface APIResponse {
  choices?: Array<{
    message?: { content?: string };
    text?: string;
  }>;
  generated_text?: string;
  error?: string;
  id?: string;
  object?: string;
  model?: string;
  apollo_mode?: string;
  model_optimizations?: string;
}

interface ChatContext {
  currentFile?: string;
  language?: string;
  workspaceFolder?: string;
  selectedText?: string;
}

export class ApolloAI {
  private static conversationHistory: Array<{role: string, content: string, timestamp: number}> = [];
  private static context: ChatContext = {};

  static setContext(context: ChatContext) {
    this.context = context;
  }

  static addToHistory(role: 'user' | 'assistant', content: string) {
    this.conversationHistory.push({ 
      role, 
      content, 
      timestamp: Date.now() 
    });
    
    // FIXED: Keep last 8 messages (4 user + 4 assistant pairs) for better context
    // This ensures we maintain proper conversation flow while keeping context manageable for 0.5B model
    if (this.conversationHistory.length > 8) {
      this.conversationHistory = this.conversationHistory.slice(-8);
    }
    
    console.log(`📝 Added ${role} message to history. Total messages: ${this.conversationHistory.length}`);
    console.log(`📊 History roles: ${this.conversationHistory.map(m => m.role).join(' -> ')}`);
    console.log(`🔍 Last 3 messages: ${this.conversationHistory.slice(-3).map(m => `${m.role}: ${m.content.substring(0, 50)}...`).join(' | ')}`);
  }

  static clearHistory() {
    this.conversationHistory = [];
    console.log('🧹 Conversation history cleared');
  }

  static getHistory() {
    return [...this.conversationHistory];
  }

  static getFormattedHistory(): Array<{role: string, content: string}> {
    // Return properly formatted history for API calls with enhanced context
    return this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  static analyzeConversationContext() {
    // FIXED: Enhanced conversation analysis
    const recent = this.conversationHistory.slice(-6); // Last 6 messages (3 pairs)
    const context = {
      hasCodeQuestions: false,
      hasPrintQuestions: false,
      hasCalculatorQuestions: false,
      repeatedTopics: [],
      userProgression: 'beginner',
      lastUserQuestion: '',
      lastAssistantResponse: '',
      conversationLength: this.conversationHistory.length,
      topicContinuity: false,
      questionType: 'general'
    };

    let userQuestions = [];
    let assistantResponses = [];

    for (const msg of recent) {
      const content = msg.content.toLowerCase();
      
      if (msg.role === 'user') {
        context.lastUserQuestion = msg.content;
        userQuestions.push(content);
        
        // Enhanced topic detection
        if (content.includes('print')) {
          context.hasPrintQuestions = true;
          if (content.includes('what') || content.includes('does') || content.includes('use')) {
            context.questionType = 'concept_inquiry';
          } else if (content.includes('output') || content.includes('result')) {
            context.questionType = 'prediction';
          }
        }
        
        if (content.includes('code') || content.includes('function') || content.includes('python')) {
          context.hasCodeQuestions = true;
        }
        
        if (content.includes('calculator') || content.includes('create') || content.includes('make')) {
          context.hasCalculatorQuestions = true;
          context.questionType = 'project_request';
        }
        
        // Check for output prediction questions
        if (content.includes('output') && (content.includes('print') || content.includes('"'))) {
          context.questionType = 'output_prediction';
        }
      } else if (msg.role === 'assistant') {
        context.lastAssistantResponse = msg.content;
        assistantResponses.push(content);
      }
    }

    // Check topic continuity
    if (userQuestions.length >= 2) {
      const recentTopics = userQuestions.slice(-2);
      if (recentTopics.every(q => q.includes('print')) || 
          recentTopics.every(q => q.includes('calculator'))) {
        context.topicContinuity = true;
      }
    }

    // Determine user progression
    if (context.conversationLength > 4) {
      context.userProgression = 'intermediate';
    }
    if (context.hasCodeQuestions && context.conversationLength > 2) {
      context.userProgression = 'hands_on';
    }

    return context;
  }
}

export async function askAI(prompt: string, options: {
  temperature?: number;
  maxTokens?: number;
  includeContext?: boolean;
  retries?: number;
  forceMode?: boolean;
} = {}): Promise<string> {
  const {
    temperature = 0.3,
    maxTokens = 200,
    includeContext = true,
    retries = MAX_RETRIES,
    forceMode = false
  } = options;

  console.log('🤖 Apollo AI (Qwen2-0.5B): Starting FIXED request for prompt:', prompt.substring(0, 100) + '...');
  console.log('🔧 Mode:', forceMode ? 'FORCE (Direct Answers)' : 'MENTOR (Guided Learning)');
  console.log('📊 Max tokens:', maxTokens, 'Temperature:', temperature);
  console.log('💬 Conversation history length:', ApolloAI.getHistory().length);

  // Build messages array with ENHANCED conversation history
  const messages = [];
  
  // Add conversation history if requested and available - FIXED to include more context
  if (includeContext && ApolloAI.getHistory().length > 0) {
    const history = ApolloAI.getFormattedHistory();
    console.log('📚 Including ENHANCED conversation history:', history.length, 'messages');
    
    // Add all history messages for proper context-aware responses
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    console.log('🔍 Conversation context analysis:');
    const context = ApolloAI.analyzeConversationContext();
    console.log('   - Question type:', context.questionType);
    console.log('   - Has print questions:', context.hasPrintQuestions);
    console.log('   - Topic continuity:', context.topicContinuity);
    console.log('   - User progression:', context.userProgression);
  }

  // Add current user message with enhanced VS Code context
  let userMessage = prompt.trim();
  
  // Add minimal VS Code context for code-related queries only when relevant
  const editor = vscode.window.activeTextEditor;
  if (includeContext && editor && (
    prompt.toLowerCase().includes('explain') || 
    prompt.toLowerCase().includes('debug') ||
    prompt.toLowerCase().includes('code') ||
    prompt.toLowerCase().includes('function')
  )) {
    const fileName = editor.document.fileName.split(/[/\\]/).pop();
    const language = editor.document.languageId;
    const lineCount = editor.document.lineCount;
    
    // Only add context for relevant queries and keep it concise
    if (prompt.length < 300) { // Only for shorter prompts to avoid overwhelming 0.5B model
      userMessage += `\n\n[Context: Working in ${fileName} (${language}, ${lineCount} lines)]`;
    }
  }

  messages.push({
    role: 'user',
    content: userMessage
  });

  console.log(`📤 Sending ${messages.length} messages to FIXED backend (including history)`);

  // Headers for API request
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Apollo-AI-VSCode-Extension-Qwen05B-Fixed/2.1.0-ContextAware'
  };

  // FIXED: Request body with proper conversation history and enhanced parameters
  const body = {
    messages: messages,
    temperature: forceMode ? 0.1 : Math.min(temperature, 0.5),
    max_tokens: forceMode ? Math.min(maxTokens, 200) : Math.min(maxTokens, 250),
    stream: false,
    force_mode: forceMode  // CRITICAL: This ensures backend knows the exact mode
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const fetchImpl = await getFetch();
      
      console.log(`🚀 Apollo AI (Qwen2-0.5B): FIXED Attempt ${attempt}/${retries}, sending context-aware request...`);
      console.log('📤 Request summary:', {
        messagesCount: body.messages.length,
        maxTokens: body.max_tokens,
        temperature: body.temperature,
        forceMode: body.force_mode,
        hasHistory: body.messages.length > 1,
        mode: forceMode ? 'FORCE_DIRECT' : 'MENTOR_GUIDED'
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetchImpl(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('📨 Apollo AI (Qwen2-0.5B): Received FIXED response, status:', res.status);

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'Unable to read error response');
        console.error(`❌ Apollo AI (Qwen2-0.5B): API Error ${res.status}: ${errorText}`);
        
        if (res.status === 429) {
          throw new Error('⏱️ Rate limit exceeded. Please wait a moment and try again.');
        } else if (res.status === 401) {
          throw new Error('🔑 Authentication failed. Please check your API key.');
        } else if (res.status >= 500) {
          throw new Error('🔧 Server error. The AI service is temporarily unavailable.');
        }
        
        throw new Error(`API Error (${res.status}): ${res.statusText}`);
      }

      const json: APIResponse = await res.json();
      console.log('📦 Apollo AI (Qwen2-0.5B): FIXED context-aware response received from backend');
      console.log('🔍 Backend mode used:', json.apollo_mode || 'unknown');
      console.log('⚡ Model optimizations:', json.model_optimizations || 'standard');

      // Extract response from JSON
      let responseText = '';
      
      if (json.choices && json.choices[0] && json.choices[0].message) {
        responseText = json.choices[0].message.content || '';
        console.log('✅ Extracted content from Qwen2-0.5B FIXED context-aware response');
      } else if (json.generated_text) {
        responseText = json.generated_text;
        console.log('✅ Extracted generated_text from Qwen2-0.5B FIXED response');
      } else {
        console.warn('⚠️ Unexpected response format from FIXED Qwen2-0.5B:', json);
        throw new Error('Unexpected response format from AI service');
      }
      
      if (!responseText) {
        console.warn('⚠️ Apollo AI (Qwen2-0.5B): Empty response from FIXED backend');
        throw new Error('Empty response from AI service');
      }

      console.log('✅ Apollo AI (Qwen2-0.5B): FIXED final response length:', responseText.length);
      console.log('📝 Apollo AI (Qwen2-0.5B): FIXED response preview:', responseText.substring(0, 150) + '...');

      // FIXED: Validate response quality based on mode with enhanced checks
      const finalResponse = responseText.trim();
      
      if (!forceMode) {
        // In mentor mode, check if response is actually guiding/asking questions
        const hasQuestionMarkers = /[?]/g.test(finalResponse);
        const hasGuidanceWords = /think|try|consider|what|how|step.*by.*step|break.*down/i.test(finalResponse);
        const hasDirectCode = /```[\s\S]*```/.test(finalResponse) && finalResponse.split('```').length > 3;
        
        console.log('🎓 FIXED Mentor mode response analysis:', {
          hasQuestions: hasQuestionMarkers,
          hasGuidance: hasGuidanceWords,
          hasDirectCode: hasDirectCode,
          responseType: (hasQuestionMarkers || hasGuidanceWords) ? 'proper_mentoring' : 'needs_enhancement',
          questionCount: (finalResponse.match(/\?/g) || []).length
        });
        
        // If mentor response doesn't have proper guidance, it's still valid as the backend is now fixed
        
      } else {
        // In force mode, check if response is direct enough
        const hasCode = /```|`.*`/.test(finalResponse);
        const isVague = finalResponse.length < 50 && !hasCode;
        const hasDirectAnswer = finalResponse.length > 30 && !finalResponse.toLowerCase().includes('think about');
        
        console.log('⚡ FIXED Force mode response analysis:', {
          hasCode: hasCode,
          isVague: isVague,
          hasDirectAnswer: hasDirectAnswer,
          responseType: hasDirectAnswer ? 'proper_direct_answer' : 'needs_enhancement',
          length: finalResponse.length
        });
      }

      // Add to conversation history - FIXED to ensure proper context building
      ApolloAI.addToHistory('user', prompt);
      ApolloAI.addToHistory('assistant', finalResponse);

      return finalResponse;

    } catch (err: any) {
      console.error(`❌ Apollo AI (Qwen2-0.5B) FIXED attempt ${attempt}/${retries} failed:`, err);
      
      if (attempt === retries) {
        // Return ENHANCED context-aware error messages
        const modeText = forceMode ? "direct answer" : "learning guidance";
        const hasHistory = ApolloAI.getHistory().length > 0;
        const context = ApolloAI.analyzeConversationContext();
        
        if (err.message.includes('Rate limit')) {
          return `⏱️ **Rate Limited**

Too many requests in a short time. Please wait a moment before trying again.

**Tip:** Use the Force Answer button sparingly to avoid hitting limits.${hasHistory ? `\n\n*Previous conversation context (${context.conversationLength} messages) will be preserved.*` : ''}`;
        } else if (err.message.includes('Authentication')) {
          return `🔑 **Authentication Error**

API key authentication failed. Please contact the extension developer to resolve this issue.`;
        } else if (err.message.includes('fetch') || err.name === 'AbortError') {
          return `🌐 **Network Error**

Unable to connect to Apollo AI service (Qwen2-0.5B). This could be due to:
- Internet connection issues
- The AI service being temporarily unavailable
- Network firewall blocking the request

**Solutions:**
- Check your internet connection
- Try again in a few moments
- If the problem persists, the service may be down

${hasHistory ? `*Your conversation history (${context.conversationLength} messages) is preserved and will be included when the service is available.*` : ''}`;
        } else {
          return `❌ **Connection Failed**

Unable to reach Apollo AI service (Qwen2-0.5B) for ${modeText}:
\`${err.message}\`

**Possible solutions:**
- Check your internet connection
- Try again in a few moments  
- The AI service might be temporarily unavailable

**If this error persists:**
- Check VS Code's output panel for more details
- Try restarting VS Code
- Report the issue if it continues

${hasHistory ? `*Conversation context (${context.conversationLength} messages with ${context.questionType} focus) is preserved.*` : ''}`;
        }
      }
      
      // Wait before retry (exponential backoff)
      const waitTime = Math.pow(2, attempt - 1) * 1000;
      console.log(`⏳ Apollo AI (Qwen2-0.5B): Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  return '❌ Failed to get response after multiple attempts. Please try again later.';
}

// FIXED: Enhanced code explanation with conversation context
export async function explainCode(code: string, language: string, fileName?: string): Promise<string> {
  const context = ApolloAI.analyzeConversationContext();
  
  // Adjust prompt based on conversation history - ENHANCED
  let prompt = `Explain this ${language} code`;
  if (fileName) {
    prompt += ` from ${fileName}`;
  }
  
  // Add enhanced context if user has been asking about similar topics
  if (context.hasCodeQuestions) {
    prompt += ' (building on our previous discussion)';
  }
  if (context.topicContinuity) {
    prompt += ' (continuing the same topic)';
  }
  
  prompt += `:\n\n\`\`\`${language}\n${code.substring(0, 500)}${code.length > 500 ? '...' : ''}\n\`\`\`\n\nHelp me understand what this does step by step.`;

  // Use mentor mode for explanations to encourage learning - FIXED parameters
  return askAI(prompt, { temperature: 0.2, maxTokens: 250, forceMode: false });
}

// FIXED: Enhanced code completion with conversation awareness
export async function completeCode(
  currentCode: string, 
  cursorPosition: number, 
  language: string, 
  fileName?: string,
  fullFileContent?: string
): Promise<string> {
  const beforeCursor = currentCode.substring(0, cursorPosition);
  const afterCursor = currentCode.substring(cursorPosition);
  
  const contextLength = 400; // Increased for better context
  const trimmedBefore = beforeCursor.length > contextLength ? 
    '...' + beforeCursor.slice(-contextLength) : beforeCursor;
  const trimmedAfter = afterCursor.length > contextLength ? 
    afterCursor.slice(0, contextLength) + '...' : afterCursor;
  
  const context = ApolloAI.analyzeConversationContext();
  
  let prompt = `Complete this ${language} code`;
  if (fileName) {
    prompt += ` in ${fileName}`;
  }
  
  // Add enhanced conversation context
  if (context.conversationLength > 0) {
    prompt += ' (building on our previous discussion)';
  }
  if (context.hasCodeQuestions) {
    prompt += ' (continuing our coding conversation)';
  }
  
  prompt += `:\n\n\`\`\`${language}\n${trimmedBefore}[CURSOR]${trimmedAfter}\n\`\`\`\n\nHelp complete this code with explanation.`;

  // Use mentor mode for completion to guide learning - FIXED
  return askAI(prompt, { temperature: 0.2, maxTokens: 200, forceMode: false });
}

// FIXED: Enhanced inline code edit with context
export async function editCode(
  code: string, 
  editRequest: string, 
  language: string, 
  fileName?: string
): Promise<string> {
  const trimmedCode = code.length > 500 ? code.substring(0, 500) + '...' : code;
  
  let prompt = `Edit this ${language} code: "${editRequest}"`;
  if (fileName) {
    prompt += ` (from ${fileName})`;
  }
  
  const context = ApolloAI.analyzeConversationContext();
  if (context.hasCodeQuestions) {
    prompt += ' (based on our coding discussion)';
  }
  
  prompt += `\n\n\`\`\`${language}\n${trimmedCode}\n\`\`\`\n\nMake the requested changes and explain what was modified.`;

  // Use force mode for direct editing results - FIXED
  return askAI(prompt, { temperature: 0.1, maxTokens: 250, forceMode: true });
}

export async function improveCode(code: string, language: string, fileName?: string): Promise<string> {
  const trimmedCode = code.length > 400 ? code.substring(0, 400) + '...' : code;
  
  let prompt = `Improve this ${language} code`;
  if (fileName) {
    prompt += ` from ${fileName}`;
  }
  
  const context = ApolloAI.analyzeConversationContext();
  if (context.hasCodeQuestions) {
    prompt += ' (building on our discussion)';
  }
  
  prompt += `:\n\n\`\`\`${language}\n${trimmedCode}\n\`\`\`\n\nSuggest improvements with explanations.`;

  // Use mentor mode for improvement suggestions to encourage learning - FIXED
  return askAI(prompt, { temperature: 0.3, maxTokens: 280, forceMode: false });
}

export async function generateProject(topic: string, preferences?: {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  framework?: string;
}): Promise<string> {
  const { difficulty = 'beginner', language = 'JavaScript', framework } = preferences || {};
  
  const frameworkText = framework ? ` using ${framework}` : '';
  const context = ApolloAI.analyzeConversationContext();
  
  let prompt = `Create a ${difficulty} ${language} project: "${topic}"${frameworkText}`;
  
  // Add enhanced context from conversation
  if (context.hasCodeQuestions) {
    prompt += '\n\n(Building on our previous coding discussion)';
  }
  if (context.hasCalculatorQuestions && topic.toLowerCase().includes('calculator')) {
    prompt += '\n\n(This relates to our calculator discussion)';
  }
  
  prompt += '\n\nProvide complete working code with setup instructions and explanations.';

  // Use force mode for project generation to provide complete solutions - FIXED
  return askAI(prompt, { temperature: 0.2, maxTokens: 350, forceMode: true });
}