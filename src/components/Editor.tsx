import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { DOMSerializer } from 'prosemirror-model';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import CharacterCount from '@tiptap/extension-character-count';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { 
  Bold, Italic, Underline as UnderlineIcon, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Undo, Redo, 
  Type, Highlighter, Trash2, Save, FileText,
  Send, Loader2, X, ChevronRight,
  RotateCcw, Copy, Check, Eraser, Wand2, 
  Languages, Zap, MessageSquare, GripHorizontal,
  Settings, Key, AlertCircle, Sparkle, ChevronDown,
  Globe, Cpu, ShieldCheck, Info, ExternalLink,
  Download, Upload
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { Rnd } from 'react-rnd';
import TurndownService from 'turndown';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const AIIcon = ({ size = 14, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" fill="currentColor" />
  </svg>
);

const PROVIDERS = {
  gemini: {
    name: 'Google Gemini',
    models: ['gemini-3-flash-preview', 'gemini-3.1-pro-preview'],
    icon: Sparkle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    accentColor: 'bg-blue-600',
    description: 'Powerful multimodal models from Google.'
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'],
    icon: Cpu,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    accentColor: 'bg-emerald-600',
    description: 'Industry-standard models for general tasks.'
  },
  anthropic: {
    name: 'Anthropic',
    models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229'],
    icon: Globe,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-100',
    accentColor: 'bg-orange-600',
    description: 'Safety-focused models with high reasoning.'
  }
};

type ProviderKey = keyof typeof PROVIDERS;

const MenuButton = ({ 
  onClick, 
  isActive = false, 
  disabled = false, 
  children,
  title
}: { 
  onClick: () => void; 
  isActive?: boolean; 
  disabled?: boolean;
  children: React.ReactNode;
  title?: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cn(
      "p-1.5 rounded-lg transition-all duration-200 flex items-center justify-center [WebkitAppRegion:no-drag]",
      "hover:bg-slate-100 active:scale-95",
      isActive ? "bg-slate-200 text-slate-900" : "text-slate-500",
      disabled && "opacity-30 cursor-not-allowed"
    )}
  >
    {children}
  </button>
);

const Toolbar = ({ 
  editor, 
  onToggleSidebar, 
  isSidebarOpen,
  onImport,
  onExport
}: { 
  editor: any, 
  onToggleSidebar: () => void, 
  isSidebarOpen: boolean,
  onImport: () => void,
  onExport: () => void
}) => {
  if (!editor) return null;

  return (
    <div className="h-[45px] flex items-center gap-1 pl-[72px] pr-2 border-b border-slate-200 bg-white/80 backdrop-blur-2xl sticky top-0 z-[10] [WebkitAppRegion:drag] overflow-x-auto custom-scrollbar no-scrollbar">
      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 shrink-0">
        <MenuButton 
          onClick={onImport}
          title="Import Document"
        >
          <Upload size={18} />
        </MenuButton>
        <MenuButton 
          onClick={onExport}
          title="Export Document"
        >
          <Download size={18} />
        </MenuButton>
      </div>

      <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 shrink-0">
        <MenuButton 
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo size={18} />
        </MenuButton>
      </div>

      <div className="flex items-center gap-1 pr-2 border-r border-slate-200 shrink-0">
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <UnderlineIcon size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter size={18} />
        </MenuButton>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-slate-200 shrink-0">
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <span className="font-bold text-sm">H1</span>
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <span className="font-bold text-sm">H2</span>
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setParagraph().run()}
          isActive={editor.isActive('paragraph')}
          title="Paragraph"
        >
          <Type size={18} />
        </MenuButton>
      </div>

      <div className="flex items-center gap-1 px-2 border-r border-slate-200 shrink-0">
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Align Justify"
        >
          <AlignJustify size={18} />
        </MenuButton>
      </div>

      <div className="flex items-center gap-1 px-2 shrink-0">
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered List"
        >
          <ListOrdered size={18} />
        </MenuButton>
        <MenuButton 
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote size={18} />
        </MenuButton>
      </div>

      <div className="ml-auto flex items-center gap-1 shrink-0">
        <MenuButton 
          onClick={onToggleSidebar}
          isActive={isSidebarOpen}
          title="AI Assistant"
        >
          <AIIcon size={18} className={cn(isSidebarOpen ? "text-indigo-600" : "text-slate-400")} />
        </MenuButton>
      </div>
    </div>
  );
};

const AISidebar = ({ 
  editor, 
  isOpen, 
  onClose,
  externalTrigger,
  onTriggerHandled
}: { 
  editor: any, 
  isOpen: boolean, 
  onClose: () => void,
  externalTrigger?: { prompt: string, timestamp: number },
  onTriggerHandled?: () => void
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, isActionable?: boolean }[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [provider, setProvider] = useState<ProviderKey>(() => (localStorage.getItem('AI_PROVIDER') as ProviderKey) || 'gemini');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('AI_API_KEYS') || '{}');
    } catch {
      return {};
    }
  });
  const [baseUrls, setBaseUrls] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('AI_BASE_URLS') || '{}');
    } catch {
      return {};
    }
  });
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('AI_MODEL') || PROVIDERS.gemini.models[0]);
  const [detectedModels, setDetectedModels] = useState<Record<string, string[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('AI_DETECTED_MODELS') || '{}');
    } catch {
      return {};
    }
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const normalizeBaseUrl = (url: string | undefined, p: ProviderKey) => {
    if (!url || !url.trim()) return undefined;
    let trimmed = url.trim();
    if (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
    
    // Remove /chat/completions if the user accidentally included it
    if (trimmed.endsWith('/chat/completions')) {
      trimmed = trimmed.replace(/\/chat\/completions$/, '');
    }
    
    // For OpenAI proxies, many require /v1 suffix if not provided
    if (p === 'openai' && !trimmed.includes('api.openai.com')) {
      // If it's DashScope, don't just append /v1, it needs /compatible-mode/v1
      if (trimmed.includes('dashscope.aliyuncs.com')) {
        if (!trimmed.includes('compatible-mode')) {
          return `${trimmed}/compatible-mode/v1`;
        }
        return trimmed;
      }
      
      try {
        const urlObj = new URL(trimmed);
        if (urlObj.pathname === '/' || urlObj.pathname === '') {
          return `${trimmed}/v1`;
        }
      } catch (e) {
        // Not a valid URL, return as is
      }
    }
    return trimmed;
  };

  const saveConfig = (newProvider: ProviderKey, newKeys: Record<string, string>, newModel: string, newBaseUrls?: Record<string, string>, newDetected?: Record<string, string[]>) => {
    setProvider(newProvider);
    setApiKeys(newKeys);
    setSelectedModel(newModel);
    if (newBaseUrls) setBaseUrls(newBaseUrls);
    if (newDetected) setDetectedModels(newDetected);
    
    localStorage.setItem('AI_PROVIDER', newProvider);
    localStorage.setItem('AI_API_KEYS', JSON.stringify(newKeys));
    localStorage.setItem('AI_MODEL', newModel);
    if (newBaseUrls) localStorage.setItem('AI_BASE_URLS', JSON.stringify(newBaseUrls));
    if (newDetected) localStorage.setItem('AI_DETECTED_MODELS', JSON.stringify(newDetected));
  };

  const detectModels = async (targetProvider: ProviderKey, key: string, baseUrl?: string) => {
    if (!key) return;
    setIsDetecting(true);
    const normalizedUrl = normalizeBaseUrl(baseUrl, targetProvider);
    
    try {
      let models: string[] = [];
      if (targetProvider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: key });
        const result = await ai.models.list();
        for await (const model of result) {
          if (model.name.includes('gemini')) {
            models.push(model.name.replace('models/', ''));
          }
        }
      } else if (targetProvider === 'openai') {
        const openai = new OpenAI({ 
          apiKey: key, 
          dangerouslyAllowBrowser: true,
          baseURL: normalizedUrl || undefined,
          timeout: 10000, // 10s timeout for model list
          defaultHeaders: normalizedUrl?.includes('openrouter.ai') ? {
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Lumina Editor',
          } : undefined
        });
        
        try {
          const result = await openai.models.list();
          // Allow all models from 3rd party providers, otherwise filter for chat models
          models = result.data
            .filter(m => {
              if (normalizedUrl && !normalizedUrl.includes('api.openai.com')) return true;
              return m.id.startsWith('gpt') || m.id.startsWith('o1') || !m.id.includes('whisper');
            })
            .map(m => m.id);
        } catch (e) {
          // If models.list fails, check if it's DashScope or similar
          if (normalizedUrl?.includes('dashscope.aliyuncs.com')) {
            models = ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long', 'qwen-coder-plus', 'qwq-32b-preview'];
          } else {
            throw e;
          }
        }
      } else if (targetProvider === 'anthropic') {
        const anthropic = new Anthropic({ 
          apiKey: key, 
          dangerouslyAllowBrowser: true,
          baseURL: normalizedUrl || undefined
        });
        // Try to validate the key by a dummy request if base URL is provided, 
        // otherwise use the static list as Anthropic doesn't have a public "list models" API.
        models = PROVIDERS.anthropic.models;
      }

      if (models.length > 0) {
        const newDetected = { ...detectedModels, [targetProvider]: models };
        setDetectedModels(newDetected);
        localStorage.setItem('AI_DETECTED_MODELS', JSON.stringify(newDetected));
        
        // If current selected model is not in the new list, select the first one
        if (!models.includes(selectedModel)) {
          setSelectedModel(models[0]);
          localStorage.setItem('AI_MODEL', models[0]);
        }
      }
    } catch (error: any) {
      console.error('Detection Error:', error);
      const detail = error.response?.data?.error?.message || error.message || "Unknown error";
      alert(`Failed to fetch models from ${PROVIDERS[targetProvider].name}: ${detail}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSend = useCallback(async (overridePrompt?: string) => {
    const userMessage = overridePrompt || input.trim();
    if (!userMessage || isLoading) return;

    const currentKey = apiKeys[provider];
    const normalizedUrl = normalizeBaseUrl(baseUrls[provider], provider);

    if (!currentKey) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `AI features are unavailable for ${PROVIDERS[provider].name}. Please set your API Key in settings to continue.` 
      }]);
      return;
    }

    // Auto-fix for DashScope model name if user is using default GPT name
    let activeModel = selectedModel;
    if (normalizedUrl?.includes('dashscope.aliyuncs.com') && activeModel.startsWith('gpt-')) {
      activeModel = 'qwen-plus';
      setSelectedModel('qwen-plus');
      console.log('Auto-switched to qwen-plus for DashScope compatibility');
    }

    if (!overridePrompt) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setStatusMessage(`Preparing context for ${PROVIDERS[provider].name}...`);

    try {
      const { from, to, empty } = editor.state.selection;
      
      // Get HTML of selection instead of plain text to preserve structure (lists, headings, etc.)
      let selectedContent = '';
      if (!empty) {
        const slice = editor.state.doc.slice(from, to);
        const div = document.createElement('div');
        // Use ProseMirror serializer to get HTML fragment
        const fragment = DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content);
        div.appendChild(fragment);
        selectedContent = div.innerHTML;
      }

      const docText = editor.getText();
      const contextText = docText.length > 4000 ? docText.slice(0, 4000) + "..." : docText;

      const systemPrompt = `You are a professional writing assistant.
Current document context (for reference):
"${contextText}"

${selectedContent ? `The user has highlighted this HTML segment for modification:
\`\`\`html
${selectedContent}
\`\`\`
` : ''}

Task: ${userMessage}

CRITICAL REQUIREMENT:
1. Return ONLY the transformed content.
2. If the user provided HTML segment, you MUST maintain the same HTML structure (tags like <ul>, <li>, <h1>, <p>, <strong>, <u> etc.) unless the task explicitly asks to change the format.
3. If the input was a list, return a list. If it was a heading, return a heading.
4. ABSOLUTELY NO markdown code blocks (e.g., do not wrap in \`\`\`html or \`\`\`).
5. NO introductory sentences, NO explanations, and NO trailing remarks.
6. The entire response must be valid HTML that can be directly inserted into the editor.`;

      console.log(`Sending request to ${provider} with model ${activeModel}...`);
      setStatusMessage(`Connecting to ${PROVIDERS[provider].name} (${activeModel})...`);
      
      // Push an empty AI message to start with
      setMessages(prev => [...prev, { role: 'ai', content: '', isActionable: false }]);

      const cleanMarkdown = (text: string) => {
        return text.replace(/```html\n?|```/g, '').trim();
      };

      const updateLastAIMessage = (content: string, isActionable: boolean = false) => {
        setMessages(prev => {
          if (prev.length === 0) return prev;
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          if (newMessages[lastIdx].role === 'ai') {
            newMessages[lastIdx] = { 
              ...newMessages[lastIdx], 
              content: isActionable ? cleanMarkdown(content) : content,
              isActionable: isActionable
            };
          }
          return newMessages;
        });
      };

      let fullResponse = '';

      if (provider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: currentKey });
        const stream = await ai.models.generateContentStream({
          model: activeModel,
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }]
        });
        
        setStatusMessage(`Receiving response...`);
        for await (const chunk of stream) {
          const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
          fullResponse += chunkText;
          updateLastAIMessage(fullResponse);
        }
        updateLastAIMessage(fullResponse, true);
      } else if (provider === 'openai') {
        const openai = new OpenAI({ 
          apiKey: currentKey, 
          dangerouslyAllowBrowser: true,
          baseURL: normalizedUrl || undefined,
          timeout: 60000, 
          defaultHeaders: normalizedUrl?.includes('openrouter.ai') ? {
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Lumina Editor',
          } : undefined
        });
        
        const stream = await openai.chat.completions.create({
          model: activeModel,
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.7,
          max_tokens: 2000,
          stream: true,
        });

        setStatusMessage(`Receiving response...`);
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullResponse += content;
          if (fullResponse) updateLastAIMessage(fullResponse);
        }
        updateLastAIMessage(fullResponse, true);
      } else if (provider === 'anthropic') {
        const anthropic = new Anthropic({ 
          apiKey: currentKey, 
          dangerouslyAllowBrowser: true,
          baseURL: normalizedUrl || undefined,
          timeout: 60000
        });
        
        const stream = await anthropic.messages.create({
          model: activeModel,
          max_tokens: 4096,
          messages: [{ role: 'user', content: systemPrompt }],
          stream: true,
        });

        setStatusMessage(`Receiving response...`);
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && 'text' in event.delta) {
            fullResponse += event.delta.text;
            updateLastAIMessage(fullResponse);
          }
        }
        updateLastAIMessage(fullResponse, true);
      }

    } catch (error: any) {
      console.error('AI Error:', error);
      let detail = error.message || "Unknown error";
      
      // Specific check for CORS
      if (detail === "Failed to fetch") {
        detail = "Connection failed (CORS error). Cloud providers like Alibaba Cloud often block direct browser requests. Please use a proxy (like OpenRouter or a self-hosted one) or check if your Base URL is correct.";
      } else if (error.name === 'AbortError' || detail.includes('timed out')) {
        detail = "Request timed out after 60 seconds. This might be due to a slow proxy or large context.";
      } else if (error.status === 401) {
        detail = "Invalid API Key. Please check your settings.";
      } else if (error.status === 404) {
        detail = "Model not found or invalid Base URL. Many proxies require '/v1' suffix. Alibaba Cloud DashScope needs '/compatible-mode/v1'.";
      }
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `Sorry, I encountered an error with ${PROVIDERS[provider].name}: ${detail}.` 
      }]);
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  }, [input, isLoading, provider, apiKeys, baseUrls, selectedModel, editor]);

  // Handle external triggers (from selection menu)
  useEffect(() => {
    if (externalTrigger && externalTrigger.prompt) {
      handleSend(externalTrigger.prompt);
      onTriggerHandled?.();
    }
  }, [externalTrigger, handleSend, onTriggerHandled]);

  const applyChange = (content: string) => {
    if (!editor) return;
    
    // Remove markdown code blocks if the AI accidentally included them
    let cleanedContent = content.replace(/```html\n?|```/g, '').trim();
    
    // If the content is just plain text with newlines but no HTML tags, 
    // Tiptap might break existing block structures like lists.
    // However, since we now explicitly request HTML and send HTML context,
    // the AI should be returning proper tags.
    
    editor.chain()
      .focus()
      .deleteSelection() // Explicitly delete selection first to avoid merging issues
      .insertContent(cleanedContent)
      .run();
  };

  const copyToClipboard = (text: string, id: number) => {
    // Also clean the text for clipboard if it contains markdown markers
    const cleanedText = text.replace(/```html\n?|```/g, '').trim();
    navigator.clipboard.writeText(cleanedText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const regenerateLast = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      handleSend(lastUserMsg.content);
    }
  };

  const quickActions = [
    { label: 'Improve', icon: Wand2, prompt: 'Improve the writing of the selected text or the whole document.' },
    { label: 'Fix Grammar', icon: Check, prompt: 'Fix any grammar or spelling mistakes in the document.' },
    { label: 'Summarize', icon: Zap, prompt: 'Provide a concise summary of the document.' },
    { label: 'Translate', icon: Languages, prompt: 'Translate the selected text. If it is English, translate it to Chinese. If it is Chinese, translate it to English.' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[40] lg:hidden"
          />
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-[85vw] sm:w-96 h-full bg-white flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-50 fixed right-0 top-0 lg:relative"
          >
            {/* Header - Styled to match Toolbar */}
          <div className="h-[45px] px-3 border-b border-slate-200 flex items-center justify-between bg-white/80 backdrop-blur-2xl sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                <AIIcon size={12} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-[11px] font-bold text-slate-900 leading-none">AI Assistant</h3>
                <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">
                  {apiKeys[provider] ? selectedModel : 'AI Unavailable'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isSettingsOpen ? "bg-blue-50 text-blue-600" : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                )}
                title="Settings"
              >
                <Settings size={14} />
              </button>
              {!isSettingsOpen && (
                <button 
                  onClick={clearChat}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                  title="Clear Chat"
                >
                  <Eraser size={14} />
                </button>
              )}
              <div className="w-px h-4 bg-slate-200 mx-1" />
              <button 
                onClick={onClose} 
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex flex-col relative border-l border-slate-200">
            <AnimatePresence mode="wait">
              {isSettingsOpen ? (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar bg-slate-50/30"
                >
                  {/* Provider Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Provider</label>
                      <span className="text-[10px] text-blue-500 font-medium flex items-center gap-1">
                        <Info size={10} />
                        Choose your AI engine
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.entries(PROVIDERS) as [ProviderKey, typeof PROVIDERS.gemini][]).map(([key, p]) => {
                        const Icon = p.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              const newProvider = key as ProviderKey;
                              saveConfig(newProvider, apiKeys, PROVIDERS[newProvider].models[0], baseUrls);
                            }}
                            className={cn(
                              "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300",
                              provider === key 
                                ? cn("bg-white shadow-md ring-2 ring-offset-1", p.borderColor, "ring-blue-500/20") 
                                : "bg-white/50 border-transparent hover:bg-white hover:border-slate-200 grayscale opacity-60 hover:grayscale-0 hover:opacity-100"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", p.bgColor, p.color)}>
                              <Icon size={18} />
                            </div>
                            <span className={cn("text-[10px] font-bold", provider === key ? "text-slate-900" : "text-slate-500")}>
                              {p.name.split(' ')[p.name.split(' ').length - 1]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Configuration Card */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", PROVIDERS[provider].bgColor, PROVIDERS[provider].color)}>
                          {React.createElement(PROVIDERS[provider].icon, { size: 14 })}
                        </div>
                        <h4 className="font-bold text-xs text-slate-800">{PROVIDERS[provider].name}</h4>
                      </div>
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                        apiKeys[provider] ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                      )}>
                        <div className={cn("w-1 h-1 rounded-full", apiKeys[provider] ? "bg-emerald-500 animate-pulse" : "bg-slate-400")} />
                        {apiKeys[provider] ? "Connected" : "Disconnected"}
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      {/* API Key Input */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">API Key</label>
                          <a 
                            href={provider === 'gemini' ? "https://aistudio.google.com/app/apikey" : provider === 'openai' ? "https://platform.openai.com/api-keys" : "https://console.anthropic.com/settings/keys"} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[9px] text-indigo-500 hover:underline flex items-center gap-0.5"
                          >
                            Get Key <ExternalLink size={8} />
                          </a>
                        </div>
                        <div className="relative group">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
                            <ShieldCheck size={14} />
                          </div>
                          <input 
                            type="password"
                            value={apiKeys[provider] || ''}
                            onChange={(e) => {
                              const newKeys = { ...apiKeys, [provider]: e.target.value };
                              saveConfig(provider, newKeys, selectedModel, baseUrls);
                            }}
                            placeholder={`Paste ${PROVIDERS[provider].name} Key...`}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:border-indigo-400 focus:bg-white transition-all font-mono"
                          />
                        </div>
                      </div>

                      {/* Custom Base URL for OpenAI & Anthropic */}
                      {(provider === 'openai' || provider === 'anthropic') && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Base URL (Optional)</label>
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                              For 3rd party APIs
                            </span>
                          </div>
                          <div className="relative group">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-400 transition-colors">
                              <Globe size={14} />
                            </div>
                            <input 
                              type="text"
                              value={baseUrls[provider] || ''}
                              onChange={(e) => {
                                const newBaseUrls = { ...baseUrls, [provider]: e.target.value };
                                saveConfig(provider, apiKeys, selectedModel, newBaseUrls);
                              }}
                              placeholder={provider === 'openai' ? "https://api.openai.com/v1" : "https://api.anthropic.com"}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs focus:outline-none focus:border-blue-400 focus:bg-white transition-all font-mono"
                            />
                          </div>
                        </div>
                      )}

                      {/* Model Selector */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Model Selection</label>
                          <button
                            onClick={() => detectModels(provider, apiKeys[provider], baseUrls[provider])}
                            disabled={isDetecting || !apiKeys[provider]}
                            className="text-[9px] text-indigo-500 hover:text-indigo-600 font-bold flex items-center gap-1 disabled:opacity-30"
                          >
                            {isDetecting ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                            Refresh List
                          </button>
                        </div>
                        <div className="relative">
                          <select 
                            value={selectedModel}
                            onChange={(e) => saveConfig(provider, apiKeys, e.target.value, baseUrls)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs appearance-none focus:outline-none focus:border-indigo-400 focus:bg-white transition-all pr-10"
                          >
                            {(detectedModels[provider] || PROVIDERS[provider].models).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Help Text */}
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-600">
                      <Sparkle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Pro Tip</span>
                    </div>
                    <p className="text-[11px] text-indigo-700/80 leading-relaxed">
                      {PROVIDERS[provider].description} All keys are stored locally in your browser for security.
                    </p>
                  </div>

                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 group"
                  >
                    Save & Start Writing
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Messages Area */}
                  <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar scroll-smooth"
                  >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-4">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-2 border border-indigo-100">
                    <MessageSquare size={24} className="text-indigo-500" />
                  </div>
                  <h4 className="text-slate-800 font-medium text-sm">Ready to assist</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ask me to rewrite, summarize, or generate new content based on your document.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.prompt)}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 transition-all group"
                    >
                      <action.icon size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={cn(
                  "flex flex-col gap-2",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}
              >
                <div className={cn(
                  "max-w-[85%] p-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm relative group",
                  msg.role === 'user' 
                    ? "bg-indigo-600 text-white rounded-tr-none" 
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                )}>
                  {msg.isActionable ? (
                    <div className="space-y-3">
                      <div className="prose prose-sm max-w-none text-slate-700 leading-normal" dangerouslySetInnerHTML={{ __html: msg.content }} />
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button 
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyChange(msg.content)}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
                        >
                          <Zap size={12} />
                          Apply Changes
                        </button>
                        <button 
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => copyToClipboard(msg.content, i)}
                          className="p-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors text-slate-500"
                          title="Copy to clipboard"
                        >
                          {copiedId === i ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                
                {msg.role === 'ai' && i === messages.length - 1 && !isLoading && (
                  <button 
                    onClick={regenerateLast}
                    className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors ml-1"
                  >
                    <RotateCcw size={10} />
                    Regenerate response
                  </button>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center animate-pulse">
                  <AIIcon size={14} className="text-blue-500" />
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl rounded-tl-none space-y-2 w-full">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 size={12} className="animate-spin text-blue-500" />
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                      {statusMessage || 'AI is thinking...'}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full w-full animate-pulse" />
                  <div className="h-2 bg-slate-200 rounded-full w-5/6 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-50/50 border-t border-l border-slate-200">
            <div className="relative group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={apiKeys[provider] ? "Ask AI to write or edit..." : `Set ${PROVIDERS[provider].name} API Key...`}
                disabled={!apiKeys[provider]}
                className={cn(
                  "w-full bg-white border border-slate-200 rounded-2xl p-3 pr-12 text-sm focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all resize-none h-24 custom-scrollbar placeholder:text-slate-300",
                  !apiKeys[provider] && "opacity-50 cursor-not-allowed"
                )}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading || !apiKeys[provider]}
                  className={cn(
                    "p-2 rounded-xl transition-all duration-300",
                    input.trim() && !isLoading && apiKeys[provider]
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-100" 
                      : "bg-slate-100 text-slate-300 scale-90"
                  )}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            <p className="mt-2 text-[9px] text-center text-slate-300 uppercase tracking-[0.2em]">
              Powered by {PROVIDERS[provider].name}
            </p>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);
};

const SelectionMenu = ({ editor, onAction }: { editor: any, onAction: (prompt: string) => void }) => {
  if (!editor) return null;

  const actions = [
    { label: '改进', icon: Wand2, prompt: 'Improve the writing of the selected text.' },
    { label: '修复语法', icon: Check, prompt: 'Fix any grammar or spelling mistakes in the selected text.' },
    { label: '总结', icon: Zap, prompt: 'Provide a concise summary of the selected text.' },
    { label: '翻译', icon: Languages, prompt: 'Translate the selected text. If it is English, translate it to Chinese. If it is Chinese, translate it to English.' },
  ];

  return (
    <BubbleMenu 
      editor={editor} 
      options={{ 
        placement: 'bottom',
        offset: 20,
        flip: true,
      }}
      className="z-[9999]"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex items-center gap-0.5 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-1.5 px-2 pr-2 border-r border-slate-100">
          <div className="w-5 h-5 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
            <AIIcon size={10} className="text-white" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-0.5">AI</span>
        </div>
        {actions.map((action) => (
          <button
            key={action.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onAction(action.prompt)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-blue-50 transition-all group rounded-lg"
            title={action.label}
          >
            <action.icon size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700 whitespace-nowrap">{action.label}</span>
          </button>
        ))}
      </motion.div>
    </BubbleMenu>
  );
};

const ExportModal = ({ 
  isOpen, 
  onClose, 
  onExport 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onExport: (format: ExportFormat) => void 
}) => {
  const formats = [
    { id: 'docx', name: 'Microsoft Word', ext: '.docx', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'pdf', name: 'PDF文档', ext: '.pdf', icon: ShieldCheck, color: 'text-red-500', bgColor: 'bg-red-50' },
    { id: 'markdown', name: 'Markdown', ext: '.md', icon: Sparkle, color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { id: 'html', name: '网页', ext: '.html', icon: Globe, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
    { id: 'txt', name: '纯文本', ext: '.txt', icon: Type, color: 'text-slate-500', bgColor: 'bg-slate-50' },
    { id: 'rtf', name: '富文本格式', ext: '.rtf', icon: AlignLeft, color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { id: 'epub', name: 'EPUB 电子书', ext: '.epub', icon: Zap, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { id: 'odt', name: 'OpenDocument', ext: '.odt', icon: FileText, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
  ] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          key="export-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[360px] bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="pl-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">导出文档</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-bold uppercase tracking-[0.2em]">选择导出格式</p>
              </div>
              <button 
                onClick={onClose} 
                className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600 active:scale-90"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-1">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => onExport(format.id as ExportFormat)}
                    className="group flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-50 transition-all duration-200 text-left"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-sm", 
                      format.bgColor, 
                      format.color
                    )}>
                      <format.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-700 text-sm">{format.name}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400 uppercase tracking-wider">
                          {format.ext}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Lumina Export Engine</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

type ExportFormat = 'html' | 'markdown' | 'text' | 'docx' | 'pdf' | 'odt' | 'rtf' | 'epub';

export const Editor = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [externalTrigger, setExternalTrigger] = useState<{ prompt: string, timestamp: number } | undefined>(undefined);

  const triggerAI = useCallback((prompt: string) => {
    setIsSidebarOpen(true);
    setExternalTrigger({ prompt, timestamp: Date.now() });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({ multicolor: true }),
      CharacterCount.configure({
        limit: 10000,
      }),
      BubbleMenuExtension,
    ],
    content: `
      <h1>Welcome to Lumina</h1>
      <p>This is a modern, minimalist rich text editor designed for focus and elegance.</p>
      <p>Try out the features:</p>
      <ul>
        <li><strong>Bold</strong>, <em>Italic</em>, and <u>Underline</u></li>
        <li>Custom alignments</li>
        <li>Bullet and numbered lists</li>
        <li>Glassmorphism UI</li>
      </ul>
      <blockquote>
        "Simplicity is the ultimate sophistication." — Leonardo da Vinci
      </blockquote>
    `,
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!editor) return;
    setIsExporting(true);
    
    try {
      let content: string | Blob = '';
      let mimeType = '';
      let extension = '';

      if (format === 'html') {
        content = editor.getHTML();
        mimeType = 'text/html';
        extension = '.html';
      } else if (format === 'markdown') {
        const html = editor.getHTML();
        const turndownService = new TurndownService({
          headingStyle: 'atx',
          codeBlockStyle: 'fenced'
        });
        content = turndownService.turndown(html);
        mimeType = 'text/markdown';
        extension = '.md';
      } else if (format === 'text') {
        content = editor.getText();
        mimeType = 'text/plain';
        extension = '.txt';
      } else if (format === 'docx') {
        const doc = new Document({
          sections: [{
            properties: {},
            children: editor.getText().split('\n').map(line => new Paragraph({
              children: [new TextRun(line)],
            })),
          }],
        });
        content = await Packer.toBlob(doc);
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        extension = '.docx';
      } else if (format === 'pdf') {
        const element = document.querySelector('.tiptap') as HTMLElement;
        if (element) {
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save(`document-${new Date().toISOString().slice(0, 10)}.pdf`);
          setIsExportModalOpen(false);
          setIsExporting(false);
          return;
        }
      } else if (format === 'rtf') {
        // Basic RTF generation
        const text = editor.getText();
        content = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Arial;}} \\f0\\fs24 ${text.replace(/\n/g, '\\par ')}}`;
        mimeType = 'application/rtf';
        extension = '.rtf';
      } else if (format === 'odt' || format === 'epub') {
        // For ODT and EPUB, we'll provide a slightly more structured HTML as a fallback or basic version
        // since full implementation is very complex client-side
        content = editor.getHTML();
        mimeType = format === 'odt' ? 'application/vnd.oasis.opendocument.text' : 'application/epub+zip';
        extension = `.${format}`;
      }

      const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document-${new Date().toISOString().slice(0, 10)}${extension}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExportModalOpen(false);
      setIsExporting(false);
    }
  }, [editor]);

  const handleImport = useCallback(() => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.html,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          editor.commands.setContent(content);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [editor]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="w-full h-screen flex overflow-hidden bg-slate-50"
    >
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        <Toolbar 
          editor={editor} 
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          isSidebarOpen={isSidebarOpen}
          onImport={handleImport}
          onExport={() => setIsExportModalOpen(true)}
        />
        <div className="flex-1 overflow-y-auto relative custom-scrollbar">
          <div className="max-w-4xl mx-auto py-8 px-8">
            <SelectionMenu editor={editor} onAction={triggerAI} />
            <EditorContent editor={editor} />
          </div>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-slate-400 text-[10px] font-mono uppercase tracking-widest bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200 shadow-xl z-10">
            <span>{editor?.storage.characterCount?.characters() || 0} chars</span>
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span>{editor?.storage.characterCount?.words() || 0} words</span>
          </div>
        </div>
      </div>
      
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        onExport={handleExport} 
      />

      {isExporting && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-200 animate-bounce">
              <Download size={24} className="text-white" />
            </div>
            <p className="text-sm font-bold text-slate-900 uppercase tracking-widest animate-pulse">正在准备您的文档...</p>
          </div>
        </div>
      )}
      
      <AISidebar 
        editor={editor} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        externalTrigger={externalTrigger}
        onTriggerHandled={() => setExternalTrigger(undefined)}
      />
    </motion.div>
  );
};
