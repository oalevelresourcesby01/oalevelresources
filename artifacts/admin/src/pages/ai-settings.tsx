import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Bot, Send, Trash2, User, Eye, EyeOff, Save, RefreshCw, FileText } from 'lucide-react';
import {
  useGetAdminConfig,
  useUpdateAdminConfig,
  useGetAiModels,
  useAiChat,
  useClearAiSession
} from '@workspace/api-client-react';

// A simple local session ID generator for the test chat
const generateSessionId = () => Math.random().toString(36).substring(2, 15);

export default function AiSettings() {
  const { toast } = useToast();
  const { data: config, isLoading: configLoading } = useGetAdminConfig();
  const updateConfig = useUpdateAdminConfig();
  const { data: models, isLoading: modelsLoading } = useGetAiModels();
  
  const aiChat = useAiChat();
  const clearSession = useClearAiSession();

  const [formData, setFormData] = useState({
    aiEnabled: false,
    openRouterApiKey: '',
    aiModel: '',
    aiSystemPrompt: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

  // Chat State
  const [sessionId] = useState(generateSessionId);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    relatedResources?: { resourceId: string; resourceName: string }[];
  }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config) {
      setFormData({
        aiEnabled: config.aiEnabled || false,
        openRouterApiKey: '', // Only set if changing
        aiModel: config.aiModel || '',
        aiSystemPrompt: config.aiSystemPrompt || ''
      });
    }
  }, [config]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSaveConfig = async () => {
    try {
      const updateData: any = {
        aiEnabled: formData.aiEnabled,
        aiModel: formData.aiModel,
        aiSystemPrompt: formData.aiSystemPrompt
      };
      
      if (formData.openRouterApiKey) {
        updateData.openRouterApiKey = formData.openRouterApiKey;
      }
      
      await updateConfig.mutateAsync({ data: updateData });
      
      toast({ title: 'AI Settings saved successfully' });
      setFormData(prev => ({ ...prev, openRouterApiKey: '' }));
      
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'An error occurred while saving.'
      });
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    
    try {
      const response = await aiChat.mutateAsync({
        data: {
          message: userMsg,
          sessionId: sessionId,
          model: formData.aiModel || undefined
        }
      });
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.reply,
        relatedResources: (response as any).relatedResources ?? [],
      }]);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Chat failed',
        description: error.message || 'Failed to get response from AI'
      });
    }
  };

  const handleClearChat = async () => {
    try {
      await clearSession.mutateAsync({ sessionId });
    } catch (e) {} // ignore errors on clear
    setMessages([]);
  };

  if (configLoading) {
    return <div className="p-8">Loading configuration...</div>;
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Configuration</h1>
        <p className="text-muted-foreground mt-2">Manage OpenRouter API settings, default models, and system prompts.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="flex flex-col h-[calc(100vh-12rem)]">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure the AI integration parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable AI Features</Label>
                <p className="text-sm text-muted-foreground">Turn on AI-powered chat and analysis.</p>
              </div>
              <Switch
                checked={formData.aiEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, aiEnabled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">OpenRouter API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={formData.openRouterApiKey}
                  onChange={(e) => setFormData({ ...formData, openRouterApiKey: e.target.value })}
                  placeholder={config?.openRouterApiKeySet ? "••••••••••••••••••••••••••••" : "sk-or-v1-..."}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Default Model</Label>
              <Select
                value={formData.aiModel}
                onValueChange={(value) => setFormData({ ...formData, aiModel: value })}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {modelsLoading ? (
                    <SelectItem value="loading" disabled>Loading models...</SelectItem>
                  ) : (
                    models?.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))
                  )}
                  {/* Fallback if models API is empty */}
                  {!models?.length && !modelsLoading && (
                    <SelectItem value="openai/gpt-4o-mini">GPT-4o Mini</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex-1 flex flex-col">
              <Label htmlFor="systemPrompt">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                value={formData.aiSystemPrompt}
                onChange={(e) => setFormData({ ...formData, aiSystemPrompt: e.target.value })}
                placeholder="You are an expert O/A Level teacher..."
                className="flex-1 min-h-[250px] font-mono text-sm resize-none"
              />
            </div>
          </CardContent>
          <div className="p-6 pt-0 mt-auto">
            <Button onClick={handleSaveConfig} disabled={updateConfig.isPending} className="w-full">
              {updateConfig.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Configuration
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col h-[calc(100vh-12rem)]">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Test Sandbox</CardTitle>
              <CardDescription>Test your prompt and model settings here.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClearChat} title="Clear Chat">
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col flex-1 overflow-hidden p-0 border-t border-border/50">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/20"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                  <Bot className="h-12 w-12 mb-4 opacity-20" />
                  <p>No messages yet.</p>
                  <p className="text-sm mt-1">Send a message to test the AI configuration.</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-primary text-primary-foreground ml-3' : 'bg-muted text-muted-foreground mr-3'}`}>
                        {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className={`rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border/50 shadow-sm'}`}>
                          {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none
                              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
                              [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5
                              [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm
                              [&_h3]:text-sm [&_code]:text-xs [&_code]:bg-muted
                              [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                              [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:rounded
                              [&_strong]:font-semibold [&_a]:text-primary">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        {/* PDF source references */}
                        {msg.role === 'assistant' && msg.relatedResources && msg.relatedResources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 px-1">
                            {msg.relatedResources.map((r) => (
                              <span
                                key={r.resourceId}
                                className="inline-flex items-center gap-1 text-xs bg-muted/70 border border-border/60 text-muted-foreground rounded-full px-2 py-0.5"
                              >
                                <FileText className="h-3 w-3 shrink-0" />
                                {r.resourceName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {aiChat.isPending && (
                <div className="flex justify-start">
                  <div className="flex max-w-[80%] flex-row">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground mr-3">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg p-3 text-sm bg-card border border-border/50 shadow-sm flex items-center space-x-1">
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-card border-t border-border/50">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-end gap-2"
              >
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="min-h-[60px] max-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  disabled={!chatInput.trim() || aiChat.isPending || !config?.openRouterApiKeySet && !formData.openRouterApiKey}
                  className="h-[60px] px-6"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
