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

// Vision-capable OpenRouter models we can safely fall back to when the
// configured default model doesn't support image input (most non-vision
// chat models silently ignore image_url parts or error out, which is why
// handwritten-answer photos were coming back unread).
const VISION_MODEL_HINTS = ["gpt-4o", "gpt-4.1", "gemini", "claude-3", "claude-3.5", "claude-3.7", "llama-3.2", "pixtral", "qwen-vl", "vision"];
const DEFAULT_VISION_MODEL = "openai/gpt-4o-mini";

function supportsVision(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return VISION_MODEL_HINTS.some((hint) => id.includes(hint));
}

export async function sendAiMessage(
  messages: ChatMessage[],
  model?: string,
  imageBase64?: string,
  pdfText?: string,
  knowledgeContext?: string,
  imageMimeType?: string
): Promise<{ reply: string; model: string; tokens: number | null }> {
  // Fetch all config values concurrently
  const [apiKey, configModelDefault, systemPrompt] = await Promise.all([
    getConfig("openRouterApiKey"),
    getConfig("aiModel"),
    getConfig("aiSystemPrompt"),
  ]);

  if (!apiKey) throw new Error("OpenRouter API key not configured");

  let configModel = model || configModelDefault || DEFAULT_VISION_MODEL;

  // If an image was attached but the selected model has no vision support,
  // switch to a known vision-capable model for this request rather than
  // silently sending an image the model can't see (this was the "can't OCR
  // handwritten answers" bug — the text-only model just ignored the image).
  if (imageBase64 && !supportsVision(configModel)) {
    configModel = DEFAULT_VISION_MODEL;
  }

  const allMessages: ChatMessage[] = [];

  // Add system prompt
  if (systemPrompt) {
    allMessages.push({ role: "system", content: systemPrompt });
  }

  // Inject knowledge context as a system message so the model sees it before user messages
  if (knowledgeContext) {
    allMessages.push({
      role: "system",
      content: `RELEVANT EDUCATIONAL RESOURCES (use these as your primary source):\n\n${knowledgeContext}\n\nBase your answer on the above resources where possible. Always cite which resource(s) you used by name (e.g. "According to [Resource Name]...").`,
    });
  }

  // Formatting instruction — always present so responses render well in the app
  allMessages.push({
    role: "system",
    content:
      "Format your responses using Markdown: use **bold** for key terms, bullet points or numbered lists for multi-step explanations, and clear headings where helpful. Keep answers well-structured and easy to read.",
  });

  // When an image is attached, explicitly instruct the model to OCR/read it
  // first. Vision models will sometimes give a vague reply ("I can see an
  // image of handwriting") instead of actually transcribing and grading it
  // unless told to — this was the reported "can't OCR handwritten answers" bug.
  if (imageBase64) {
    allMessages.push({
      role: "system",
      content:
        "The user has attached an image, which may contain handwritten or printed text, equations, diagrams, or a handwritten exam answer. First, carefully read and transcribe all visible text/working exactly as written, including any handwriting. Then respond to the user's request using that transcribed content — e.g. check their working, point out mistakes, mark the answer, or explain the topic. Never reply that you cannot read the image without first attempting a full transcription.",
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
          image_url: { url: `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}` },
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
