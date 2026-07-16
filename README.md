# Canonly — landing page

Static, single-file landing page for **Canonly** (working name), the governed
content system for regulated brands. Deployed on Netlify, sourced from this repo.

## What's here

| File | Purpose |
|---|---|
| `index.html` | The entire landing page (inline CSS + JS, no build step). |
| `404.html` | Branded not-found page. |
| `netlify.toml` | Netlify config: publish from repo root, security headers, 404 redirect. |

## Deploy

This repo is wired to Netlify for continuous deployment: **every push to `main`
publishes automatically**. No build command runs — Netlify serves the files as-is.

To edit the page, change `index.html` and push. Netlify redeploys in ~30 seconds.

## Wiring up the forms

The three forms (hero, playbook download, final CTA) currently show a success
state client-side but **do not send the submission anywhere yet**. To capture
leads, pick one:

1. **Netlify Forms** (easiest): add `netlify` and a `name` attribute to each
   `<form>` tag (e.g. `<form name="waitlist" netlify>`), add a hidden
   `form-name` input, then redeploy. Submissions appear in the Netlify dashboard.
2. **Formspree / HubSpot / your CRM**: set each form's `action` to your endpoint
   and remove the `e.preventDefault()` in the `<script>` (marked with `TODO`).

## Notes

- "Canonly" is a working name pending final trademark clearance.
- Stats on the page cite published third-party research (sources in the footer)
  and are not claims about specific customer outcomes.
