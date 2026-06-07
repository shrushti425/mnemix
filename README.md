# Mnemix AI

Mnemix AI is a multi-page GEO agency website and lead-generation tool for brands that want to show up in AI answers and get ready for the ChatGPT Ads era.

The site includes:

- a marketing homepage
- a free GEO audit flow
- a ChatGPT Ads waitlist page
- services, blog, and contact pages
- Netlify Functions for audits and lead capture
- Google Sheets integration for storing audit and contact submissions

## Stack

- Frontend: React + Vite
- Animations: Framer Motion, GSAP
- 3D hero: Three.js with `@react-three/fiber` and `@react-three/drei`
- Backend: Netlify Functions
- Storage: Google Sheets via Apps Script webhook
- Deployment: Netlify

## Project Structure

```text
mnemix-audit/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   └── assets/
├── netlify/
│   └── functions/
│       └── audit.js
├── public/
├── netlify.toml
├── vite.config.mjs
└── README.md
```

## Pages

- `/` - homepage
- `/audit` - free GEO audit
- `/chatgpt-ads` - ChatGPT Ads waitlist page
- `/services` - services page
- `/blog` - blog page
- `/contact` - contact page

## Features

- centered hero with animated platform word cycling
- floating AI engine badges around the hero
- free audit form with validation for website, email, and phone
- duplicate audit protection using brand, website, email, and phone checks
- Google Sheets save flow for both audit and contact submissions
- responsive dark UI in the Ember Intelligence palette

## Environment Variables

Set these in Netlify, not in the frontend code:

- `OPENAI_API_KEY`
- `SHEETS_WEBHOOK_URL`
- `CONTACT_SHEETS_WEBHOOK_URL`

## Local Development

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Netlify Deployment

This project is configured for Netlify with:

- `dist` as the publish directory
- `netlify/functions` as the functions directory
- `/api/*` routed to Netlify Functions
- SPA fallback routing for the React app

The relevant config is in `netlify.toml`.

When deploying:

1. Connect the repo to Netlify.
2. Set the environment variables listed above.
3. Deploy the site.
4. Confirm the audit and contact forms are writing to the correct Google Sheets webhook URLs.

## Google Sheets Setup

The backend sends audit and contact submissions to Apps Script webhooks.

### Audit sheet

Create a Google Sheet for audit leads, then deploy a Google Apps Script web app that accepts:

- audit submissions
- duplicate lookup requests

The Apps Script reference is included in the comment block at the bottom of:

```text
netlify/functions/audit.js
```

### Contact sheet

Create a separate Google Sheet for contact leads and deploy a second Apps Script web app.

That webhook URL should be stored in:

```text
CONTACT_SHEETS_WEBHOOK_URL
```

### What gets saved

Audit rows include:

- brand name
- website
- email
- phone
- score breakdown
- verdict band
- summary
- top fix

Contact rows include:

- brand name
- website
- email
- phone
- additional note

## Validation Rules

The audit form validates:

- brand name is required
- website is normalized to `https://...`
- email must be valid
- phone number must match the selected country rules

If a brand, website, email, or phone number has already been used for a free audit, the user sees a locked state instead of a second free audit.

## Notes

- The audit flow uses Jina AI for webpage scraping when possible.
- If scraping is too slow or fails, the backend falls back to an AI-only audit path so the request can still complete.
- The frontend uses safe JSON parsing so HTML error pages do not crash the UI.

## Support

If you are extending the site later, the most important files are:

- `src/App.jsx`
- `src/styles.css`
- `netlify/functions/audit.js`
- `netlify.toml`

