/*
  storage.js — data persistence adapter
  --------------------------------------
  CURRENT IMPLEMENTATION: browser localStorage.
  This makes the site fully functional the moment you open it, with zero
  setup. The trade-off: localStorage is per-browser, per-device. Data
  entered by one visitor (a registration, an admin approval, a new event)
  is NOT visible to other visitors on GitHub Pages — there is no shared
  server behind a static site.

  This is fine for local testing, or for a single person (e.g. one admin)
  managing everything from one browser. It is NOT a real shared alumni
  directory for a public audience yet.

  TO UPGRADE TO A REAL SHARED DATABASE (recommended before wide launch):
  Replace the two functions below with calls to a backend such as
  Firebase Firestore or Supabase, keeping the same function names and
  async signatures so nothing else in js/app.js needs to change:
    - storeGet(key, fallback) -> should resolve to the stored value or fallback
    - storeSet(key, value)    -> should persist value, resolve to true/false
  See README.md for the specific steps.
*/

const STORAGE_PREFIX = "mte-alumni:";

async function storeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error("storeGet failed for key:", key, e);
    return fallback;
  }
}

async function storeSet(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("storeSet failed for key:", key, e);
    return false;
  }
}
