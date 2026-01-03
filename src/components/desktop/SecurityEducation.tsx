import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  BookOpen,
  Link as LinkIcon,
  Code,
  CheckCircle,
  ExternalLink,
  Search,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

interface VulnerabilityExample {
  type: string;
  vulnerable: string;
  secure: string;
  explanation: string;
}

interface SecurityConcept {
  name: string;
  description: string;
  impact: string;
  prevention: string;
  example?: string;
}

export const SecurityEducation = () => {
  const [activeTab, setActiveTab] = useState("concepts");
  const [selectedConcept, setSelectedConcept] = useState<SecurityConcept | null>(
    null
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const vulnerabilityExamples: VulnerabilityExample[] = [
    {
      type: "SQL Injection",
      vulnerable: `const query = "SELECT * FROM users WHERE id = " + userId;
db.execute(query);`,
      secure: `const query = "SELECT * FROM users WHERE id = ?";
db.execute(query, [userId]);`,
      explanation:
        "User input should never be concatenated into SQL queries. Use parameterized queries to prevent SQL injection attacks.",
    },
    {
      type: "Cross-Site Scripting (XSS)",
      vulnerable: `<div>{userComment}</div>`,
      secure: `<div>{DOMPurify.sanitize(userComment)}</div>
// or in React:
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userComment) }} />`,
      explanation:
        "User input should be sanitized before rendering in HTML. This prevents attackers from injecting malicious scripts.",
    },
    {
      type: "Cross-Site Request Forgery (CSRF)",
      vulnerable: `<form action="/api/transfer" method="POST">
  <input name="amount" value="1000">
</form>`,
      secure: `<form action="/api/transfer" method="POST">
  <input name="amount" value="1000">
  <input type="hidden" name="csrf_token" value={csrfToken}>
</form>`,
      explanation:
        "Include CSRF tokens in state-changing requests to verify the request comes from your application, not a malicious site.",
    },
    {
      type: "Insecure Direct Object References (IDOR)",
      vulnerable: `GET /api/users/123/profile
// If user can change 123 to access other profiles`,
      secure: `GET /api/users/123/profile
// Server verifies user has permission to access user 123
if (currentUser.id !== userId && !isAdmin) {
  return 403 Forbidden;
}`,
      explanation:
        "Always verify that the user has permission to access the resource they're requesting.",
    },
    {
      type: "Broken Authentication",
      vulnerable: `// Weak password storage
db.store('user_password', plainTextPassword);`,
      secure: `// Use bcrypt or argon2
const hashedPassword = await bcrypt.hash(password, 10);
db.store('user_password', hashedPassword);`,
      explanation:
        "Never store passwords in plain text. Use strong hashing algorithms like bcrypt or argon2.",
    },
    {
      type: "Sensitive Data Exposure",
      vulnerable: `// Logging sensitive data
console.log("User login:", username, password, ssn);`,
      secure: `// Never log sensitive information
console.log("User login:", username);
// Use HTTPS for all data in transit
// Encrypt sensitive data at rest`,
      explanation:
        "Protect sensitive data both in transit (HTTPS) and at rest (encryption). Never log passwords, API keys, or PII.",
    },
  ];

  const securityConcepts: SecurityConcept[] = [
    {
      name: "SQL Injection",
      description:
        "Attackers insert malicious SQL code into input fields to manipulate database queries.",
      impact:
        "Unauthorized data access, data deletion, authentication bypass, complete database compromise",
      prevention:
        "Use parameterized queries, input validation, least privilege database accounts, WAF rules",
      example:
        'Input: " OR "1"="1" -- \nResult: SELECT * FROM users WHERE id = "" OR "1"="1" -- ',
    },
    {
      name: "Cross-Site Scripting (XSS)",
      description:
        "Attackers inject malicious scripts into web pages viewed by other users.",
      impact:
        "Session hijacking, credential theft, malware distribution, website defacement",
      prevention:
        "Input sanitization, output encoding, Content Security Policy (CSP), avoiding dangerouslySetInnerHTML",
    },
    {
      name: "Cross-Site Request Forgery (CSRF)",
      description:
        "Attackers trick users into performing unintended actions on websites where they're authenticated.",
      impact:
        "Unauthorized fund transfers, password changes, data modification, account takeover",
      prevention:
        "CSRF tokens, SameSite cookie attribute, origin verification, user confirmation for sensitive actions",
    },
    {
      name: "Insecure Direct Object References (IDOR)",
      description:
        "Application exposes direct references to internal objects without access controls.",
      impact:
        "Unauthorized access to user data, sensitive information disclosure, privacy violation",
      prevention:
        "Access control checks, indirect object references, role-based authorization, audit logging",
    },
    {
      name: "Broken Authentication",
      description:
        "Weak password policies, session management flaws, or credential storage issues.",
      impact:
        "Account takeover, privilege escalation, identity theft, data breach",
      prevention:
        "Strong password requirements, multi-factor authentication, secure session management, password hashing",
    },
    {
      name: "Sensitive Data Exposure",
      description:
        "Sensitive information is transmitted or stored without adequate protection.",
      impact:
        "Privacy violation, financial fraud, identity theft, regulatory compliance failure",
      prevention:
        "HTTPS/TLS encryption, data encryption at rest, removing unnecessary data, secure key management",
    },
    {
      name: "XML External Entities (XXE)",
      description:
        "Attackers exploit XML parsers to access internal files or perform SSRF attacks.",
      impact:
        "File disclosure, denial of service, SSRF attacks, remote code execution",
      prevention:
        "Disable XML external entity processing, use secure XML parsers, input validation",
    },
    {
      name: "Broken Access Control",
      description:
        "Users can access resources or perform actions they're not authorized for.",
      impact:
        "Unauthorized data access, privilege escalation, service disruption",
      prevention:
        "Principle of least privilege, role-based access control, regular access reviews, audit logging",
    },
  ];

  const assessmentChecklist = [
    {
      category: "Authentication",
      items: [
        "Password strength requirements (min 12 characters, complexity)",
        "Multi-factor authentication (MFA) enabled",
        "Session timeouts implemented",
        "Login attempt rate limiting",
        "Account lockout after failed attempts",
        "Secure password reset mechanism",
      ],
    },
    {
      category: "Data Protection",
      items: [
        "HTTPS/TLS enabled (minimum TLS 1.2)",
        "Data encryption at rest",
        "Sensitive data not logged",
        "Database query parameterization",
        "No hardcoded secrets in code",
        "PII properly classified and protected",
      ],
    },
    {
      category: "Web Security",
      items: [
        "Content Security Policy (CSP) headers set",
        "CORS properly configured",
        "X-Frame-Options set (clickjacking protection)",
        "Input validation on all forms",
        "Output encoding for user content",
        "CSRF tokens implemented",
      ],
    },
    {
      category: "Access Control",
      items: [
        "Role-based access control (RBAC) implemented",
        "Least privilege principle applied",
        "Regular access reviews",
        "Audit logs for critical operations",
        "Failed authorization attempts logged",
        "Admin functions require additional verification",
      ],
    },
    {
      category: "Infrastructure",
      items: [
        "Web Application Firewall (WAF) deployed",
        "Regular security updates applied",
        "Vulnerability scanning automated",
        "Intrusion detection enabled",
        "Regular backups tested",
        "Incident response plan documented",
      ],
    },
    {
      category: "Compliance",
      items: [
        "OWASP Top 10 requirements met",
        "Regular penetration testing (authorized)",
        "Security policy documented",
        "Employee security training completed",
        "Privacy policy reviewed and updated",
        "Data retention policies defined",
      ],
    },
  ];

  const laboratoriesPlatforms = [
    {
      name: "HackTheBox",
      url: "https://www.hackthebox.com",
      description:
        "Platform with hundreds of CTF challenges and lab environments for learning cybersecurity",
      features: ["Free & premium labs", "Guided learning paths", "Community challenges", "Professional certification"],
    },
    {
      name: "TryHackMe",
      url: "https://tryhackme.com",
      description:
        "Interactive cybersecurity training with guided rooms and hands-on challenges",
      features: ["Beginner-friendly", "Video tutorials", "Career paths", "Certificates"],
    },
    {
      name: "OverTheWire",
      url: "https://overthewire.org",
      description:
        "Collection of wargames and challenges to learn security concepts through problem-solving",
      features: ["Free access", "Progressive difficulty", "No signup required", "Community-driven"],
    },
    {
      name: "OWASP WebGoat",
      url: "https://owasp.org/www-project-webgoat/",
      description:
        "Deliberately insecure web application for learning web application security",
      features: ["Self-hosted", "Open source", "Hands-on lessons", "Real vulnerabilities"],
    },
    {
      name: "PentesterLab",
      url: "https://pentesterlab.com",
      description:
        "Practical penetration testing exercises and certification preparation",
      features: ["Real scenarios", "Web penetration testing", "Certifications", "Code reviews"],
    },
    {
      name: "SANS Cyber Academy",
      url: "https://academy.sans.org",
      description:
        "Free security training and certifications from one of the leading security organizations",
      features: [
        "Professional training",
        "Industry certifications",
        "Expert instructors",
        "Career advancement",
      ],
    },
  ];

  const owaspTop10 = [
    {
      num: "1",
      name: "Broken Access Control",
      description: "Users access resources without proper authorization checks",
      mitigation: "Implement role-based access control, verify authorization on every request",
    },
    {
      num: "2",
      name: "Cryptographic Failures",
      description: "Sensitive data exposed due to weak or missing encryption",
      mitigation: "Use TLS 1.2+, encrypt sensitive data at rest, never store passwords in plain text",
    },
    {
      num: "3",
      name: "Injection",
      description: "SQL, OS, or LDAP injection from untrusted input",
      mitigation: "Use parameterized queries, input validation, escape special characters",
    },
    {
      num: "4",
      name: "Insecure Design",
      description: "Missing security controls during design phase",
      mitigation:
        "Threat modeling, secure coding standards, security code review",
    },
    {
      num: "5",
      name: "Security Misconfiguration",
      description:
        "Default credentials, unnecessary services, unpatched systems",
      mitigation:
        "Security hardening, minimal installations, regular updates, security scanning",
    },
    {
      num: "6",
      name: "Vulnerable and Outdated Components",
      description: "Using libraries/frameworks with known vulnerabilities",
      mitigation:
        "Dependency scanning, regular updates, minimize component usage, monitor advisories",
    },
    {
      num: "7",
      name: "Authentication Failures",
      description: "Weak password policies, session management flaws",
      mitigation:
        "MFA, strong passwords, secure session handling, password managers",
    },
    {
      num: "8",
      name: "Software and Data Integrity Failures",
      description: "Insecure CI/CD, malicious dependencies",
      mitigation:
        "Code signing, secure software update process, integrity verification",
    },
    {
      num: "9",
      name: "Logging and Monitoring Failures",
      description: "Insufficient logging of security events",
      mitigation:
        "Comprehensive logging, alerting on anomalies, incident response procedures",
    },
    {
      num: "10",
      name: "Server-Side Request Forgery",
      description: "Application fetches remote resources without validation",
      mitigation:
        "Input validation, URL parsing, network segmentation, disable unused protocols",
    },
  ];

  const bestPractices = [
    {
      title: "Secure Coding",
      items: [
        "Always validate and sanitize user input",
        "Use parameterized queries for database operations",
        "Implement proper error handling without revealing system details",
        "Never trust client-side validation alone",
        "Keep dependencies updated and monitor for vulnerabilities",
        "Use security linting tools in your development process",
        "Apply principle of least privilege in code design",
      ],
    },
    {
      title: "Authentication & Authorization",
      items: [
        "Enforce strong password policies (min 12 characters, complexity)",
        "Implement multi-factor authentication (MFA) for all accounts",
        "Use secure session management with appropriate timeouts",
        "Implement rate limiting on login attempts",
        "Use secure password reset mechanisms",
        "Store passwords using strong hashing (bcrypt, argon2)",
        "Regular access reviews and revocation of unused accounts",
      ],
    },
    {
      title: "Data Protection",
      items: [
        "Use HTTPS/TLS 1.2+ for all communications",
        "Encrypt sensitive data at rest using strong algorithms",
        "Implement data classification and handle accordingly",
        "Never log passwords, API keys, or PII",
        "Use secure key management practices",
        "Implement data retention and secure deletion policies",
        "Regular backups with encryption and testing",
      ],
    },
    {
      title: "Infrastructure Security",
      items: [
        "Keep all systems and software updated with latest patches",
        "Implement and maintain a Web Application Firewall (WAF)",
        "Use intrusion detection/prevention systems",
        "Regular vulnerability scanning and penetration testing",
        "Network segmentation and firewall rules",
        "Disable unnecessary services and ports",
        "Implement centralized logging and monitoring",
      ],
    },
    {
      title: "Development Practices",
      items: [
        "Conduct security code reviews",
        "Use static application security testing (SAST) tools",
        "Perform dynamic application security testing (DAST)",
        "Implement security in CI/CD pipelines",
        "Maintain secure development environments",
        "Document security decisions and architecture",
        "Regular security training for development teams",
      ],
    },
    {
      title: "Incident Response",
      items: [
        "Develop and test incident response plan",
        "Establish security incident reporting procedures",
        "Maintain audit logs for forensic analysis",
        "Have incident response team and contacts documented",
        "Regular drills and tabletop exercises",
        "Post-incident review and lessons learned",
        "Communication plan for security breaches",
      ],
    },
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    toast.success("Code copied to clipboard");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/50">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h2 className="font-semibold">Cybersecurity Education Hub</h2>
          <p className="text-xs text-muted-foreground">
            Learn ethical hacking and security concepts for authorized testing
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full h-full"
        >
          <TabsList className="w-full rounded-none border-b border-border bg-card/50 justify-start px-4 py-2 h-auto">
            <TabsTrigger value="concepts" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Concepts
            </TabsTrigger>
            <TabsTrigger value="vulnerabilities" className="gap-2">
              <AlertTriangle className="w-4 h-4" />
              Vulnerabilities
            </TabsTrigger>
            <TabsTrigger value="owasp" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              OWASP Top 10
            </TabsTrigger>
            <TabsTrigger value="checklist" className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="best-practices" className="gap-2">
              <Code className="w-4 h-4" />
              Best Practices
            </TabsTrigger>
            <TabsTrigger value="labs" className="gap-2">
              <LinkIcon className="w-4 h-4" />
              Lab Platforms
            </TabsTrigger>
          </TabsList>

          {/* Concepts Tab */}
          <TabsContent value="concepts" className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {securityConcepts.map((concept, idx) => (
                <Card
                  key={idx}
                  className="cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => setSelectedConcept(concept)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{concept.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {concept.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <strong>Impact:</strong> {concept.impact.substring(0, 80)}...
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedConcept && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                    {selectedConcept.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm">{selectedConcept.description}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Impact</h4>
                    <p className="text-sm text-destructive">
                      {selectedConcept.impact}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Prevention</h4>
                    <p className="text-sm text-green-600">
                      {selectedConcept.prevention}
                    </p>
                  </div>
                  {selectedConcept.example && (
                    <div>
                      <h4 className="font-semibold mb-2">Example</h4>
                      <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
                        {selectedConcept.example}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Vulnerabilities Tab */}
          <TabsContent value="vulnerabilities" className="p-4 space-y-4">
            {vulnerabilityExamples.map((vuln, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-lg">{vuln.type}</CardTitle>
                  <CardDescription>{vuln.explanation}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-red-600">
                        ❌ Vulnerable Code
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(vuln.vulnerable, `vuln-${idx}`)}
                      >
                        {copiedCode === `vuln-${idx}` ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="bg-red-950/20 border border-red-200 p-3 rounded text-xs overflow-x-auto">
                      <code>{vuln.vulnerable}</code>
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-green-600">
                        ✅ Secure Code
                      </h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(vuln.secure, `secure-${idx}`)}
                      >
                        {copiedCode === `secure-${idx}` ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="bg-green-950/20 border border-green-200 p-3 rounded text-xs overflow-x-auto">
                      <code>{vuln.secure}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* OWASP Top 10 Tab */}
          <TabsContent value="owasp" className="p-4 space-y-4">
            <div className="space-y-3">
              {owaspTop10.map((item, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      #{item.num}: {item.name}
                    </CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <strong className="text-sm">Mitigation:</strong>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.mitigation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist" className="p-4 space-y-4">
            {assessmentChecklist.map((category, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.items.map((item, itemIdx) => (
                      <li
                        key={itemIdx}
                        className="flex items-start gap-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded cursor-pointer"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Best Practices Tab */}
          <TabsContent value="best-practices" className="p-4 space-y-4">
            {bestPractices.map((practice, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-lg">{practice.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {practice.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Lab Platforms Tab */}
          <TabsContent value="labs" className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {laboratoriesPlatforms.map((platform, idx) => (
                <Card key={idx} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-lg">{platform.name}</CardTitle>
                    <CardDescription>{platform.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Features:</h4>
                      <ul className="space-y-1">
                        {platform.features.map((feature, fIdx) => (
                          <li
                            key={fIdx}
                            className="text-sm flex items-center gap-2"
                          >
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 transition-all text-sm font-medium"
                    >
                      Visit Platform
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Important Reminder
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  🔒 <strong>Legal & Ethical Requirements:</strong>
                </p>
                <ul className="space-y-2 pl-4">
                  <li>
                    ✓ Only perform security testing on systems you own or have
                    explicit written permission to test
                  </li>
                  <li>
                    ✓ Never use these techniques on unauthorized systems or
                    networks
                  </li>
                  <li>
                    ✓ Unauthorized access is illegal in most jurisdictions
                  </li>
                  <li>
                    ✓ Always get written authorization before conducting any
                    security testing
                  </li>
                  <li>
                    ✓ Use legitimate lab platforms for hands-on learning
                  </li>
                  <li>
                    ✓ Consider pursuing recognized certifications (CEH, OSCP,
                    Security+)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
