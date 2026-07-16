# Deploy Canonly to Netlify via GitHub — 2 short steps

Everything in this folder is ready to go. It's already a git repo with one commit.
Pick the path that matches how you like to work.

---

## Step 1 — get this repo onto GitHub (account: LeftCoastStudio)

### Path A — terminal + GitHub CLI (fastest, ~20 seconds)
If you have the `gh` CLI installed and are logged in as LeftCoastStudio:

```bash
cd canonly-site
gh repo create canonly-landing --private --source=. --remote=origin --push
```

That creates the private repo and pushes in one command. Done — go to Step 2.

### Path B — terminal, plain git
1. Create an empty repo at https://github.com/new
   → Owner: **LeftCoastStudio**, Name: **canonly-landing**, Private, **do not** add a README.
2. Then:

```bash
cd canonly-site
git remote add origin https://github.com/LeftCoastStudio/canonly-landing.git
git push -u origin main
```

### Path C — all browser, no terminal
1. Create an empty repo at https://github.com/new (Owner LeftCoastStudio, Name
   **canonly-landing**, Private, no README).
2. On the new repo page, click **uploading an existing file**.
3. Drag in `index.html`, `404.html`, `netlify.toml`, `README.md` and commit.

---

## Step 2 — connect Netlify (this also links GitHub, one-time)

1. Go to https://app.netlify.com → **Add new site** → **Import an existing project**.
2. Click **Deploy with GitHub**. Authorize the Netlify GitHub app if prompted
   (this is the one-time connection — pick "Only select repositories" →
   `canonly-landing` if you want to keep it scoped).
3. Select **LeftCoastStudio/canonly-landing**.
4. Build settings auto-fill from `netlify.toml` (publish = repo root, no build
   command). Click **Deploy**.

~30 seconds later the site is live at a `*.netlify.app` URL. Every push to `main`
redeploys automatically. Add a custom domain (canonly.com / .ai) under
**Domain settings** once you've secured it.

---

## After it's live — wire the forms (optional, 2 min)

The three forms currently show a success message but don't store leads. Easiest
capture is **Netlify Forms**: in `index.html`, change each `<form ...>` to include
`name="..."` and `netlify` (e.g. `<form name="waitlist" netlify ...>`), add a
hidden `<input type="hidden" name="form-name" value="waitlist">` inside it, and
push. Submissions then show up under **Forms** in the Netlify dashboard.
