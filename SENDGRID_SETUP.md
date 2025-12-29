SendGrid transactional email setup (SPF / DKIM)

Follow these steps to configure SendGrid for reliable production sending and to avoid deliverability issues.

1. Create a SendGrid account and verify your domain.
   - Sign in to SendGrid and go to Settings → Sender Authentication.
   - Choose "Authenticate Your Domain" and follow the guided flow.

2. Update DNS records (SPF, DKIM, and CNAME)
   - SendGrid provides DNS entries (TXT and CNAME records). Add them to your domain's DNS provider.
   - Typical records:
     - SPF (TXT): includes sendgrid's include statement (e.g., "v=spf1 include:sendgrid.net ~all").
     - DKIM (CNAME): multiple CNAME records for DKIM signing.
     - Tracking (CNAME) — optional for link tracking.
   - DNS propagation may take minutes to hours.

3. Verify in SendGrid
   - After DNS records propagate, return to SendGrid and complete verification.

4. Use SMTP or Web API
   - SMTP (recommended for simple setups):
     - Host: `smtp.sendgrid.net`
     - Port: `587` (TLS) or `465` (SSL)
     - User: `apikey`
     - Password: `<your_sendgrid_api_key>`
   - Web API: use SendGrid's Web API with `@sendgrid/mail` (node) and the API key.

5. Production sender email
   - Use a verified sender domain address (e.g., `no-reply@yourdomain.com` or `support@yourdomain.com`).
   - Configure `SENDER_EMAIL` environment variable to that address.

6. DMARC (optional)
   - If you use DMARC, ensure SPF/DKIM align for your chosen sending domain.

7. Monitor deliverability
   - Check SendGrid dashboard for bounces, spam reports, and unsubscribes.

Example .env entries (see .env.example):

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key_here
SENDER_EMAIL=no-reply@yourdomain.com

Notes:
- For high-volume or multi-instance deployments, prefer using a queue (e.g., background job) and a shared rate-limiter store (Redis) to avoid hitting provider limits.
- Ensure SPF/DKIM are set up for the exact domain used in `SENDER_EMAIL` (subdomains can be used).
