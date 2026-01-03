# Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented in PersonalCloud to protect against common web vulnerabilities and attacks.

---

## 1. Security Headers & Protection Mechanisms

### 1.1 X-Content-Type-Options: nosniff
**Purpose:** Prevents MIME type sniffing attacks
- Browsers must respect the Content-Type header
- Prevents execution of files with incorrect MIME types

### 1.2 X-Frame-Options: DENY
**Purpose:** Clickjacking prevention
- Prevents the website from being embedded in iframes
- Stops malicious websites from framing your content

### 1.3 X-XSS-Protection: 1; mode=block
**Purpose:** XSS attack prevention
- Enables browser's built-in XSS protection
- Blocks page if XSS attack is detected

### 1.4 Content-Security-Policy (CSP)
**Current Policy:**
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https://api.openai.com https://api.groq.com 
           https://generativelanguage.googleapis.com https://api.deepseek.com
```

**Benefits:**
- Prevents inline script execution (XSS mitigation)
- Controls external resource loading
- Allows only whitelisted API endpoints
- Reduces attack surface significantly

### 1.5 Referrer-Policy: strict-origin-when-cross-origin
**Purpose:** Privacy & security
- Only sends referrer when navigating to same origin
- Prevents sensitive data leakage in referrer headers

### 1.6 Permissions-Policy
**Denied Permissions:**
- Geolocation
- Microphone
- Camera
- Payment

**Purpose:** Restricts dangerous browser APIs

### 1.7 Strict-Transport-Security (HSTS)
**Enabled in production:**
```
max-age=31536000; includeSubDomains
```
- Forces HTTPS connections
- Prevents man-in-the-middle attacks
- Valid for 1 year

---

## 2. CORS (Cross-Origin Resource Sharing)

### 2.1 Restricted Origins
**Before:**
```javascript
'Access-Control-Allow-Origin': '*'  // VULNERABLE: allows any origin
```

**After:**
```javascript
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:8080').split(',');
// Only specific origins are allowed
```

### 2.2 Secure CORS Configuration
- ✅ Credentials allowed only from trusted origins
- ✅ No wildcard (*) origin acceptance
- ✅ Specific HTTP methods whitelist (GET, POST, OPTIONS)
- ✅ Limited headers allowed
- ✅ Preflight cache (3600 seconds)

### 2.3 Configuration
Set environment variable for production:
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

---

## 3. Rate Limiting & DDoS Protection

### 3.1 Implementation
- **Window:** 60 seconds
- **Max Requests:** 100 per IP per window
- **Action:** Returns 429 (Too Many Requests)

### 3.2 How It Works
```javascript
const RATE_LIMIT_WINDOW = 60000;    // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // max requests
```

### 3.3 Benefits
- Prevents brute force attacks
- Protects against DDoS attempts
- Stops API key exhaustion attacks
- Ensures fair resource usage

### 3.4 IP Detection
- Uses `req.ip` for proper IP detection
- Works behind proxies
- Tracks per-client request counts

---

## 4. Input Validation & Sanitization

### 4.1 Type Validation
```javascript
// Ensures input is a string, not object or array
if (typeof prompt !== 'string') {
  return res.status(400).json({ error: 'Invalid prompt format' });
}
```

### 4.2 Input Sanitization Function
```javascript
function sanitizeInput(input) {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Remove script tags (defense in depth)
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized;
}
```

### 4.3 Email Validation
```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
```

### 4.4 Content-Type Validation
```javascript
// POST requests must be application/json
if (!contentType.includes('application/json')) {
  return res.status(415).json({ error: 'Content-Type must be application/json' });
}
```

---

## 5. Request Size & Timeout Limits

### 5.1 Request Size Limits
```javascript
const MAX_REQUEST_SIZE = '1mb';  // Prevents large payload attacks
app.use(bodyParser.json({ limit: MAX_REQUEST_SIZE }));
```

### 5.2 Request Timeouts
```javascript
const REQUEST_TIMEOUT = 30000; // 30 seconds
// Applied to all external API calls and socket connections
```

**Benefits:**
- Prevents slow client attacks
- Stops hanging connections
- Protects against resource exhaustion
- Ensures predictable response times

---

## 6. Enhanced Blacklist & Pattern Detection

### 6.1 Extended Security Blacklist
```javascript
const blacklist = /(exploit|exploitative|attack|ddos|malicious|rootkit|payload|
rack|hacking|bypass|unauthorized|phishing|sql injection|xss|script injection|
command injection|buffer overflow|privilege escalation|zero day|worm|trojan|
ransomware|botnet)/i;
```

### 6.2 Multiple Validation Points
1. After receiving input
2. After sanitization
3. In contact form message
4. Before API calls

---

## 7. Error Handling & Information Disclosure

### 7.1 Generic Error Messages
**Before:**
```javascript
res.status(500).json({ error: 'Proxy failed', details: err.message });
```

**After:**
```javascript
res.status(500).json({ error: 'Request failed' });
// Detailed errors only logged server-side
```

### 7.2 Security Logging
```javascript
// Log security events but not in production responses
if (res.statusCode >= 400) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} from ${req.ip}`);
}
```

