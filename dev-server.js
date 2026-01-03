import express from 'express';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';

const app = express();
const port = process.env.DEV_PROXY_PORT || 3001;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080').split(',').map(o => o.trim());
const MAX_REQUEST_SIZE = '1mb';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // max requests per window

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(REQUEST_TIMEOUT);
  res.setTimeout(REQUEST_TIMEOUT);
  next();
});

// Body parser with size limit
app.use(bodyParser.json({ limit: MAX_REQUEST_SIZE }));
app.use(bodyParser.text({ limit: MAX_REQUEST_SIZE }));

// Security headers middleware
app.use((req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.openai.com https://api.groq.com https://generativelanguage.googleapis.com https://api.deepseek.com");
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy (Feature Policy)
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  
  // Strict Transport Security (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// CORS middleware - only allow specific origins
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '3600');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Rate limiting middleware (simple in-memory)
const requestCounts = new Map();
app.use((req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, []);
  }
  
  const timestamps = requestCounts.get(clientId);
  const recentRequests = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  recentRequests.push(now);
  requestCounts.set(clientId, recentRequests);
  
  next();
});

// Request validation middleware
app.use((req, res, next) => {
  // Validate Content-Type for POST requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  
  next();
});

// Request logging middleware (security events)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} (${duration}ms) from ${req.ip}`);
    }
  });
  next();
});

const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const endpoint = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';

// Enhanced security blacklist
const blacklist = /(exploit|exploitative|attack|ddos|malicious|rootkit|payload|rack|hacking|bypass|unauthorized|phishing|sql injection|xss|script injection|command injection|buffer overflow|privilege escalation|zero day|worm|trojan|ransomware|botnet)/i;

// Input sanitization function
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Remove potential script tags (defense in depth)
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.post('/api/anon-ai', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (typeof prompt !== 'string') return res.status(400).json({ error: 'Invalid prompt format' });
    
    const sanitized = sanitizeInput(prompt);
    if (blacklist.test(sanitized)) return res.status(400).json({ error: 'Disallowed prompt' });
    if (!apiKey) return res.status(500).json({ error: 'No API key in env' });

    const body = {
      model,
      messages: [
        { role: 'system', content: 'You are Anon Ai, a defensive cybersecurity assistant. Provide high-level, lawful guidance only.' },
        { role: 'user', content: sanitized },
      ],
      max_tokens: 800,
      temperature: 0.2,
    };
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      timeout: REQUEST_TIMEOUT,
    });
    const data = await r.json();
    let text = '';
    if (data.choices && data.choices[0]) {
      text = data.choices[0].message?.content || data.choices[0].text || JSON.stringify(data);
    } else text = JSON.stringify(data);
    res.json({ text });
  } catch (err) {
    console.error('Anon AI error:', err.message);
    res.status(500).json({ error: 'Request failed' });
  }
});

app.post('/api/cloud-ai', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (typeof prompt !== 'string') return res.status(400).json({ error: 'Invalid prompt format' });
    
    const sanitized = sanitizeInput(prompt);
    if (blacklist.test(sanitized)) return res.status(400).json({ error: 'Disallowed prompt' });
    if (!apiKey) return res.status(500).json({ error: 'No API key in env' });

    const body = {
      model,
      messages: [
        { role: 'system', content: 'You are CloudAi, a helpful assistant. Follow safety policies.' },
        { role: 'user', content: sanitized },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      timeout: REQUEST_TIMEOUT,
    });
    const data = await r.json();
    let text = '';
    if (data.choices && data.choices[0]) {
      text = data.choices[0].message?.content || data.choices[0].text || JSON.stringify(data);
    } else text = JSON.stringify(data);
    res.json({ text });
  } catch (err) {
    console.error('Cloud AI error:', err.message);
    res.status(500).json({ error: 'Request failed' });
  }
});

