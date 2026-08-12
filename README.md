# MTE Alumni Network — RUET

A website for alumni of the Department of Mechatronics Engineering,
Rajshahi University of Engineering & Technology (RUET).

## Files

```
index.html      structure/content, no inline styles or scripts
css/style.css   all visual styling
js/storage.js   data-persistence adapter (currently localStorage — see below)
js/app.js       all page logic: routing, directory, registration, events, gallery, admin
```

## Important — read before you launch publicly

This site currently stores data in **browser localStorage**, not a shared
database. That means:

- It works immediately, with no setup or account needed.
- Anything one visitor adds (a registration, an admin approval, a new
  event, a gallery photo) is saved **only in that visitor's own browser**.
  Other people visiting your GitHub Pages site will **not** see it.

This is genuinely useful for local development and for previewing the
design, but it is **not yet a real shared alumni directory** — GitHub
Pages only serves static files; it has no server or database of its own,
so no static site can have shared, cross-visitor data without connecting
to an external backend.

### Path to a real shared directory

The cleanest free option is **Firebase Firestore** (Google), because it
works entirely from client-side JavaScript — no server for you to run —
and is a drop-in replacement for `js/storage.js`:

1. Create a free project at https://console.firebase.google.com
2. Enable **Firestore Database** (start in production mode, add a security
   rule allowing reads for everyone and writes only where you want —
   e.g. registrations open, but approvals/events restricted).
3. In Firebase project settings, register a "web app" to get a config
   object (apiKey, projectId, etc).
4. Add the Firebase SDK via `<script type="module">` in `index.html`,
   and rewrite the two functions in `js/storage.js` (`storeGet` /
   `storeSet`) to read/write Firestore documents instead of
   localStorage — keep the same function names and `async` signatures
   and nothing in `js/app.js` needs to change.

Supabase (Postgres-based) works the same way if you'd prefer SQL over a
document database. Either is a reasonable free choice — happy to wire
either one in directly when you're ready; I didn't do it by default
here because it requires you to create the account and share the config
keys with me first.

## Hosting on GitHub Pages

1. Create a new GitHub repository (e.g. `mte-ruet-alumni`).
2. Add these files to the repo, keeping the folder structure above —
   `index.html` must be at the repository root (or in `/docs` if you
   configure Pages that way).
3. Push to GitHub.
4. In the repo: **Settings → Pages → Build and deployment → Source** →
   select **Deploy from a branch**, branch `main`, folder `/ (root)`.
5. Save. GitHub will publish the site at
   `https://<your-username>.github.io/<repo-name>/` within a minute or two.

## Before you share the site with others

- **Change the admin passcode.** Open `js/app.js` and edit:
  ```js
  const ADMIN_PASSCODE = "MTE-ADMIN-2026";
  ```
  Note: this is a client-side check, visible to anyone who reads the
  page source — fine for keeping casual visitors out of the moderation
  panel, not real access control. Don't use it to gate anything
  sensitive.
- **Fill in the placeholders.** Two spots are marked with an amber
  "verify/add" tag in the design: the department contact email in the
  footer, and a prompt to double-check current department details
  against the official site. I left these blank rather than invent
  values I couldn't confirm.
- **Verified facts already included:** RUET was the first public
  university in Bangladesh to offer Mechatronics Engineering, and the
  department was established in 2013 within the Faculty of Mechanical
  Engineering (source: mte.ruet.ac.bd, checked August 2026). Confirm
  against the official site before publishing in case anything has
  since changed.

## Data model (for reference if you move to Firebase/Supabase)

Four collections/keys, each a JSON array of records:
- `alumni:pending` — submitted registrations awaiting admin approval
- `alumni:approved` — live entries shown in the public directory
- `events` — department/alumni events
- `gallery` — photo-wall submissions (image URL + caption)

Alumni record shape: `{ id, name, batch, email, pin, position, company,
city, country, sector, linkedin, photo, bio, addedAt }`
