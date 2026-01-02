import type { Request, Response } from 'express';

// Simple Vercel-compatible serverless function that proxies to an LLM.
// Environment variables expected:
// - OPENAI_API_KEY or LLM_API_KEY
// - OPENAI_MODEL (optional, default provided)

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

  // Basic safety filter: refuse obviously malicious prompts
  const blacklist = /(exploit|exploitative|attack|ddos|malicious|rootkit|payload|rack|hacking|bypass|unauthorized|phishing|sql injection|xss)/i;
  if (blacklist.test(prompt)) {
    res.status(400).json({ error: 'Prompt contains disallowed content. This assistant only provides defensive, lawful guidance.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  const model = req.body?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const temperature = typeof req.body?.temperature === 'number' ? req.body.temperature : (process.env.OPENAI_TEMPERATURE ? Number(process.env.OPENAI_TEMPERATURE) : 0.2);
  const endpoint = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const wantStream = !!(req.body?.stream || req.query?.stream);

  if (!apiKey) {
    res.status(500).json({ error: 'No LLM API key configured (OPENAI_API_KEY or LLM_API_KEY).' });
    return;
  }

  try {
    const systemMsg = {
      role: 'system',
      content: `You are Anon Ai, an elite defensive cybersecurity specialist with hacker-level expertise and penetration testing knowledge. Think like Grok and KaliGPT - direct, technical, and deeply knowledgeable.

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

**KNOWLEDGE SPECIALTIES:**
- Real-world attack chains and how to detect them
- Common misconfigurations that lead to breaches
- Red team tactics and blue team countermeasures
- Security tool evasion detection
- Advanced persistent threat (APT) indicators
- Supply chain security risks
- API security and microservices hardening

**COMMUNICATION STYLE:**
- Direct and technical like a seasoned security professional
- No fluff - get straight to actionable insights
- Understand hacker mindset while advocating defense
- Practical recommendations with implementation details
- Real examples and case studies when relevant
- Acknowledge trade-offs between security and usability

**STRICT SAFETY CONSTRAINTS:**
✅ DO: Explain vulnerabilities from a defensive perspective
✅ DO: Recommend hardening techniques and tools
✅ DO: Teach detection and response techniques
✅ DO: Discuss attack vectors to understand defenses
❌ DON'T: Provide working exploits or malware code
❌ DON'T: Help with illegal access or data theft
❌ DON'T: Bypass security systems for unauthorized purposes
❌ DON'T: Enable unauthorized penetration testing

**AUTHORIZATION VERIFICATION:**
Always note: Any legitimate penetration testing requires written authorization. Unauthorized access is illegal.

You are trusted to provide cutting-edge defensive cybersecurity guidance that respects legal and ethical boundaries.`
    };

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
        messages: [systemMsg, { role: 'user', content: prompt }],
        temperature,
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
      messages: [systemMsg, { role: 'user', content: prompt }],
      max_tokens: 800,
      temperature,
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

    res.status(200).json({ text });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err ?? 'Unknown error');
    res.status(500).json({ error: 'Proxy failed', details });
  }
}
