# MTE Alumni Network · RUET

A website for alumni of the Department of Mechatronics Engineering,
Rajshahi University of Engineering & Technology (RUET).

## Files

```
index.html      structure/content, no inline styles or scripts
css/style.css   all visual styling (Editorial Ivory theme, with a dark theme)
js/storage.js   data-persistence adapter (currently localStorage, see below)
js/app.js       all page logic: routing, directory, mentorship, opportunities,
                spotlight, registration, events, gallery, admin
```

## Design

Editorial Ivory layout: serif headlines (Fraunces), Instrument Sans body text, ivory
background with deep green and rust accents, hairline rules and square corners.
A light/dark toggle sits in the header. The choice is saved in the browser, and
the first visit follows the device's light/dark setting. All colors are CSS
variables at the top of `css/style.css` (`:root` for light, `:root[data-theme="dark"]` for dark).

## Features

- Alumni directory with search, batch, sector and "open to mentoring" filters
- **Mentorship opt-in**: alumni tick "open to mentoring" (and list topics) at
  registration or in My Profile. Students send a request; a volunteer reviews it
  in the Admin panel and introduces both sides by email.
- **Opportunity board**: jobs, internships, research/thesis and higher-studies
  openings. Submissions are moderated; listings hide automatically after their
  deadline.
- **Alumni spotlight**: alumni submit a story; once published, the newest story
  is featured on the home page.
- Events, photo gallery, self-service profile (email + PIN), admin moderation.
- Light and dark theme toggle.

## Important: read before you launch publicly

This site currently stores data in **browser localStorage**, not a shared
database. Anything one visitor adds (a registration, an approval, a story, an
opportunity, a mentorship request) is saved **only in that visitor's own
browser**. Other visitors will **not** see it.

GitHub Pages only serves static files, so a shared directory needs an external
backend (e.g. Firebase Firestore or Supabase). Replace the two functions in
`js/storage.js` (`storeGet` / `storeSet`) and keep their names and `async`
signatures, nothing in `js/app.js` needs to change for the existing keys.

**Backend note:** records currently hold private fields (email, PIN, and
mentorship-request contact details) in the same collections the public pages
read. When you move to a real backend, keep those fields server-side or behind
security rules so they are never sent to ordinary visitors.

## Hosting on GitHub Pages

1. Add these files to a GitHub repository, keeping the folder structure above.
   `index.html` must be at the repository root.
2. In the repo: **Settings → Pages → Build and deployment → Source** →
   **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. GitHub publishes the site at `https://<your-username>.github.io/<repo-name>/`.

## Before you share the site with others

- **Change the admin passcode** in `js/app.js` (`const ADMIN_PASSCODE`). This is
  a client-side check visible in the page source, fine for casual use, not real
  access control.
- **Fill in the placeholders.** Two spots carry an amber note: the department
  contact email in the footer, and the "verify current details" note on the
  About page.
- **Verified fact included:** RUET was the first public university in Bangladesh
  to offer Mechatronics Engineering; the department was established in 2013
  within the Faculty of Mechanical Engineering (source: mte.ruet.ac.bd, as
  checked by the original README, August 2026). Confirm against the official site.

## Data model (for Firebase/Supabase later)

Each key holds a JSON array of records:

| Key | Contents |
| --- | --- |
| `alumni:pending` | registrations awaiting approval |
| `alumni:approved` | live directory entries |
| `mentorship:requests` | `{ id, mentorId, mentorName, name, email, level, topic, message, status ('new'/'introduced'), addedAt }` |
| `opportunities:pending` | submitted opportunities awaiting approval |
| `opportunities` | live board: `{ id, title, org, type, sector, location, deadline, description, apply, postedBy, email, addedAt }` |
| `spotlight:pending` | submitted stories awaiting approval |
| `spotlight` | published stories: `{ id, name, batch, position, company, headline, story, photo, linkedin, email, addedAt }` |
| `events` | department/alumni events |
| `gallery` | photo-wall submissions (image URL + caption) |

Alumni record shape: `{ id, name, batch, email, pin, position, company, city, country, sector, linkedin, photo, bio, mentor, mentorTopics, addedAt }`
(`mentor` and `mentorTopics` are new; older records without them simply show no mentor badge.)