---

## 8. API Endpoint Security

### 8.1 POST /api/cloud-ai
**Protections:**
- ✅ Input sanitization
- ✅ Blacklist checking
- ✅ Type validation
- ✅ Rate limiting
- ✅ Request timeout
- ✅ CORS validation

### 8.2 POST /api/anon-ai
**Protections:** Same as cloud-ai

### 8.3 POST /api/cloud-ai-stream
**Additional Protections:**
- ✅ Streaming response security headers
- ✅ Controlled chunk delivery
- ✅ Error event handling

### 8.4 POST /api/contact
**Protections:**
- ✅ Email format validation (regex)
- ✅ Input field sanitization
- ✅ Content length limits
- ✅ Blacklist checking
- ✅ Error suppression (no details exposed)

---

## 9. Environment Variable Security

### 9.1 Required Configuration

#### For Development:
```bash
# Create .env.local (already in .gitignore)
ALLOWED_ORIGINS=http://localhost:8080
DEV_PROXY_PORT=3001
OPENAI_API_KEY=sk-...
```

#### For Production:
```bash
# Set via secure environment management (not in git)
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
OPENAI_API_KEY=sk-... (use secrets manager)
NODE_ENV=production
SMTP_HOST=... (if using SMTP)
SENDGRID_API_KEY=... (if using SendGrid)
```

### 9.2 Security Best Practices
- ✅ Never commit `.env.local` to git (in .gitignore)
- ✅ Never log API keys
- ✅ Use production secrets manager (AWS Secrets, HashiCorp Vault)
- ✅ Rotate keys regularly
- ✅ Use service-specific API keys with minimal permissions

### 9.3 Secrets Management
For production deployment:
1. Use AWS Secrets Manager
2. Or HashiCorp Vault
3. Or Azure Key Vault
4. Or GitHub Secrets (for CI/CD)

---

## 10. Supabase Authentication Security

### 10.1 Configuration
Located in `/src/integrations/supabase/client.ts`

### 10.2 Best Practices
- ✅ Use Supabase auth with strong passwords
- ✅ Enable multi-factor authentication (MFA)
- ✅ Use Row Level Security (RLS) policies
- ✅ Validate sessions on sensitive operations
- ✅ Use HTTPS only (Supabase enforces this)

### 10.3 Row Level Security (RLS)
- ✅ Ensure RLS policies are enabled on all tables
- ✅ Restrict data access by user_id
- ✅ Audit RLS policy effectiveness

---

## 11. Frontend Security

### 11.1 XSS Prevention
- ✅ React automatically escapes JSX content
- ✅ Avoid `dangerouslySetInnerHTML`
- ✅ Sanitize third-party content
- ✅ Use CSP to block inline scripts

### 11.2 CSRF Protection
- ✅ Same-site cookies enabled
- ✅ SameSite=Strict for critical operations
- ✅ CORS prevents cross-site requests

### 11.3 Secure Storage
- ✅ Session tokens in memory/secure cookies
- ✅ Avoid storing secrets in localStorage
- ✅ Use httpOnly cookies for auth tokens

---

## 12. Deployment Security Checklist

### Pre-Deployment
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` for your domain
- [ ] Set all API keys via secrets manager
- [ ] Enable HTTPS/TLS
- [ ] Verify CSP policy for your domain
- [ ] Test rate limiting behavior

### During Deployment
- [ ] Use HTTPS only (no HTTP)
- [ ] Enable HSTS headers
- [ ] Set security headers
- [ ] Configure firewall rules
- [ ] Enable WAF (Web Application Firewall)
- [ ] Set up DDoS protection (Cloudflare, AWS Shield)

### Post-Deployment
- [ ] Monitor security logs
- [ ] Set up alerts for suspicious activity
- [ ] Enable automated security scanning
- [ ] Schedule security audits
- [ ] Keep dependencies updated
- [ ] Monitor for known vulnerabilities

---

## 13. Vulnerability Scanning

### 13.1 Regular Updates
```bash
# Check for vulnerable dependencies
npm audit

# Fix automatically
npm audit fix

# Check for outdated packages
npm outdated
```

### 13.2 Dependency Management
- Use `npm audit` regularly
- Update security patches immediately
- Review major version updates carefully
- Use package-lock.json for consistency

### 13.3 Static Analysis
```bash
# ESLint for code quality
npm run lint

