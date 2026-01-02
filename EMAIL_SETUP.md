# Email Setup Guide for CloudSpace

## Overview
CloudSpace uses Nodemailer to send real emails from the contact form. The email functionality is built into the dev proxy (`dev-server.js`) and supports multiple email service options.

## How It Works

When a user submits the contact form:
1. The form sends a POST request to `/api/contact` with `name`, `email`, and `message`
2. The dev proxy (`dev-server.js`) processes the request with this priority:
   - **1st Priority**: SendGrid API (if `SENDGRID_API_KEY` is configured)
   - **2nd Priority**: SMTP Server (if `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` are configured)
   - **3rd Priority**: Local sendmail (if `SMTP_SENDMAIL=true` is set)
   - **Dev Fallback**: Ethereal test account (in development mode with no config)

## Quick Start (Development Testing)

No setup needed! In development mode:

1. Start the dev proxy:
```bash
npm run dev:proxy
```

2. In another terminal, start the app:
```bash
npm run dev
```

3. Submit the contact form at http://localhost:8080/#contact

4. Check the dev proxy terminal for a **preview URL** - open it to see how the email looks!

This uses Ethereal's free test email service for instant feedback.

## Configuration Options

### Option 1: Gmail (Recommended for Testing)
1. Go to [Google Account Settings](https://myaccount.google.com/security)
2. Enable "2-Step Verification"
3. Generate an App Password:
   - Go to Security → App passwords
   - Select "Mail" and "Windows Computer"
   - Copy the generated 16-character password

4. Create `.env.local` in the project root:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-16-chars
SMTP_FROM=your-email@gmail.com
CONTACT_RECIPIENT=bobclein1@gmail.com
```

### Option 2: SendGrid (Recommended for Production)
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key with Mail Send permission
3. Verify your sender email

4. Add to `.env.local`:
```
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM=noreply@yourdomain.com
CONTACT_RECIPIENT=bobclein1@gmail.com
```

### Option 3: Office 365 / Outlook
```
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=your-email@example.com
CONTACT_RECIPIENT=bobclein1@gmail.com
```

### Option 4: Custom SMTP Server
```
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM=noreply@yourdomain.com
CONTACT_RECIPIENT=recipient@example.com
SMTP_SECURE=false  # set to true for port 465
```

### Option 5: Local sendmail
```
SMTP_SENDMAIL=true
CONTACT_RECIPIENT=recipient@example.com
SENDMAIL_PATH=/usr/sbin/sendmail  # optional, usually auto-detected
```

## Environment Variables Reference

| Variable | Priority | Purpose |
|----------|----------|---------|
| `SENDGRID_API_KEY` | 1st | SendGrid API key (enables SendGrid) |
| `SENDGRID_FROM` | - | SendGrid sender email (optional) |
| `SMTP_HOST` | 2nd | SMTP server hostname |
| `SMTP_PORT` | 2nd | SMTP server port (default: 587) |
| `SMTP_USER` | 2nd | SMTP authentication username |
| `SMTP_PASS` | 2nd | SMTP authentication password |
| `SMTP_SECURE` | 2nd | Set to `true` for SSL (port 465) |
| `SMTP_FROM` | 2nd | Sender email address format |
| `SMTP_SENDMAIL` | 3rd | Set to `true` to use local sendmail |
| `SENDMAIL_PATH` | 3rd | Path to sendmail binary (auto-detected if not set) |
| `CONTACT_RECIPIENT` | - | Where to send contact submissions (default: bobclein1@gmail.com) |

## Complete Setup Steps

### 1. Start the dev proxy
The dev proxy must be running for the contact form to work:
```bash
npm run dev:proxy
# or using bun
bun run dev:proxy
```

You should see: `Dev proxy listening on 3001`

### 2. (Optional) Configure email service
If you want real emails instead of test previews:

**For Gmail:**
- Create `.env.local` in project root
- Copy the Gmail configuration from Option 1 above
- Restart the dev proxy

**For SendGrid:**
- Create `.env.local` in project root
- Copy the SendGrid configuration from Option 2 above
- Restart the dev proxy

### 3. Start the app in another terminal
```bash
npm run dev
# or
bun run dev
```

### 4. Test the contact form
1. Open http://localhost:8080/#contact
2. Fill in: Name, Email, Message
3. Click "Send Message"
4. Check dev proxy terminal for status

**If using test account**, you'll see a preview URL - open it to see the email!

## Troubleshooting

### "Cannot reach API" error
- **Problem**: Dev proxy is not running
- **Solution**: Run `npm run dev:proxy` in a separate terminal
- **Verify**: You should see `Dev proxy listening on 3001`

### "No mailer configured" error
- **Problem**: No email service is configured (and not in dev mode)
- **Solution**: Either:
  - Set up environment variables (see Configuration Options)
  - Or restart the dev proxy in development mode to use test account

### SMTP connection failed
- **Problem**: Cannot connect to SMTP server
- **Solutions**:
  - Verify SMTP credentials are correct
  - Check firewall/port accessibility: `telnet smtp.gmail.com 587`
  - Some providers require whitelisting your IP
  - Verify port number (usually 587 for TLS, 465 for SSL)

### Gmail app password issues
- **Problem**: Authentication fails with Gmail
- **Solutions**:
  - Verify 2FA is enabled on your Google account
  - Regenerate and copy the exact 16-character password
  - Don't include spaces in the password
  - Use the full 16-character password

### SendGrid API key rejected
- **Problem**: 401 Unauthorized from SendGrid
- **Solutions**:
  - Verify the API key is correct (starts with `SG.`)
  - Check that the key has "Mail Send" permission
  - Verify the sender email is verified in SendGrid
  - Ensure the API key hasn't expired

### Email ending up in spam
- **Solutions**:
  - Use a verified sender domain
  - Ensure SPF/DKIM/DMARC records are configured on your domain
  - Use proper email formatting (which our handler does)

## How Emails Are Sent

The contact handler sends plain text + HTML format emails:

**Email to Admin/Recipient**
- **To**: Configured in `CONTACT_RECIPIENT`
- **From**: Configured sender email
- **Subject**: "New contact message from [Name]"
- **Reply-To**: Submitter's email address

**Email to User (test account only)**
- Shows a confirmation that the message was received

## Production Deployment

### Vercel
1. Go to Project Settings → Environment Variables
2. Add your email configuration:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=your-email@gmail.com
   CONTACT_RECIPIENT=recipient@example.com
   ```
3. Redeploy

### Netlify
1. Go to Site Settings → Build & Deploy → Environment
2. Add the same environment variables
3. Redeploy

### Docker / Self-Hosted
```bash
docker run \
  -e SMTP_HOST=smtp.gmail.com \
  -e SMTP_USER=your-email@gmail.com \
  -e SMTP_PASS=your-app-password \
  -e CONTACT_RECIPIENT=recipient@example.com \
  your-app-image
```

## Security Best Practices

1. **Never commit credentials** - Always use `.env.local` (it's in .gitignore)
2. **Use app-specific passwords** - Never use your main email password
3. **Limit permissions** - Use SendGrid keys with "Mail Send" only
4. **TLS/SSL** - Always use secure connections (port 587 or 465)
5. **Monitor usage** - Regularly check your email provider's logs
6. **Validate input** - The form validates all fields before sending
7. **Rate limiting** - Consider adding rate limiting in production

## References

- **Nodemailer**: https://nodemailer.com
- **Gmail Setup**: https://support.google.com/mail/answer/185833
- **SendGrid**: https://sendgrid.com/docs/
- **Office 365 SMTP**: https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-set-up-a-multiserver-ndix-application-to-load-balance-client-connections