// SSE stream endpoint: calls LLM once, then streams chunks
app.post('/api/cloud-ai-stream', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (typeof prompt !== 'string') return res.status(400).json({ error: 'Invalid prompt format' });
    
    const sanitized = sanitizeInput(prompt);
    if (blacklist.test(sanitized)) return res.status(400).json({ error: 'Disallowed prompt' });
    if (!apiKey) return res.status(500).json({ error: 'No API key in env' });

    // Use OpenAI-style streaming: request stream:true and proxy chunks to EventSource client
    const body = {
      model,
      messages: [
        { role: 'system', content: 'You are CloudAi, a helpful assistant. Follow safety policies.' },
        { role: 'user', content: sanitized },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      stream: true,
    };

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      timeout: REQUEST_TIMEOUT,
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(502).json({ error: 'Upstream error' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
    });

    // stream NDJSON-like chunks from upstream and forward content diffs
    let buffer = '';
    r.body.on('data', (chunk) => {
      buffer += chunk.toString();
      let lines = buffer.split(/\n\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const l = line.trim();
        if (!l) continue;
        // upstream lines may start with "data:"
        const dataLine = l.replace(/^data:\s*/i, '');
        if (dataLine === '[DONE]') {
          res.write('event: done\ndata: {}\n\n');
          res.end();
          return;
        }
        try {
          const parsed = JSON.parse(dataLine);
          // OpenAI chat streaming provides delta pieces
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
          }
        } catch (e) {
          // if not JSON, forward raw
          res.write(`data: ${JSON.stringify({ chunk: dataLine })}\n\n`);
        }
      }
    });

    r.body.on('end', () => {
      try {
        res.write('event: done\ndata: {}\n\n');
      } catch (e) { console.debug('dev-server: error in handler', e); }
      res.end();
    });

    r.body.on('error', (err) => {
      try { res.write(`data: ${JSON.stringify({ chunk: '\n[stream error]' })}\n\n`); } catch (e) { console.debug('dev-server: failed to write stream error', e); }
      res.end();
    });
  } catch (err) {
    console.error('Stream error:', err.message);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Support GET for EventSource streaming (EventSource uses GET)
app.get('/api/cloud-ai-stream', async (req, res) => {
  try {
    const prompt = req.query.prompt;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    if (typeof prompt !== 'string') return res.status(400).json({ error: 'Invalid prompt format' });
    
    const sanitized = sanitizeInput(prompt);
    if (blacklist.test(sanitized)) return res.status(400).json({ error: 'Disallowed prompt' });
    if (!apiKey) return res.status(500).json({ error: 'No API key in env' });

    const body = {
      model,
      messages: [
        { role: 'system', content: 'You are CloudAi, a helpful assistant. Follow safety policies.' },
        { role: 'user', content: sanitized },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    };
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      timeout: REQUEST_TIMEOUT,
    });
    const data = await r.json();
    let text = '';
    if (data.choices && data.choices[0]) {
      text = data.choices[0].message?.content || data.choices[0].text || JSON.stringify(data);
    } else text = JSON.stringify(data);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
    });

    const chunkSize = 120;
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      await new Promise((r) => setTimeout(r, 80));
    }
    res.write('event: done\ndata: {}\n\n');
    res.end();
  } catch (err) {
    console.error('Stream GET error:', err.message);
    res.status(500).json({ error: 'Request failed' });
  }
});

