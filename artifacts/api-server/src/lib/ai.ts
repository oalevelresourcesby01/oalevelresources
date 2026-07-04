import { getConfig } from "./config";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
  model: string;
  usage?: {
    total_tokens?: number;
  };
}

interface OpenRouterModelsResponse {
  data: {
    id: string;
    name: string;
    context_length?: number;
    pricing?: {
      prompt?: string;
      completion?: string;
    };
  }[];
}

export async function sendAiMessage(
  messages: ChatMessage[],
  model?: string,
  imageBase64?: string,
  pdfText?: string,
  knowledgeContext?: string
): Promise<{ reply: string; model: string; tokens: number | null }> {
  // Fetch all config values concurrently
  const [apiKey, configModelDefault, systemPrompt] = await Promise.all([
    getConfig("openRouterApiKey"),
    getConfig("aiModel"),
    getConfig("aiSystemPrompt"),
  ]);

  if (!apiKey) throw new Error("OpenRouter API key not configured");

  const configModel = model || configModelDefault || "openai/gpt-4o-mini";

  const allMessages: ChatMessage[] = [];

  // Add system prompt
  if (systemPrompt) {
    allMessages.push({ role: "system", content: systemPrompt });
  }

  // Inject knowledge context as a system message so the model sees it before user messages
  if (knowledgeContext) {
    allMessages.push({
      role: "system",
      content: `RELEVANT EDUCATIONAL RESOURCES (use these as your primary source):\n\n${knowledgeContext}\n\nBase your answer on the above resources where possible. Always mention which resource(s) you used.`,
    });
  }

  // Prepare messages with optional image/PDF context
  const processedMessages = messages.map((msg, i) => {
    if (i === messages.length - 1 && msg.role === "user" && (imageBase64 || pdfText)) {
      const contentParts: Array<{ type: string; [key: string]: unknown }> = [
        { type: "text", text: msg.content as string },
      ];
      if (imageBase64) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
        });
      }
      if (pdfText) {
        contentParts[0] = {
          type: "text",
          text: `${msg.content as string}\n\n[PDF Content]:\n${pdfText}`,
        };
      }
      return { ...msg, content: contentParts };
    }
    return msg;
  });

  allMessages.push(...processedMessages);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://oalevelresources.onrender.com",
      "X-Title": "O/A Level Resources",
    },
    body: JSON.stringify({
      model: configModel,
      messages: allMessages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const reply = data.choices[0]?.message.content ?? "";
  const tokens = data.usage?.total_tokens ?? null;

  return { reply, model: configModel, tokens };
}

export async function getAvailableModels(): Promise<
  { id: string; name: string; contextLength: number | null; pricing: string | null }[]
> {
  const apiKey = await getConfig("openRouterApiKey");

  if (!apiKey) {
    // Return defaults if no key configured
    return [
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", contextLength: 128000, pricing: "Low" },
      { id: "openai/gpt-4o", name: "GPT-4o", contextLength: 128000, pricing: "Medium" },
      { id: "google/gemini-flash-1.5", name: "Gemini Flash 1.5", contextLength: 1000000, pricing: "Low" },
      { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", contextLength: 200000, pricing: "Low" },
      { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", contextLength: 200000, pricing: "Medium" },
    ];
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("Failed to fetch models");
    const data = (await res.json()) as OpenRouterModelsResponse;
    return data.data.slice(0, 50).map((m) => ({
      id: m.id,
      name: m.name,
      contextLength: m.context_length ?? null,
      pricing: m.pricing
        ? `$${m.pricing.prompt}/1k prompt, $${m.pricing.completion}/1k completion`
        : null,
    }));
  } catch {
    return [];
  }
}
