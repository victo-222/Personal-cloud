# Anon AI & Cloud AI - tgpt Features Implementation

## Overview
Successfully enhanced both Anon AI and Cloud AI with features inspired by the popular `aandrew-me/tgpt` tool. These AI systems now support multiple providers, streaming responses, web search, and advanced conversational capabilities.

## Features Added

### 1. Multiple AI Provider Support
Both Anon AI and Cloud AI now support multiple AI providers, allowing users to choose their preferred service:

**Supported Providers:**
- **OpenAI** (default) - GPT-4, GPT-3.5, etc.
- **Groq** - Fast inference with Mixtral models
- **Gemini** - Google's advanced models
- **DeepSeek** - Reasoning-focused models
- **Ollama** - Local model support

**Configuration:**
```bash
# Set via environment variables
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...

# Or pass at runtime in API calls
POST /api/anon-ai
{
  "prompt": "Your query",
  "provider": "groq",
  "model": "mixtral-8x7b-32768"
}
```

### 2. Streaming Responses
Both APIs support Server-Sent Events (SSE) streaming for real-time response delivery.

**Usage:**
```javascript
const eventSource = new EventSource(`/api/anon-ai?prompt=Hello&stream=true`);
eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log(data.chunk); // Print each chunk as it arrives
});
eventSource.addEventListener('done', () => {
  eventSource.close();
});
```

### 3. Web Search Integration
Optional web search capability using Google Custom Search API.

**Features:**
- Search result aggregation
- Content extraction and synthesis
- Integration with AI responses
- Optional verbose logging

**Configuration:**
```bash
GOOGLE_SEARCH_API_KEY=your-api-key
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your-engine-id
```

**Usage:**
```bash
POST /api/anon-ai
{
  "prompt": "Latest security vulnerabilities",
  "web_search": true,
  "verbose": true
}
```

### 4. Advanced Conversation Context
Both APIs support multi-turn conversations by maintaining message history.

**Usage:**
```javascript
// Send conversation with history
const response = await fetch('/api/cloud-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: "Continue our discussion",
    messages: [
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Follow-up question' }
    ]
  })
});
```

### 5. Configurable Parameters
Fine-tune response behavior with parameters:

- `temperature` (0.0-2.0) - Response creativity
- `top_p` (0.0-1.0) - Nucleus sampling
- `max_tokens` - Response length limit
- `endpoint` - Custom API endpoint
- `stream` - Enable SSE streaming
- `verbose` - Debug output

**Example:**
```javascript
{
  "prompt": "Explain quantum computing",
  "temperature": 0.3,      // More focused
  "max_tokens": 1500,      // Longer response
  "top_p": 0.8,
  "stream": true
}
```

## Anon AI Enhancements

### System Prompt Features
Anon AI now has an expert-level cybersecurity system prompt covering:

**Core Expertise Domains:**
- 🔐 Defensive Cybersecurity
- 🎯 Penetration Testing
- 🛡️ Incident Response & Forensics
- 🏗️ Security Architecture
- �� Cryptography & Authentication
- 🌐 Network Security
- 💾 Cloud & Container Security
- 🛠️ Security Tools & Frameworks
- 📋 Compliance & Standards
- 🔄 Malware Analysis & Reverse Engineering

**Advanced Topics:**
- Real APT techniques and TTPs (MITRE ATT&CK)
- Supply chain security risks
- Kubernetes escape techniques
- Memory corruption exploitation
- UEFI/firmware security
- Side-channel attacks
- Zero-day research methodologies
- Security vs. usability trade-offs

### Safety Features
- Context-aware malware detection
- Illegal activity prevention
- Working exploit code blocks
- Unauthorized access detection
- Ethical boundary enforcement

## Cloud AI Enhancements

### System Prompt Features
Cloud AI provides intelligent, helpful assistance across all domains:

**Expertise Areas:**
- Programming & Software Development
- Data Science & Machine Learning
- Technology & System Architecture
- Business & Entrepreneurship
- Science & Mathematics
- Creative Writing & Communication
- Research & Analysis
- Problem-Solving & Debugging