// Contact form endpoint - tries SendGrid, falls back to SMTP/sendmail via nodemailer
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing name, email or message' });
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    
    // Validate and sanitize inputs
    if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid input types' });
    }
    
    const sanitizedName = sanitizeInput(name).substring(0, 200);
    const sanitizedMessage = sanitizeInput(message).substring(0, 5000);
    
    // Check for blocked patterns in message
    if (blacklist.test(sanitizedMessage)) {
      return res.status(400).json({ error: 'Message contains disallowed content' });
    }

    const recipient = process.env.CONTACT_RECIPIENT || 'bobclein1@gmail.com';
    const sendGridKey = process.env.SENDGRID_API_KEY;
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true';

    const plain = `Contact form message from ${sanitizedName} <${email}>:\n\n${sanitizedMessage}`;
    const html = `<p><strong>From:</strong> ${sanitizedName} &lt;${email}&gt;</p><p><strong>Message:</strong></p><p>${sanitizedMessage.replace(/\n/g, '<br/>')}</p>`;

    // Try SendGrid first
    if (sendGridKey) {
      const payload = {
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: process.env.SENDGRID_FROM || 'no-reply@personalcloud.local', name: 'PersonalCloud Contact' },
        subject: `New contact message from ${sanitizedName}`,
        content: [
          { type: 'text/plain', value: plain },
          { type: 'text/html', value: html },
        ],
      };

      const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sendGridKey}` },
        body: JSON.stringify(payload),
        timeout: REQUEST_TIMEOUT,
      });

      if (r.status >= 200 && r.status < 300) {
        console.log('Contact: sent via SendGrid');
        return res.json({ ok: true, via: 'sendgrid' });
      }

      const txt = await r.text();
      console.error('SendGrid send failed', r.status);
      // continue to fallback
    }

    // Fallback: SMTP via nodemailer
    if (smtpHost || process.env.SMTP_SENDMAIL === 'true') {
      let transporter;
      if (smtpHost) {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort || 587,
          secure: !!smtpSecure,
          auth: smtpUser ? { user: smtpUser, pass: smtpPass } : undefined,
        });
      } else {
        transporter = nodemailer.createTransport({ sendmail: true, newline: 'unix', path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail' });
      }

      const mail = {
        from: process.env.SMTP_FROM || 'PersonalCloud <no-reply@personalcloud.local>',
        to: recipient,
        subject: `New contact message from ${sanitizedName}`,
        text: plain,
        html,
      };

      const info = await transporter.sendMail(mail);
      console.log('Contact: sent via SMTP/sendmail');
      const preview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : undefined;
      return res.json({ ok: true, via: smtpHost ? 'smtp' : 'sendmail', preview });
    }

    // Development fallback: create Ethereal test account to simulate delivery
    if (process.env.NODE_ENV !== 'production') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });

        const mail = {
          from: `Ethereal Test <${testAccount.user}>`,
          to: recipient,
          subject: `New contact message from ${sanitizedName}`,
          text: plain,
          html,
        };

        const info = await transporter.sendMail(mail);
        const preview = nodemailer.getTestMessageUrl(info);
        console.log('Contact: sent via Ethereal test account');
        return res.json({ ok: true, via: 'ethereal', preview });
      } catch (err) {
        console.error('Ethereal send failed', err.message);
        // continue to error below
      }
    }

    // Nothing configured
    return res.status(500).json({ error: 'No mailer configured. Set SENDGRID_API_KEY or SMTP_HOST/SMTP_SENDMAIL to enable sending emails, or run in dev mode to use a test Ethereal account.' });
  } catch (err) {
    console.error('Contact send error', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// Health and root endpoints to avoid "Cannot GET /" when visiting the proxy
app.get('/health', (req, res) => res.json({ ok: true, version: process.env.npm_package_version || 'dev' }));

app.get('/', (req, res) => {
  res.send(`<html><body style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
    <h2>Dev Proxy Running</h2>
    <p>Available API endpoints:</p>
    <ul>
      <li><code>/api/contact</code></li>
      <li><code>/api/cloud-ai</code> (POST proxy)</li>
      <li><code>/api/anon-ai</code> (POST proxy)</li>
      <li><code>/api/cloud-ai-stream</code> (POST/GET streaming proxy)</li>
    </ul>
    <p>Frontend (Vite) typically runs on port 8080; this proxy is for API calls on port ${port}.</p>
  </body></html>`);
});

app.listen(port, () => console.log(`Dev proxy listening on ${port}`));
