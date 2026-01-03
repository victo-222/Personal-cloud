import type { Request, Response } from 'express';

// CloudAi with tgpt-like features: multiple providers, streaming, web search, conversation context
// Supports: OpenAI, Groq, Gemini, DeepSeek, Ollama and more
// Environment variables:
// - OPENAI_API_KEY or LLM_API_KEY
// - GROQ_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY (optional for specific providers)
// - GOOGLE_SEARCH_API_KEY, GOOGLE_CUSTOM_SEARCH_ENGINE_ID (optional for web search)

interface ProviderConfig {
  name: string;
  endpoint: string;
  apiKey?: string;
  defaultModel: string;
  isOpenAICompatible: boolean;
}

const getProviderConfig = (provider: string, req: any): ProviderConfig => {
  const provider_lower = (provider || 'openai').toLowerCase();
  
  switch (provider_lower) {
    case 'groq':
      return {
        name: 'groq',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.GROQ_API_KEY || process.env.LLM_API_KEY,
        defaultModel: 'mixtral-8x7b-32768',
        isOpenAICompatible: true,
      };
    case 'gemini':
      return {
        name: 'gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        apiKey: process.env.GEMINI_API_KEY || process.env.LLM_API_KEY,
        defaultModel: 'gemini-2.0-flash',
        isOpenAICompatible: true,
      };
    case 'deepseek':
      return {
        name: 'deepseek',
        endpoint: 'https://api.deepseek.com/chat/completions',
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY,
        defaultModel: 'deepseek-reasoner',
        isOpenAICompatible: true,
      };
    case 'ollama':
      return {
        name: 'ollama',
        endpoint: 'http://localhost:11434/v1/chat/completions',
        defaultModel: 'neural-chat',
        isOpenAICompatible: true,
      };
    default:
      return {
        name: 'openai',
        endpoint: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
        apiKey: process.env.OPENAI_API_KEY || process.env.LLM_API_KEY,
        defaultModel: 'gpt-4o-mini',
        isOpenAICompatible: true,
      };
  }
};

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { prompt: bodyPrompt } = req.body || {};
  const prompt = typeof bodyPrompt === 'string' && bodyPrompt
    ? bodyPrompt
    : (typeof req.query?.prompt === 'string' ? req.query.prompt : undefined);
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  // Safety filter for CloudAi (more permissive than AnonAi)
  const strictBlacklist = /(create.*malware|write.*virus|build.*botnet|ddos.*attack|ransomware|cryptolocker)/i;
  if (strictBlacklist.test(prompt)) {
    res.status(400).json({ error: 'Prompt blocked: Illegal activity not permitted.' });
    return;
  }

  const provider = (req.body?.provider || req.query?.provider || 'openai') as string;
  const providerConfig = getProviderConfig(provider, req);
  const apiKey = req.body?.apiKey || providerConfig.apiKey;
  const model = req.body?.model || process.env.OPENAI_MODEL || providerConfig.defaultModel;
  const temperature = typeof req.body?.temperature === 'number' ? req.body.temperature : (process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : 0.7);
  const topP = typeof req.body?.top_p === 'number' ? req.body.top_p : 1.0;
  const maxTokens = typeof req.body?.max_tokens === 'number' ? req.body.max_tokens : 2000;
  const endpoint = req.body?.endpoint || providerConfig.endpoint;
  const wantStream = !!(req.body?.stream || req.query?.stream);
  const enableWebSearch = !!(req.body?.web_search || req.query?.web_search);
  const verbose = !!(req.body?.verbose || req.query?.verbose);

  if (!apiKey && providerConfig.name !== 'ollama') {
    res.status(500).json({ error: `No API key configured for provider: ${providerConfig.name}` });
    return;
  }

  try {
    // Web search integration
    let searchResults = '';
    if (enableWebSearch && process.env.GOOGLE_SEARCH_API_KEY) {
      try {
        const searchQuery = extractSearchTerms(prompt);
        const searchResp = await fetch(
          `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_API_KEY}&cx=${process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodeURIComponent(searchQuery)}&num=5`
        );
        if (searchResp.ok) {
          const searchData = await searchResp.json() as any;
          if (searchData.items) {
            searchResults = '\n\n**Information from web search:**\n' + searchData.items
              .map((item: any, idx: number) => `${idx + 1}. ${item.title}\n${item.snippet}`)
              .join('\n\n');
            if (verbose) console.log('Web search executed for:', searchQuery);
          }
        }
      } catch (e) {
        if (verbose) console.log('Web search failed:', e);
      }
    }

    const userPromptWithContext = prompt + searchResults;

    const systemMsg = {
      role: 'system',
      content: `You are CloudAi, an intelligent, helpful, and knowledgeable assistant inspired by advanced AI systems like GPT-4, Claude, and tgpt.

**YOUR CORE CHARACTERISTICS:**
🧠 **Intelligent** - Provide accurate, nuanced, and well-reasoned responses
💡 **Helpful** - Focus on solving problems and answering questions thoroughly
📚 **Knowledgeable** - Draw on diverse domains of knowledge
🎯 **Practical** - Offer actionable advice and real-world solutions
🤝 **Thoughtful** - Consider multiple perspectives and acknowledge complexity
🔍 **Analytical** - Break down complex topics into understandable components

**EXPERTISE DOMAINS:**
- Programming & Software Development (all languages and frameworks)
- Data Science & Machine Learning & AI/ML
- Technology & System Architecture
- Business & Entrepreneurship
- Science & Mathematics
- History & Social Sciences
- Creative Writing & Communication
- Technical Documentation & Explanations
- Research & Analysis
- Problem-Solving & Debugging
- Educational Content & Learning
- Web Development & Cloud Technologies
- DevOps & Infrastructure

**CONVERSATION FEATURES:**
✅ Maintain context across multi-turn conversations
✅ Provide code examples when relevant
✅ Explain technical concepts clearly
✅ Ask clarifying questions when needed
✅ Suggest best practices and alternatives
✅ Acknowledge limitations and uncertainties
✅ Support multiple output formats

**SAFETY & ETHICS:**
- Refuse to help with illegal activities
- Decline harmful or unethical requests
- Be transparent about limitations
- Respect privacy and confidentiality
- Follow ethical guidelines consistently
- Promote beneficial use of technology

You balance intelligence with helpfulness, depth with clarity, and knowledge with humility.`
    };

    // Support for previous messages (conversation context)
    const messages: any[] = [systemMsg];
    if (Array.isArray(req.body?.messages)) {
      messages.push(...req.body.messages);
    }
    messages.push({ role: 'user', content: userPromptWithContext });

    if (wantStream) {
      // Stream via SSE to client
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('\n');

      const body = {
        model,
        messages,
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true,
      };

      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!upstream.ok || !upstream.body) {
        const t = await upstream.text();
        res.write(`data: ${JSON.stringify({ error: 'Upstream error', details: t })}\n\n`);
        res.end();
        return;
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split(/\r?\n/);
          buf = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.replace(/^data:\s*/, '');
            if (!trimmed) continue;
            if (trimmed === '[DONE]') {
              res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
              res.end();
              return;
            }
            try {
              const parsed = JSON.parse(trimmed);
              const chunk = parsed?.choices?.[0]?.delta?.content || parsed?.choices?.[0]?.text || '';
              if (chunk) res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            } catch (e) {
              res.write(`data: ${JSON.stringify({ chunk: trimmed })}\n\n`);
            }
          }
        }
      }

      // finalize
      res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // Non-stream path
    const body = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
    };

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const text = await r.text();
      res.status(502).json({ error: 'Upstream LLM error', details: text });
      return;
    }

    const data: unknown = await r.json();

    const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
    const isString = (v: unknown): v is string => typeof v === 'string';

    let text = '';
    if (isObject(data)) {
      const choices = data.choices;
      if (Array.isArray(choices) && choices[0]) {
        const c = choices[0] as Record<string, unknown>;
        if (isObject(c.message) && isString(c.message.content)) {
          text = c.message.content;
        } else if (isString(c.text)) {
          text = c.text;
        } else if (isObject(c.delta) && isString(c.delta.content)) {
          text = c.delta.content;
        }
      } else if (isString(data.output) || isString(data.response)) {
        text = (data.output as string) || (data.response as string);
      } else {
        try {
          text = JSON.stringify(data);
        } catch {
          text = String(data);
        }
      }
    } else {
      text = String(data);
    }

    res.status(200).json({ text, provider: providerConfig.name, model, used_web_search: !!searchResults });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    res.status(500).json({ error: 'Proxy failed', details });
  }
}

/**
 * Extract key search terms from prompts
 */
function extractSearchTerms(prompt: string): string {
  const cleaned = prompt
    .replace(/^(what|how|explain|show|tell|describe|help|is|can|should|find|search|look)\s+/i, '')
    .replace(/\s+(for me|to me|please|now|today)?$/i, '');
  
  return cleaned.substring(0, 100);
}