# Check TypeScript strict mode
npx tsc --noEmit
```

---

## 14. Monitoring & Logging

### 14.1 What to Monitor
- Error rates and patterns
- Suspicious request patterns
- Rate limit violations
- Failed authentication attempts
- Unusual API usage

### 14.2 Logging Best Practices
```javascript
// Log security events
console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} from ${req.ip}`);

// Never log sensitive data
// ✅ Log: request method, path, status, IP
// ❌ Don't log: passwords, API keys, user data
```

### 14.3 Recommended Tools
- **Logging:** ELK Stack, Datadog, New Relic
- **APM:** New Relic, Datadog, Prometheus
- **Alerting:** PagerDuty, Opsgenie
- **WAF:** Cloudflare, AWS WAF, ModSecurity

---

## 15. Incident Response Plan

### 15.1 Security Incident Response
If a security issue is discovered:

1. **Immediate Actions:**
   - Isolate affected systems
   - Stop the attack/unauthorized access
   - Preserve evidence

2. **Investigation:**
   - Review logs
   - Determine scope of breach
   - Identify root cause

3. **Containment:**
   - Patch vulnerabilities
   - Rotate compromised credentials
   - Update WAF rules

4. **Recovery:**
   - Restore from backups if needed
   - Verify system integrity
   - Resume operations

5. **Post-Incident:**
   - Document lessons learned
   - Update security measures
   - Notify affected users if applicable

---

## 16. Third-Party Security

### 16.1 API Dependencies
- ✅ OpenAI API (OAuth, API key rotation)
- ✅ Groq API (OAuth, API key rotation)
- ✅ Gemini API (OAuth, API key rotation)
- ✅ Deepseek API (OAuth, API key rotation)
- ✅ SendGrid (API key rotation)
- ✅ Supabase (JWTs, RLS policies)

### 16.2 Dependency Auditing
```bash
# Audit all dependencies
npm audit

# Generate security report
npm audit --json > security-report.json
```

---

## 17. Compliance & Standards

### 17.1 Standards Implemented
- ✅ OWASP Top 10 protections
- ✅ CWE (Common Weakness Enumeration) prevention
- ✅ NIST Cybersecurity Framework basics
- ✅ GDPR-friendly (no unnecessary data collection)

### 17.2 Data Protection
- ✅ Minimal data collection
- ✅ No third-party tracking (by default)
- ✅ Secure credential storage
- ✅ Encrypted communications (HTTPS)

---

## 18. Security Testing

### 18.1 Manual Testing Checklist
- [ ] Test rate limiting (>100 requests/min)
- [ ] Test XSS vectors in all input fields
- [ ] Test SQL injection patterns (sanitization)
- [ ] Test CORS with invalid origins
- [ ] Test oversized payloads (>1MB)
- [ ] Test timeout behavior
- [ ] Test invalid content-types

### 18.2 Automated Testing
```bash
# Run security checks
npm run lint

# Type checking
npx tsc --noEmit

# Build verification
npm run build
```

### 18.3 Recommended Tools
- **OWASP ZAP:** Free security scanner
- **Burp Suite:** Web application testing
- **Snyk:** Vulnerability scanning
- **SonarQube:** Code quality & security

---

## 19. Quick Reference: Security Improvements Made

| Feature | Before | After | Impact |
|---------|--------|-------|--------|
| CORS Origin | * (any) | Whitelist only | High |
| Security Headers | None | 7 headers | High |
| Input Validation | Basic | Type + sanitization | High |
| Rate Limiting | None | 100 req/min | High |
| Request Size | Unlimited | 1MB limit | Medium |
| Error Messages | Detailed | Generic | Medium |
| Blacklist | 6 patterns | 20+ patterns | Medium |
| Request Timeout | None | 30s | Medium |
| XSS Protection | CSP missing | CSP enforced | High |
| Clickjacking | Possible | X-Frame-Options: DENY | Medium |

---

## 20. Ongoing Security Tasks

### Monthly
- [ ] Review security logs
- [ ] Check for new vulnerabilities (`npm audit`)
- [ ] Review CORS configuration
- [ ] Audit user access logs

### Quarterly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Update dependencies
- [ ] Review and update CSP policy

### Annually
- [ ] Comprehensive security review
- [ ] Update security policies
- [ ] Staff security training
- [ ] Disaster recovery testing

---

## Contact & Reporting

If you discover a security vulnerability:
1. **Do not** publicly disclose the vulnerability
2. Email security details to: [your-security-email]
3. Include:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if applicable)

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla Web Security](https://infosec.mozilla.org/guidelines/web_security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE List](https://cwe.mitre.org/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CORS Specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Last Updated:** January 3, 2026
**Version:** 1.0.0
**Status:** ✅ Implemented & Active
