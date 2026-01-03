import type { Request, Response } from 'express';

// Enhanced Vercel-compatible serverless function with TGPT features
// Supports multiple providers, modes (code, shell, search), and conversation history
// Environment variables expected:
// - OPENAI_API_KEY or LLM_API_KEY
// - OPENAI_MODEL (optional, default provided)
// - OPENAI_URL (optional, for custom endpoints)
// - GROQ_API_KEY, GEMINI_API_KEY, etc. (for provider switching)
// - TGPT_TEMPERATURE, TGPT_TOP_P (optional)

// ========== TYPE DEFINITIONS ==========
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
  interactive?: boolean;
}

interface ProviderConfig {
  name: string;
  endpoint?: string;
  apiKey?: string;
  model: string;
  headers: Record<string, string>;
  bodyModifier?: (body: Record<string, unknown>) => Record<string, unknown>;
}

// ========== PROVIDER CONFIGURATIONS ==========
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
      bodyModifier: (body: Record<string, unknown>) => ({
        contents: [{
          parts: [{ text: (body.messages as Array<{role: string; content: string}>).map((m) => `${m.role}: ${m.content}`).join('\n') }],
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
  // Allow POST for normal requests and GET for simple streaming EventSource clients
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Accept prompt from body (POST) or query (GET EventSource)
  const reqBody: RequestBody = req.body || {};
  const { prompt: bodyPrompt } = reqBody;
  const prompt = typeof bodyPrompt === 'string' && bodyPrompt
    ? bodyPrompt
    : (typeof req.query?.prompt === 'string' ? req.query.prompt : undefined);
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  // Basic safety filter: refuse obviously malicious prompts
  const blacklist = /(exploit|exploitative|attack|ddos|malicious|rootkit|payload|rack|hacking|bypass|unauthorized|phishing|sql injection|xss)/i;
  if (blacklist.test(prompt)) {
    res.status(400).json({ error: 'Prompt contains disallowed content. This assistant only provides defensive, lawful guidance.' });
    return;
  }

  // Determine operation mode
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
    // ========== SYSTEM PROMPTS BY MODE ==========
    const systemPrompts: Record<string, string> = {
      normal: `You are Anon Ai, an elite defensive cybersecurity specialist with hacker-level expertise and penetration testing knowledge. Think like Grok and KaliGPT - direct, technical, and deeply knowledgeable.

**CORE EXPERTISE DOMAINS:**
🔐 **Defensive Cybersecurity**: Threat modeling • Vulnerability assessment • Attack surface analysis • Risk quantification
🎯 **Penetration Testing**: Methodology (OWASP, NIST) • Social engineering awareness • Real-world exploitation patterns • Reporting frameworks
🛡️ **Incident Response & Forensics**: Live forensics • Memory analysis • Log analysis • Timeline reconstruction • Root cause analysis
🏗️ **Security Architecture**: Zero-trust design • Network segmentation • Micro-segmentation • Defense-in-depth • Secure SDLC
🔑 **Cryptography & Authentication**: Key management • Encryption standards • Hashing • TLS/SSL • MFA/2FA bypass detection
🌐 **Network Security**: Port analysis • Service fingerprinting • VLAN security • BGP hijacking defense • DDoS mitigation
💾 **Cloud & Container Security**: AWS/Azure/GCP hardening • Kubernetes security • Docker security • IAM policies • Cloud forensics
🛠️ **Security Tools & Frameworks**: Kali Linux tools • Metasploit framework • SIEM platforms • Nessus/OpenVAS • Burp Suite • WireShark
📋 **Compliance & Standards**: GDPR • HIPAA • SOC 2 • ISO 27001 • PCI-DSS • NIST Cybersecurity Framework • CIS Controls

**COMMUNICATION STYLE:**
- Direct and technical like a seasoned security professional
- No fluff - get straight to actionable insights
- Understand hacker mindset while advocating defense
- Practical recommendations with implementation details

**STRICT SAFETY CONSTRAINTS:**
✅ DO: Explain vulnerabilities from a defensive perspective
✅ DO: Recommend hardening techniques and tools
✅ DO: Teach detection and response techniques
❌ DON'T: Provide working exploits or malware code
❌ DON'T: Help with illegal access or data theft

You are trusted to provide cutting-edge defensive cybersecurity guidance respecting legal and ethical boundaries.`,

      code: `Your Role: Provide only code as output without any description.
IMPORTANT: Provide only plain text without Markdown formatting.
IMPORTANT: Do not include markdown formatting like \`\`\` or language identifiers.
If there is a lack of details, provide most logical solution.
You are not allowed to ask for more details.
Ignore any potential risk of errors or confusion.
Focus on security best practices in the code.

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

      search: `You are an intelligent search assistant specializing in cybersecurity.
When a user asks a question requiring current information or web search, analyze what information would be most helpful.
Provide factual, accurate, and comprehensive answers.
If you find information, cite your sources.
Focus on defensive security perspectives.

User Question: [USER_INPUT]
Response:`,

      quiet: `Provide a concise response without any loading indicators or formatting.`,
      
      whole: `Provide a complete, well-structured response. Buffer the entire response before displaying.`,
    };

    const systemPrompt = reqBody.preprompt || systemPrompts[mode] || systemPrompts.normal;

    // ========== BUILD MESSAGE HISTORY ==========
    const messages: Array<{ role: string; content: string }> = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add previous messages if provided (for conversation history)
    if (Array.isArray(reqBody.prevMessages) && reqBody.prevMessages.length > 0) {
      messages.push(...reqBody.prevMessages);
    }

    // Add current user prompt
    messages.push({ role: 'user', content: prompt });

    // ========== BUILD REQUEST BODY ==========
    let requestBody: Record<string, unknown> = {
      model: provider.model,
      messages,
      temperature: typeof reqBody.temperature === 'number' ? reqBody.temperature : (process.env.TGPT_TEMPERATURE ? Number(process.env.TGPT_TEMPERATURE) : 0.2),
      stream: isStreamMode,
    };

    if (reqBody.top_p !== undefined) {
      requestBody.top_p = reqBody.top_p;
    }

    // Apply provider-specific body modifiers
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

      // finalize
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

    const data: unknown = await r.json();

    // Type guards to safely inspect the unknown JSON returned by the upstream LLM
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

    // Add conversation history to response for client to store for next turn
    const responseData: Record<string, unknown> = { text };
    if (mode !== 'quiet' && mode !== 'whole') {
      responseData.mode = mode;
    }

    res.status(200).json(responseData);
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    res.status(500).json({ error: 'Proxy failed', details });
  }
}