**Conversation Features:**
- ✅ Multi-turn context awareness
- ✅ Code examples with best practices
- ✅ Multiple output format support
- ✅ Clarifying questions for ambiguous requests
- ✅ Alternative approaches and perspectives

### Safety & Ethics
- Illegal activity refusal
- Privacy protection
- Ethical guideline compliance
- Transparency about limitations
- Beneficial technology promotion

## API Endpoints

### Anon AI (Cybersecurity Focused)
```
POST /api/anon-ai
GET /api/anon-ai?prompt=query&provider=openai&stream=true
```

### Cloud AI (General Purpose)
```
POST /api/cloud-ai
GET /api/cloud-ai?prompt=query&provider=gemini&stream=true
```

### Cloud AI Stream (Optimized Streaming)
```
GET /api/cloud-ai-stream?prompt=query&model=gpt-4o&temperature=0.7
POST /api/cloud-ai-stream
```

## Configuration Examples

### Gmail with Groq Provider
```env
GROQ_API_KEY=gsk_xxxxx
OPENAI_TEMPERATURE=0.3
```

### Gemini with Web Search
```env
GEMINI_API_KEY=AIzaxxxx
GOOGLE_SEARCH_API_KEY=xxxxx
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=xxxxx
```

### Local Ollama Integration
```env
# No API key needed for local Ollama
# Make sure Ollama is running on localhost:11434
```

## Response Format

### Streaming Response
```json
{
  "chunk": "response text piece"
}
```

### Standard Response
```json
{
  "text": "complete response",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "used_web_search": false
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional error context"
}
```

## Performance Optimizations

1. **Chunked Streaming** - Responses delivered in real-time chunks
2. **Provider Selection** - Choose faster providers for latency-sensitive tasks
3. **Temperature Control** - Optimize inference speed vs. quality
4. **Search Query Optimization** - Smart extraction of search terms
5. **Context Window Management** - Efficient conversation history handling

## Security Features

✅ **Anon AI Safety Filters:**
- Malware reference detection
- Illegal activity prevention
- Working exploit code blocking
- Unauthorized access method detection
- Automated compliance checking

✅ **Cloud AI Safety Filters:**
- Strict illegal activity detection
- Privacy and ethical enforcement
- Beneficial use promotion
- Transparent limitation disclosure

✅ **General Security:**
- HTTPS/TLS support
- API key environment variable protection
- Request validation
- Safe error messaging

## Files Modified

1. **api/anon-ai.ts** - Complete rewrite with tgpt features
2. **api/cloud-ai.ts** - Enhanced with streaming and multiple providers
3. **api/cloud-ai-stream.ts** - Updated system prompt with advanced capabilities

## Usage Examples

### Cybersecurity Query with Anon AI
```bash
curl -X POST http://localhost:3001/api/anon-ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "How to detect ransomware in a network?",
    "provider": "groq",
    "web_search": true,
    "temperature": 0.2
  }'
```

### General Query with Cloud AI (Streaming)
```bash
curl -X GET "http://localhost:3001/api/cloud-ai?prompt=Explain%20recursion&stream=true&provider=gemini"
```

### Multi-turn Conversation
```bash
curl -X POST http://localhost:3001/api/cloud-ai \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are its disadvantages?",
    "messages": [
      {"role": "user", "content": "Tell me about microservices"},
      {"role": "assistant", "content": "Microservices is an architecture pattern..."},
      {"role": "user", "content": "What are the advantages?"},
      {"role": "assistant", "content": "Key advantages include..."}
    ]
  }'
```

## Future Enhancements

- [ ] Rate limiting and usage tracking
- [ ] Conversation history persistence
- [ ] Advanced search result ranking
- [ ] Multi-modal support (images, files)
- [ ] Custom system prompts per user
- [ ] Response caching and deduplication
- [ ] Analytics and logging
- [ ] Prompt injection detection
- [ ] Cost tracking per provider

## Testing

All APIs have been tested and verified:
- ✅ TypeScript compilation
- ✅ Multiple provider support
- ✅ Streaming responses
- ✅ Web search integration
- ✅ Conversation context
- ✅ Error handling
- ✅ Safety filters
- ✅ Production build success

---

**Last Updated:** January 3, 2026
**Version:** 2.0.0 (tgpt Integration)
