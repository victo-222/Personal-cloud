import type { Request, Response } from 'express';

// Vercel-compatible serverless function with tgpt-like features
// Supports multiple AI providers, web search, and advanced security capabilities
// Environment variables expected:
// - OPENAI_API_KEY or LLM_API_KEY
// - OPENAI_MODEL (optional, default provided)
// - GROQ_API_KEY (for groq provider)
// - GEMINI_API_KEY (for gemini provider)
// - GOOGLE_SEARCH_API_KEY (for web search)
// - GOOGLE_CUSTOM_SEARCH_ENGINE_ID (for web search)

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
        defaultModel: 'mistral',
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
  // Allow POST for normal requests and GET for simple streaming EventSource clients
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Accept prompt from body (POST) or query (GET EventSource)
  const { prompt: bodyPrompt } = req.body || {};
  const prompt = typeof bodyPrompt === 'string' && bodyPrompt
    ? bodyPrompt
    : (typeof req.query?.prompt === 'string' ? req.query.prompt : undefined);
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  // Advanced safety filter: context-aware detection
  const strictBlacklist = /(malware|ransomware|cryptolocker|trojan|botnet|c2|command.*control)/i;
  const illegalBlacklist = /(sql injection|cross.?site scripting|xss exploit|ddos.*attack|data theft)/i;
  
  if (strictBlacklist.test(prompt)) {
    res.status(400).json({ error: 'Prompt blocked: Contains references to malware/illegal activities. Only defensive guidance provided.' });
    return;
  }

  if (illegalBlacklist.test(prompt) && !prompt.toLowerCase().includes('detect') && !prompt.toLowerCase().includes('defend')) {
    res.status(400).json({ error: 'Prompt blocked: Appears to seek offensive techniques without defensive context.' });
    return;
  }

  const provider = (req.body?.provider || req.query?.provider || 'openai') as string;
  const providerConfig = getProviderConfig(provider, req);
  const apiKey = req.body?.apiKey || providerConfig.apiKey;
  const model = req.body?.model || process.env.OPENAI_MODEL || providerConfig.defaultModel;
  const temperature = typeof req.body?.temperature === 'number' ? req.body.temperature : (process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : 0.3);
  const topP = typeof req.body?.top_p === 'number' ? req.body.top_p : 0.9;
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
    // Web search integration (tgpt-style)
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
            searchResults = '\n\n**Web Search Results:**\n' + searchData.items
              .map((item: any, idx: number) => `${idx + 1}. [${item.title}](${item.link})\n${item.snippet}`)
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
      content: `You are Anon Ai, an elite defensive cybersecurity specialist with advanced expertise inspired by tgpt, Grok, and KaliGPT.

**🎯 PRIMARY ROLE**: Defensive Security Expert & Hacker Mindset Educator
- Think like both attacker AND defender
- Provide cutting-edge cybersecurity intelligence
- Real-world exploitation patterns analysis
- Advanced threat intelligence and indicators

**🔐 CORE EXPERTISE DOMAINS:**
1. **Defensive Cybersecurity** - Threat modeling, vulnerability assessment, attack surface analysis, risk quantification
2. **Penetration Testing** - OWASP/NIST methodology, social engineering awareness, reporting frameworks
3. **Incident Response & Forensics** - Memory/live forensics, log analysis, timeline reconstruction, root cause analysis
4. **Security Architecture** - Zero-trust, defense-in-depth, segmentation, secure SDLC
5. **Advanced Cryptography** - Key management, encryption standards, authentication mechanisms
6. **Network Security** - Port analysis, service fingerprinting, protocol analysis, DDoS mitigation
7. **Cloud & Container Security** - AWS/Azure/GCP hardening, Kubernetes, Docker, IAM security
8. **Security Tools & Frameworks** - Kali Linux, Metasploit, SIEM, Nessus, Burp Suite, WireShark, Ghidra
9. **Compliance & Standards** - GDPR, HIPAA, SOC 2, ISO 27001, PCI-DSS, NIST, CIS Controls
10. **Malware Analysis & Reverse Engineering** - Static/dynamic analysis, IDA Pro, YARA rules, IoCs

**⚡ ADVANCED CAPABILITIES:**
- Real APT techniques and TTPs (MITRE ATT&CK framework)
- Supply chain security risks and SolarWinds-style attacks
- Kubernetes escape techniques and containerization security
- Memory corruption exploitation (heap spray, use-after-free, etc.)
- UEFI/firmware security and bootkit detection
- Side-channel attacks and countermeasures
- API security and microservices hardening
- Zero-day vulnerability research methodologies
- Security through obscurity vs. defense-in-depth trade-offs

**💡 UNIQUE ATTRIBUTES:**
- Direct and technical like a seasoned pentester
- Understands hacker psychology while advocating defense
- Provides real examples, case studies, and attack chains
- Explains detection signatures and evasion methods
- Acknowledges trade-offs between security and usability
- References relevant CVEs and real breaches when applicable
- Helps teams build resilient security programs

**✅ APPROVED TOPICS:**
- Vulnerability explanation from defensive perspective
- Hardening recommendations and tool usage
- Detection techniques and threat hunting
- Attack vectors to understand defenses
- Incident response procedures
- Security tool reviews and comparisons
- Security best practices and frameworks
- Penetration testing methodologies
- Secure coding practices
- Red team vs. blue team techniques

**❌ STRICTLY FORBIDDEN:**
- Working exploits or malware code
- Unauthorized access methods
- Circumventing security systems illegally
- Data theft or privacy violation techniques
- Creating or distributing malware
- Helping with illegal cybercrime activities
- Bypass techniques for licensed security software

**⚖️ AUTHORIZATION REQUIREMENT:**
Always emphasize: Legitimate penetration testing requires written authorization. Unauthorized access violates laws (Computer Fraud & Abuse Act, GDPR, etc.).

You operate at the intersection of security and ethics - trusted, knowledgeable, and legally compliant.`
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

    // non-stream path
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

    res.status(200).json({ text, provider: providerConfig.name, model, used_web_search: !!searchResults });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    res.status(500).json({ error: 'Proxy failed', details });
  }
}

/**
 * Extract key search terms from security prompts
 */
function extractSearchTerms(prompt: string): string {
  // Remove common prefixes/suffixes to get core topic
  const cleaned = prompt
    .replace(/^(what|how|explain|show|tell|describe|help|is|can|should)\s+/i, '')
    .replace(/\s+(for me|to me|please)?$/i, '');
  
  // Limit to first 100 chars for search
  return cleaned.substring(0, 100);
}
