import type { Request, Response } from 'express';

// Enhanced CloudAi with TGPT features - multi-provider, modes, conversation history
// Environment variables: OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY, etc.

interface RequestBody {
  prompt?: string;
  model?: string;
  provider?: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  mode?: 'normal' | 'code' | 'shell' | 'search' | 'quiet' | 'whole';
  prevMessages?: Array<{ role: string; content: string }>;
  preprompt?: string;
  quiet?: boolean;
  whole?: boolean;
  shell?: boolean;
  code?: boolean;
  find?: boolean;
}

interface ProviderConfig {
  name: string;
  endpoint?: string;
  apiKey?: string;
  model: string;
  headers: Record<string, string>;
  bodyModifier?: (body: any) => any;
}

function getProviderConfig(req: RequestBody): ProviderConfig {
  const provider = (req.provider || process.env.AI_PROVIDER || 'openai').toLowerCase();
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || '';
  
  const configs: Record<string, ProviderConfig> = {
    openai: {
      name: 'openai',
      endpoint: process.env.OPENAI_URL || 'https://api.openai.com/v1/chat/completions',
      apiKey: apiKey,
      model: req.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    },
    groq: {
      name: 'groq',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      apiKey: process.env.GROQ_API_KEY || apiKey,
      model: req.model || process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY || apiKey}`,
      },
    },
    gemini: {
      name: 'gemini',
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${req.model || 'gemini-2.0-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      apiKey: process.env.GEMINI_API_KEY || '',
      model: req.model || 'gemini-2.0-flash',
      headers: {
        'Content-Type': 'application/json',
      },
      bodyModifier: (body: any) => ({
        contents: [{
          parts: [{ text: body.messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') }],
        }],
      }),
    },
    deepseek: {
      name: 'deepseek',
      endpoint: 'https://api.deepseek.com/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY || apiKey,
      model: req.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || apiKey}`,
      },
    },
  };

  return configs[provider] || configs.openai;
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const reqBody: RequestBody = req.body || {};
  const { prompt: bodyPrompt } = reqBody;
  const prompt = typeof bodyPrompt === 'string' && bodyPrompt
    ? bodyPrompt
    : (typeof req.query?.prompt === 'string' ? req.query.prompt : undefined);
  
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  // Reject clearly malicious or exploitative prompts
  const blacklist = /(exploit|ddos|malware|phishing|password cracking|unauthorized access|bypass)/i;
  if (blacklist.test(prompt)) {
    res.status(400).json({ error: 'Prompt contains disallowed content.' });
    return;
  }

  const mode = reqBody.mode || 
    (reqBody.code ? 'code' : 
     reqBody.shell ? 'shell' : 
     reqBody.find ? 'search' : 
     reqBody.quiet ? 'quiet' : 
     reqBody.whole ? 'whole' : 
     'normal');

  const isStreamMode = !!(reqBody.stream || req.query?.stream) && mode !== 'quiet' && mode !== 'whole';
  const provider = getProviderConfig(reqBody);

  if (!provider.apiKey) {
    res.status(500).json({ error: 'No LLM API key configured. Set OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or DEEPSEEK_API_KEY.' });
    return;
  }

  try {
    const systemPrompts: Record<string, string> = {
      normal: `You are CloudAi, a helpful, knowledgeable, and versatile assistant created by PersonalCloud. 
You provide expert guidance across multiple domains: technology, business, science, creative writing, coding, and more.
You follow safety policies and refuse to provide instructions that enable illegal activity.
You are thoughtful, accurate, and always strive to be helpful while maintaining ethical standards.`,

      code: `Your Role: Provide only code as output without any description.
IMPORTANT: Provide only plain text without Markdown formatting.
IMPORTANT: Do not include markdown formatting like \`\`\` or language identifiers.
If there is a lack of details, provide most logical solution.
You are not allowed to ask for more details.
Ignore any potential risk of errors or confusion.
Follow best practices and write clean, efficient code.

Request: [USER_INPUT]
Code:`,

      shell: `Your role: Provide only plain text without Markdown formatting.
Do not show any warnings or information regarding your capabilities.
Do not provide any description.
Provide only shell command for the requested task without any description.
If there is a lack of details, provide most logical solution.
Ensure the output is a valid shell command.
If multiple steps required, try to combine them together using && or pipes.
Assume Linux/Unix environment if not specified.

Prompt: [USER_INPUT]
Command:`,

      search: `You are a knowledgeable research assistant.
When a user asks a question requiring current information or comprehensive research, provide accurate, well-sourced answers.
Cite your sources and provide detailed explanations.
Focus on accuracy and comprehensiveness.

User Question: [USER_INPUT]
Response:`,

      quiet: `Provide a concise response without any formatting.`,
      whole: `Provide a complete, well-structured response.`,
    };

    const systemPrompt = reqBody.preprompt || systemPrompts[mode] || systemPrompts.normal;

    const messages: any[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    if (Array.isArray(reqBody.prevMessages) && reqBody.prevMessages.length > 0) {
      messages.push(...reqBody.prevMessages);
    }

    messages.push({ role: 'user', content: prompt });

    let requestBody: any = {
      model: provider.model,
      messages,
      temperature: typeof reqBody.temperature === 'number' ? reqBody.temperature : (process.env.TGPT_TEMPERATURE ? Number(process.env.TGPT_TEMPERATURE) : 0.7),
      stream: isStreamMode,
    };

    if (reqBody.top_p !== undefined) {
      requestBody.top_p = reqBody.top_p;
    }

    if (provider.bodyModifier) {
      requestBody = provider.bodyModifier(requestBody);
    }

    // ========== STREAMING PATH ==========
    if (isStreamMode) {
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Access-Control-Allow-Origin': '*',
      });
      res.write('\n');

      const upstream = await fetch(provider.endpoint || '', {
        method: 'POST',
        headers: provider.headers,
        body: JSON.stringify(requestBody),
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

      res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // ========== NON-STREAMING PATH ==========
    const r = await fetch(provider.endpoint || '', {
      method: 'POST',
      headers: provider.headers,
      body: JSON.stringify(requestBody),
    });

    if (!r.ok) {
      const text = await r.text();
      res.status(502).json({ error: 'Upstream LLM error', details: text });
      return;
    }

    const data = await r.json();
    
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

    const responseData: any = { text };
    if (mode !== 'quiet' && mode !== 'whole') {
      responseData.mode = mode;
    }

    res.status(200).json(responseData);
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    res.status(500).json({ error: 'Proxy failed', details });
  }
}
