/* ============ CONFIG ============ */
// Change this before sharing the admin link with volunteers.
const ADMIN_PASSCODE = "MTE-ADMIN-2026";
const SECTORS = ["Robotics & Automation","Software & IT","Automotive","Energy & Power","Manufacturing & Industry 4.0","Academia & Research","Higher Studies","Public Service / Government","Entrepreneurship","Other"];
const OPP_TYPES = ["Job","Internship","Research / Thesis","Higher studies","Other"];
const FIRST_BATCH_YEAR = 2013;
const CURRENT_YEAR = new Date().getFullYear();

let adminUnlocked = false;
let currentProfile = null; // {status:'approved'|'pending', record}
let pendingMentorId = '';  // mentor pre-selected from a directory/mentorship card


/* ============ THEME (light / dark) ============ */
const THEME_KEY = 'mte-alumni:theme';
function getSavedTheme(){
  try{ const t = localStorage.getItem(THEME_KEY); return (t === 'dark' || t === 'light') ? t : null; }
  catch(e){ return null; }
}
function applyTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if(btn){
    const dark = theme === 'dark';
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }
}
function toggleTheme(){
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  try{ localStorage.setItem(THEME_KEY, next); }catch(e){ /* storage unavailable: theme still applies for this visit */ }
  applyTheme(next);
}
function initTheme(){
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  applyTheme(getSavedTheme() || (mq && mq.matches ? 'dark' : 'light'));
  if(mq && mq.addEventListener){
    mq.addEventListener('change', e => { if(!getSavedTheme()) applyTheme(e.matches ? 'dark' : 'light'); });
  }
}
initTheme();

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

/* ============ HELPERS ============ */
function escapeHtml(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }
// Only allow http(s) links/images (blocks javascript: and data: URLs).
function safeUrl(u){ u = (u||'').trim(); return /^https?:\/\//i.test(u) ? u : ''; }
// Accepts a web link or an email address; returns an href or '' if neither.
function applyHref(s){
  s = (s||'').trim();
  if(/^https?:\/\//i.test(s)) return s;
  if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'mailto:' + s;
  return '';
}
function initials(name){
  return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('') || '?';
}
function localDateStr(d){
  const p = n => String(n).padStart(2,'0');
  return d.getFullYear() + '-' + p(d.getMonth()+1) + '-' + p(d.getDate());
}
function todayStr(){ return localDateStr(new Date()); }
function showMsg(id, ok, text){
  const m = document.getElementById(id);
  m.className = 'msg show ' + (ok ? 'ok' : 'err');
  m.textContent = text;
}
function avatarHTML(name, photo){
  const url = safeUrl(photo);
  return url
    ? `<div class="avatar"><img src="${escapeAttr(url)}" alt=""></div>`
    : `<div class="avatar">${escapeHtml(initials(name))}</div>`;
}
function batchCode(b){ return String(b||'').slice(2); }

/* ============ ROUTING ============ */
function go(pageId){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.navlinks button').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
  document.getElementById('navlinks').classList.remove('open');
  window.scrollTo({top:0, behavior:'smooth'});
  if(pageId === 'home') renderHome();
  if(pageId === 'directory') renderDirectory();
  if(pageId === 'mentorship') renderMentorship();
  if(pageId === 'opportunities') renderOpportunities();
  if(pageId === 'spotlight') renderSpotlight();
  if(pageId === 'events') renderEvents();
  if(pageId === 'gallery') renderGallery();
  if(pageId === 'admin' && adminUnlocked) renderAdminPanel();
}

/* ============ INIT DROPDOWNS ============ */
function populateBatchOptions(select, includeAll){
  select.innerHTML = includeAll ? '<option value="">All batches</option>' : '';
  for(let y = CURRENT_YEAR; y >= FIRST_BATCH_YEAR; y--){
    const opt = document.createElement('option');
    opt.value = y; opt.textContent = "MTE '" + String(y).slice(2);
    select.appendChild(opt);
  }
}
function populateSectorOptions(select, includeAll){
  select.innerHTML = includeAll ? '<option value="">All sectors</option>' : '<option value="">Select sector</option>';
  SECTORS.forEach(s => {
    const opt = document.createElement('option'); opt.value = s; opt.textContent = s;
    select.appendChild(opt);
  });
}
function populateTypeOptions(select, includeAll){
  select.innerHTML = includeAll ? '<option value="">All types</option>' : '';
  OPP_TYPES.forEach(t => {
    const opt = document.createElement('option'); opt.value = t; opt.textContent = t;
    select.appendChild(opt);
  });
}

/* ============ ALUMNI CARD RENDER ============ */
function alumniCardHTML(a){
  const role = [a.position, a.company].filter(Boolean).join(' · ');
  const loc = [a.city, a.country].filter(Boolean).join(', ');
  const linkedin = safeUrl(a.linkedin);
  return `
    <div class="alumni-card">
      <div class="alumni-top">
        ${avatarHTML(a.name, a.photo)}
        <div>
          <span class="partcode">MTE-${escapeHtml(batchCode(a.batch))}</span>
          <h4>${escapeHtml(a.name)}</h4>
          <p class="role">${escapeHtml(role || 'Role not listed')}</p>
        </div>
      </div>
      <div class="pin-row">
        ${a.mentor ? `<span class="pin pin-mentor">Open to mentoring</span>` : ''}
        ${a.sector ? `<span class="pin">${escapeHtml(a.sector)}</span>` : ''}
        ${loc ? `<span class="pin">${escapeHtml(loc)}</span>` : ''}
      </div>
      ${a.bio ? `<p class="bio">${escapeHtml(a.bio)}</p>` : ''}
      ${a.mentor && a.mentorTopics ? `<p class="topics"><strong>Can help with:</strong> ${escapeHtml(a.mentorTopics)}</p>` : ''}
      <div class="alumni-links">
        ${linkedin ? `<a href="${escapeAttr(linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}
        ${a.mentor ? `<button class="btn btn-sm" onclick="requestMentor('${a.id}')">Request mentorship</button>` : ''}
      </div>
    </div>`;
}

/* ============ SPOTLIGHT CARD RENDER ============ */
function spotlightCardHTML(s, opts){
  opts = opts || {};
  const role = [s.position, s.company].filter(Boolean).join(' · ');
  const linkedin = safeUrl(s.linkedin);
  return `
    <article class="spot-card ${opts.feature ? 'spot-feature' : ''}">
      ${avatarHTML(s.name, s.photo)}
      <div>
        <span class="partcode">MTE-${escapeHtml(batchCode(s.batch))}</span>
        <h3 style="margin:0;">${escapeHtml(s.name)}</h3>
        <p class="role">${escapeHtml(role || '')}</p>
        <p class="spot-headline">${escapeHtml(s.headline)}</p>
        <p class="bio">${escapeHtml(s.story)}</p>
        <div class="alumni-links" style="padding-top:10px;">
          ${linkedin ? `<a href="${escapeAttr(linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}
          ${opts.adminRemove ? `<button class="btn btn-sm btn-danger" onclick="adminRemoveSpot('${s.id}')">Remove</button>` : ''}
        </div>
      </div>
    </article>`;
}

/* ============ OPPORTUNITY CARD RENDER ============ */
function opportunityCardHTML(o, adminMode){
  const href = applyHref(o.apply);
  const meta = [o.org, o.location].filter(Boolean).join(' · ');
  return `
    <div class="opp-card">
      <div class="pin-row">
        <span class="pin pin-type">${escapeHtml(o.type || 'Other')}</span>
        ${o.sector ? `<span class="pin">${escapeHtml(o.sector)}</span>` : ''}
      </div>
      <h4>${escapeHtml(o.title)}</h4>
      <p class="opp-meta">${escapeHtml(meta)}</p>
      <p class="bio">${escapeHtml(o.description)}</p>
      ${o.deadline ? `<p class="opp-deadline">Deadline: ${escapeHtml(o.deadline)}</p>` : ''}
      <div class="alumni-links">
        ${href ? `<a href="${escapeAttr(href)}" target="_blank" rel="noopener">Apply / contact ↗</a>` : ''}
        ${adminMode ? `<button class="btn btn-sm btn-danger" onclick="adminRemoveOpp('${o.id}')">Remove</button>` : ''}
      </div>
      <p class="role" style="margin-top:10px;">Posted by ${escapeHtml(o.postedBy || 'an alumnus')}</p>
    </div>`;
}
function isOpen(o){ return !o.deadline || o.deadline >= todayStr(); }

/* ============ HERO SPOTLIGHT (home) ============ */
function heroSpotlightHTML(s){
  if(!s){
    return `
      <div class="hero-spot-photo"><span style="font-family:var(--body);font-size:.9rem;">No story yet</span></div>
      <div class="hero-spot-name">Be the first featured</div>
      <p class="hero-spot-role">Share your journey with the network.</p>
      <a href="#spotlight" class="text-link" onclick="go('spotlight');return false;">Share your story &rarr;</a>`;
  }
  const url = safeUrl(s.photo);
  const role = [s.position, s.company, s.batch ? 'Batch ' + s.batch : ''].filter(Boolean).join(' · ');
  return `
    <div class="hero-spot-photo">${url ? `<img src="${escapeAttr(url)}" alt="${escapeAttr(s.name)}">` : `<span>${escapeHtml(initials(s.name))}</span>`}</div>
    <div class="hero-spot-name">${escapeHtml(s.name)}</div>
    <p class="hero-spot-role">${escapeHtml(role)}</p>
    <p class="hero-spot-line">${escapeHtml(s.headline)}</p>
    <a href="#spotlight" class="text-link" onclick="go('spotlight');return false;">Read more stories &rarr;</a>`;
}

/* ============ HOME ============ */
async function renderHome(){
  const approved = await storeGet('alumni:approved', []);
  document.getElementById('stat-alumni').textContent = approved.length;
  document.getElementById('stat-batches').textContent = new Set(approved.map(a=>a.batch)).size;
  document.getElementById('stat-countries').textContent = new Set(approved.map(a=>a.country).filter(Boolean)).size;
  document.getElementById('stat-mentors').textContent = approved.filter(a=>a.mentor).length;

  const spots = await storeGet('spotlight', []);
  const newest = [...spots].sort((a,b)=> (b.addedAt||0)-(a.addedAt||0))[0];
  document.getElementById('hero-spotlight').innerHTML = heroSpotlightHTML(newest);

  const recent = [...approved].sort((a,b)=> (b.addedAt||0)-(a.addedAt||0)).slice(0,3);
  document.getElementById('home-recent').innerHTML = recent.length ? recent.map(alumniCardHTML).join('') :
    `<div class="empty">No alumni listed yet. Be the first to <a href="#" onclick="go('register');return false;">join the directory</a>.</div>`;

  const opps = (await storeGet('opportunities', [])).filter(isOpen).sort((a,b)=> (b.addedAt||0)-(a.addedAt||0)).slice(0,3);
  document.getElementById('home-opps').innerHTML = opps.length ? opps.map(o=>opportunityCardHTML(o,false)).join('') :
    `<div class="empty" style="grid-column:1/-1;">No open opportunities yet. <a href="#" onclick="go('opportunities');return false;">Post one</a> to help a fellow graduate.</div>`;

  const events = await storeGet('events', []);
  const upcoming = events.filter(e => e.date >= todayStr()).sort((a,b)=> a.date.localeCompare(b.date)).slice(0,3);
  document.getElementById('home-events').innerHTML = upcoming.length
    ? upcoming.map(eventRowHTML).join('')
    : `<div class="empty">No upcoming events yet. Check back soon.</div>`;
}

/* ============ DIRECTORY ============ */
let directoryLoaded = false;
async function renderDirectory(){
  const batchSel = document.getElementById('dir-batch');
  const sectorSel = document.getElementById('dir-sector');
  if(!directoryLoaded){
    populateBatchOptions(batchSel, true);
    populateSectorOptions(sectorSel, true);
    directoryLoaded = true;
  }
  const approved = await storeGet('alumni:approved', []);
  const q = document.getElementById('dir-search').value.trim().toLowerCase();
  const batch = batchSel.value;
  const sector = sectorSel.value;
  const mentorOnly = document.getElementById('dir-mentor').checked;

  const filtered = approved.filter(a => {
    if(batch && String(a.batch) !== batch) return false;
    if(sector && a.sector !== sector) return false;
    if(mentorOnly && !a.mentor) return false;
    if(q){
      const hay = [a.name,a.company,a.city,a.country,a.position].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  }).sort((a,b)=> (b.addedAt||0)-(a.addedAt||0));

  document.getElementById('dir-grid').innerHTML = filtered.length
    ? filtered.map(alumniCardHTML).join('')
    : `<div class="empty" style="grid-column:1/-1;">No alumni match these filters yet.</div>`;
}

/* ============ MENTORSHIP ============ */
function requestMentor(id){ pendingMentorId = id; go('mentorship'); }
async function renderMentorship(){
  const approved = await storeGet('alumni:approved', []);
  const mentors = approved.filter(a=>a.mentor).sort((a,b)=> (b.addedAt||0)-(a.addedAt||0));
  document.getElementById('mentor-grid').innerHTML = mentors.length
    ? mentors.map(alumniCardHTML).join('')
    : `<div class="empty" style="grid-column:1/-1;">No mentors listed yet. Alumni can opt in when they <a href="#" onclick="go('register');return false;">register</a> or from <a href="#" onclick="go('profile');return false;">My Profile</a>.</div>`;

  const sel = document.getElementById('m-mentor');
  const keep = pendingMentorId || sel.value;
  sel.innerHTML = '<option value="">Any available mentor</option>' + mentors.map(m =>
    `<option value="${escapeAttr(m.id)}">${escapeHtml(m.name)} · MTE '${escapeHtml(batchCode(m.batch))}</option>`).join('');
  if(keep && mentors.some(m=>m.id===keep)) sel.value = keep;
  if(pendingMentorId){
    pendingMentorId = '';
    setTimeout(() => document.getElementById('m-form').scrollIntoView({behavior:'smooth', block:'start'}), 60);
  }
}
async function submitMentorRequest(evt){
  evt.preventDefault();
  const mentorId = document.getElementById('m-mentor').value;
  let mentorName = '';
  if(mentorId){
    const approved = await storeGet('alumni:approved', []);
    const m = approved.find(a=>a.id===mentorId);
    if(!m || !m.mentor){ showMsg('m-msg', false, 'That mentor is no longer available. Please choose another or select "Any available mentor".'); renderMentorship(); return; }
    mentorName = m.name;
  }
  const reqs = await storeGet('mentorship:requests', []);
  reqs.push({
    id: uid(),
    mentorId, mentorName,
    name: document.getElementById('m-name').value.trim(),
    email: document.getElementById('m-email').value.trim().toLowerCase(),
    level: document.getElementById('m-level').value,
    topic: document.getElementById('m-topic').value.trim(),
    message: document.getElementById('m-message').value.trim(),
    status: 'new',
    addedAt: Date.now()
  });
  const ok = await storeSet('mentorship:requests', reqs);
  showMsg('m-msg', ok, ok ? 'Request sent. A department volunteer will review it and introduce you by email.' : 'Could not save your request. Please try again.');
  if(ok) evt.target.reset();
}

/* ============ OPPORTUNITIES ============ */
let oppLoaded = false;
async function renderOpportunities(){
  const typeSel = document.getElementById('opp-type');
  const sectorSel = document.getElementById('opp-sector');
  if(!oppLoaded){
    populateTypeOptions(typeSel, true);
    populateSectorOptions(sectorSel, true);
    populateTypeOptions(document.getElementById('o-type'), false);
    populateSectorOptions(document.getElementById('o-sector'), false);
    oppLoaded = true;
  }
  const all = await storeGet('opportunities', []);
  const q = document.getElementById('opp-search').value.trim().toLowerCase();
  const type = typeSel.value, sector = sectorSel.value;
  const list = all.filter(o => {
    if(!isOpen(o)) return false;
    if(type && o.type !== type) return false;
    if(sector && o.sector !== sector) return false;
    if(q && ![o.title,o.org,o.location,o.description].join(' ').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a,b)=> (b.addedAt||0)-(a.addedAt||0));
  document.getElementById('opp-list').innerHTML = list.length
    ? list.map(o=>opportunityCardHTML(o,false)).join('')
    : `<div class="empty" style="grid-column:1/-1;">No open opportunities match these filters yet.</div>`;
}
async function submitOpportunity(evt){
  evt.preventDefault();
  const apply = document.getElementById('o-apply').value.trim();
  if(!applyHref(apply)){ showMsg('o-msg', false, 'Please enter a valid web link (https://…) or an email address for applications.'); return; }
  const pending = await storeGet('opportunities:pending', []);
  pending.push({
    id: uid(),
    title: document.getElementById('o-title').value.trim(),
    org: document.getElementById('o-org').value.trim(),
    type: document.getElementById('o-type').value,
    sector: document.getElementById('o-sector').value,
    location: document.getElementById('o-location').value.trim(),
    deadline: document.getElementById('o-deadline').value,
    description: document.getElementById('o-desc').value.trim(),
    apply,
    postedBy: document.getElementById('o-by').value.trim(),
    email: document.getElementById('o-email').value.trim().toLowerCase(),
    addedAt: Date.now()
  });
  const ok = await storeSet('opportunities:pending', pending);
  showMsg('o-msg', ok, ok ? 'Thanks! Your listing is pending review and will appear on the board once approved.' : 'Could not save. Please try again.');
  if(ok) evt.target.reset();
}

/* ============ SPOTLIGHT ============ */
let spotLoaded = false;
async function renderSpotlight(){
  if(!spotLoaded){ populateBatchOptions(document.getElementById('s-batch'), false); spotLoaded = true; }
  const spots = await storeGet('spotlight', []);
  document.getElementById('spot-grid').innerHTML = spots.length
    ? [...spots].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)).map(s=>spotlightCardHTML(s)).join('')
    : `<div class="empty" style="grid-column:1/-1;">No stories published yet. Share yours below.</div>`;
}
async function submitSpotlight(evt){
  evt.preventDefault();
  const pending = await storeGet('spotlight:pending', []);
  pending.push({
    id: uid(),
    name: document.getElementById('s-name').value.trim(),
    batch: document.getElementById('s-batch').value,
    position: document.getElementById('s-position').value.trim(),
    company: document.getElementById('s-company').value.trim(),
    headline: document.getElementById('s-headline').value.trim(),
    story: document.getElementById('s-story').value.trim(),
    photo: document.getElementById('s-photo').value.trim(),
    linkedin: document.getElementById('s-linkedin').value.trim(),
    email: document.getElementById('s-email').value.trim().toLowerCase(),
    addedAt: Date.now()
  });
  const ok = await storeSet('spotlight:pending', pending);
  showMsg('s-msg', ok, ok ? 'Thanks! Your story is pending review and will be published once approved.' : 'Could not save. Please try again.');
  if(ok) evt.target.reset();
}

/* ============ EVENTS ============ */
function eventRowHTML(e){
  const d = new Date(e.date + 'T00:00:00');
  const day = d.getDate();
  const mon = d.toLocaleString('en', {month:'short'});
  return `
    <div class="event-row">
      <div class="event-date"><b>${day}</b><span>${mon}</span></div>
      <div class="event-body">
        <span class="tag">${escapeHtml(e.type||'Event')}</span>
        <h4 style="margin:2px 0;">${escapeHtml(e.title)}</h4>
        <p style="margin:0;font-size:.85rem;">${escapeHtml(e.location||'')}${e.description ? ' · ' + escapeHtml(e.description) : ''}</p>
      </div>
      <button class="btn btn-sm" onclick="markInterested('${e.id}')">I'm interested (${e.interest||0})</button>
    </div>`;
}
async function renderEvents(){
  const events = await storeGet('events', []);
  const sorted = [...events].sort((a,b)=> a.date.localeCompare(b.date));
  document.getElementById('events-list').innerHTML = sorted.length
    ? sorted.map(eventRowHTML).join('')
    : `<div class="empty">No events scheduled yet.</div>`;
}
async function markInterested(id){
  const events = await storeGet('events', []);
  const ev = events.find(e => e.id === id);
  if(ev){ ev.interest = (ev.interest||0) + 1; await storeSet('events', events); renderEvents(); renderHome(); }
}

/* ============ GALLERY ============ */
function galleryItemHTML(g, adminMode){
  return `
    <div class="gallery-item">
      <img src="${escapeAttr(safeUrl(g.imageUrl))}" alt="${escapeAttr(g.caption)}" loading="lazy" onerror="this.style.display='none'">
      <div class="gallery-cap"><b>${escapeHtml(g.caption)}</b><br>Shared by ${escapeHtml(g.submittedBy)}
        ${adminMode ? `<br><button class="btn btn-sm btn-danger" style="margin-top:6px;" onclick="adminDeleteGallery('${g.id}')">Remove</button>` : ''}
      </div>
    </div>`;
}
async function renderGallery(){
  const gallery = await storeGet('gallery', []);
  document.getElementById('gallery-grid').innerHTML = gallery.length
    ? [...gallery].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)).map(g=>galleryItemHTML(g,false)).join('')
    : `<div class="empty" style="grid-column:1/-1;">No photos yet. Add the first one below.</div>`;
}
async function submitGallery(evt){
  evt.preventDefault();
  const imageUrl = safeUrl(document.getElementById('g-url').value);
  if(!imageUrl){ showMsg('g-msg', false, 'Please enter a valid image link starting with http:// or https://'); return; }
  const g = {
    id: uid(),
    submittedBy: document.getElementById('g-name').value.trim(),
    imageUrl,
    caption: document.getElementById('g-caption').value.trim(),
    addedAt: Date.now()
  };
  const gallery = await storeGet('gallery', []);
  gallery.push(g);
  const ok = await storeSet('gallery', gallery);
  showMsg('g-msg', ok, ok ? 'Photo added to the gallery.' : 'Could not save. Please try again.');
  if(ok){ evt.target.reset(); renderGallery(); }
}

/* ============ REGISTRATION ============ */
function initRegisterForm(){
  populateBatchOptions(document.getElementById('r-batch'), false);
  populateSectorOptions(document.getElementById('r-sector'), false);
}
async function submitRegistration(evt){
  evt.preventDefault();
  const email = document.getElementById('r-email').value.trim().toLowerCase();

  const pending = await storeGet('alumni:pending', []);
  const approved = await storeGet('alumni:approved', []);
  if(pending.some(a=>a.email===email) || approved.some(a=>a.email===email)){
    showMsg('r-msg', false, 'This email is already registered. Use "My Profile" to edit your listing.');
    return;
  }

  const mentor = document.getElementById('r-mentor').checked;
  const record = {
    id: uid(),
    name: document.getElementById('r-name').value.trim(),
    batch: document.getElementById('r-batch').value,
    email,
    pin: document.getElementById('r-pin').value.trim(),
    position: document.getElementById('r-position').value.trim(),
    company: document.getElementById('r-company').value.trim(),
    city: document.getElementById('r-city').value.trim(),
    country: document.getElementById('r-country').value.trim(),
    sector: document.getElementById('r-sector').value,
    linkedin: document.getElementById('r-linkedin').value.trim(),
    photo: document.getElementById('r-photo').value.trim(),
    bio: document.getElementById('r-bio').value.trim(),
    mentor,
    mentorTopics: mentor ? document.getElementById('r-topics').value.trim() : '',
    addedAt: Date.now()
  };
  pending.push(record);
  const ok = await storeSet('alumni:pending', pending);
  showMsg('r-msg', ok, ok
    ? 'Thanks! Your profile is pending review and will appear in the directory once approved.'
    : 'Something went wrong saving your registration. Please try again.');
  if(ok) evt.target.reset();
}

/* ============ MY PROFILE ============ */
async function doProfileLogin(evt){
  evt.preventDefault();
  const email = document.getElementById('p-email').value.trim().toLowerCase();
  const pin = document.getElementById('p-pin').value.trim();
  const msg = document.getElementById('p-msg');

  const approved = await storeGet('alumni:approved', []);
  const pending = await storeGet('alumni:pending', []);
  let found = approved.find(a=>a.email===email && a.pin===pin);
  let status = 'approved';
  if(!found){ found = pending.find(a=>a.email===email && a.pin===pin); status = 'pending'; }

  if(!found){
    msg.className = 'msg show err';
    msg.textContent = 'No matching profile found. Check your email and PIN, or register if you haven\'t yet.';
    document.getElementById('profile-editor').style.display = 'none';
    return;
  }
  msg.className = 'msg';
  currentProfile = {status, record: found};
  renderProfileEditor();
}
function renderProfileEditor(){
  const {status, record} = currentProfile;
  const box = document.getElementById('profile-editor');
  box.style.display = 'block';
  box.innerHTML = `
    <form class="panel" id="edit-form">
      <p class="tag" style="margin-bottom:12px;">${status === 'approved' ? 'Live in directory' : 'Pending review'}</p>
      <div class="field-row">
        <div class="field"><label for="ed-name">Full name</label><input id="ed-name" value="${escapeAttr(record.name)}" required></div>
        <div class="field"><label for="ed-batch">Batch</label><select id="ed-batch"></select></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="ed-position">Position</label><input id="ed-position" value="${escapeAttr(record.position||'')}"></div>
        <div class="field"><label for="ed-company">Company</label><input id="ed-company" value="${escapeAttr(record.company||'')}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="ed-city">City</label><input id="ed-city" value="${escapeAttr(record.city||'')}"></div>
        <div class="field"><label for="ed-country">Country</label><input id="ed-country" value="${escapeAttr(record.country||'')}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="ed-sector">Sector</label><select id="ed-sector"></select></div>
        <div class="field"><label for="ed-linkedin">LinkedIn</label><input id="ed-linkedin" type="url" value="${escapeAttr(record.linkedin||'')}"></div>
      </div>
      <div class="field"><label for="ed-photo">Photo URL</label><input id="ed-photo" type="url" value="${escapeAttr(record.photo||'')}"></div>
      <div class="field"><label for="ed-bio">Bio</label><textarea id="ed-bio" rows="3" maxlength="200">${escapeHtml(record.bio||'')}</textarea></div>
      <div class="optin">
        <div class="check"><input type="checkbox" id="ed-mentor" ${record.mentor ? 'checked' : ''}><label for="ed-mentor"><strong>I'm open to mentoring students</strong></label></div>
        <div class="field" style="margin:14px 0 0;"><label for="ed-topics">What can you help with?</label><input id="ed-topics" maxlength="120" value="${escapeAttr(record.mentorTopics||'')}"></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" type="submit">Save changes</button>
        <button type="button" class="btn btn-danger" onclick="deleteOwnProfile()">Delete my listing</button>
      </div>
      <div class="msg" id="ed-msg"></div>
    </form>`;
  populateBatchOptions(document.getElementById('ed-batch'), false);
  document.getElementById('ed-batch').value = record.batch;
  populateSectorOptions(document.getElementById('ed-sector'), false);
  document.getElementById('ed-sector').value = record.sector || '';
  document.getElementById('edit-form').addEventListener('submit', saveOwnProfile);
}
async function saveOwnProfile(evt){
  evt.preventDefault();
  const {status, record} = currentProfile;
  const mentor = document.getElementById('ed-mentor').checked;
  const updated = {
    ...record,
    name: document.getElementById('ed-name').value.trim(),
    batch: document.getElementById('ed-batch').value,
    position: document.getElementById('ed-position').value.trim(),
    company: document.getElementById('ed-company').value.trim(),
    city: document.getElementById('ed-city').value.trim(),
    country: document.getElementById('ed-country').value.trim(),
    sector: document.getElementById('ed-sector').value,
    linkedin: document.getElementById('ed-linkedin').value.trim(),
    photo: document.getElementById('ed-photo').value.trim(),
    bio: document.getElementById('ed-bio').value.trim(),
    mentor,
    mentorTopics: mentor ? document.getElementById('ed-topics').value.trim() : ''
  };
  const key = status === 'approved' ? 'alumni:approved' : 'alumni:pending';
  const list = await storeGet(key, []);
  const idx = list.findIndex(a=>a.id===record.id);
  if(idx > -1) list[idx] = updated;
  const ok = await storeSet(key, list);
  currentProfile.record = updated;
  showMsg('ed-msg', ok, ok ? 'Saved.' : 'Could not save changes.');
}
async function deleteOwnProfile(){
  if(!confirm('Remove your listing permanently?')) return;
  const {status, record} = currentProfile;
  const key = status === 'approved' ? 'alumni:approved' : 'alumni:pending';
  const list = await storeGet(key, []);
  const next = list.filter(a=>a.id!==record.id);
  await storeSet(key, next);
  currentProfile = null;
  document.getElementById('profile-editor').style.display = 'none';
  document.getElementById('profile-editor').innerHTML = '';
  document.getElementById('login-form').reset();
  alert('Your listing has been removed.');
}

/* ============ ADMIN ============ */
function doAdminLogin(evt){
  evt.preventDefault();
  const val = document.getElementById('a-pass').value;
  if(val === ADMIN_PASSCODE){
    adminUnlocked = true;
    document.getElementById('admin-gate').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    renderAdminPanel();
  }else{
    showMsg('a-msg', false, 'Incorrect passcode.');
  }
}
async function renderAdminPanel(){
  /* pending alumni */
  const pending = await storeGet('alumni:pending', []);
  document.getElementById('pending-count').textContent = pending.length;
  document.getElementById('pending-list').innerHTML = pending.length ? pending.map(p => `
    <div class="pending-row">
      <div>
        <strong>${escapeHtml(p.name)}</strong> <span class="mono" style="color:var(--muted);font-size:.8rem;">· MTE'${escapeHtml(batchCode(p.batch))} · ${escapeHtml(p.email)}${p.mentor ? ' · mentor' : ''}</span>
        <p style="margin:2px 0 0;font-size:.85rem;">${escapeHtml([p.position,p.company].filter(Boolean).join(' at '))}</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-sm btn-primary" onclick="adminApprove('${p.id}')">Approve</button>
        <button class="btn btn-sm btn-danger" onclick="adminReject('${p.id}')">Reject</button>
      </div>
    </div>`).join('') : `<div class="empty">No pending registrations.</div>`;

  /* mentorship requests */
  const approved = await storeGet('alumni:approved', []);
  const reqs = [...(await storeGet('mentorship:requests', []))].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0));
  document.getElementById('req-count').textContent = reqs.filter(r=>r.status!=='introduced').length;
  document.getElementById('mentor-requests').innerHTML = reqs.length ? reqs.map(r => {
    const m = r.mentorId ? approved.find(a=>a.id===r.mentorId) : null;
    const mentorLine = r.mentorId
      ? 'Mentor: ' + escapeHtml(r.mentorName || '') + (m ? ' (' + escapeHtml(m.email) + ')' : ' (listing no longer available)')
      : 'Mentor: any available';
    return `
    <div class="pending-row">
      <div>
        <strong>${escapeHtml(r.name)}</strong> <span class="mono" style="color:var(--muted);font-size:.8rem;">· ${escapeHtml(r.level)} · ${escapeHtml(r.email)} · ${r.status === 'introduced' ? 'introduced' : 'new'}</span>
        <p style="margin:2px 0 0;font-size:.85rem;"><strong>${escapeHtml(r.topic)}</strong> · ${mentorLine}</p>
        ${r.message ? `<p style="margin:2px 0 0;font-size:.85rem;">${escapeHtml(r.message)}</p>` : ''}
      </div>
      <div style="display:flex;gap:8px;">
        ${r.status !== 'introduced' ? `<button class="btn btn-sm btn-primary" onclick="adminMarkIntroduced('${r.id}')">Mark introduced</button>` : ''}
        <button class="btn btn-sm btn-danger" onclick="adminDeleteRequest('${r.id}')">Delete</button>
      </div>
    </div>`;
  }).join('') : `<div class="empty">No mentorship requests.</div>`;

  /* pending spotlight */
  const spotPending = await storeGet('spotlight:pending', []);
  document.getElementById('spot-pending-count').textContent = spotPending.length;
  document.getElementById('pending-spot').innerHTML = spotPending.length ? spotPending.map(s => `
    <div class="pending-row">
      <div>
        <strong>${escapeHtml(s.name)}</strong> <span class="mono" style="color:var(--muted);font-size:.8rem;">· MTE'${escapeHtml(batchCode(s.batch))} · ${escapeHtml(s.email)}</span>
        <p style="margin:2px 0 0;font-size:.85rem;"><strong>${escapeHtml(s.headline)}</strong></p>
        <p style="margin:2px 0 0;font-size:.85rem;">${escapeHtml(s.story)}</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-sm btn-primary" onclick="adminApproveSpot('${s.id}')">Publish</button>
        <button class="btn btn-sm btn-danger" onclick="adminRejectSpot('${s.id}')">Reject</button>
      </div>
    </div>`).join('') : `<div class="empty">No pending stories.</div>`;

  /* pending opportunities */
  const oppPending = await storeGet('opportunities:pending', []);
  document.getElementById('opp-pending-count').textContent = oppPending.length;
  document.getElementById('pending-opps').innerHTML = oppPending.length ? oppPending.map(o => `
    <div class="pending-row">
      <div>
        <strong>${escapeHtml(o.title)}</strong> <span class="mono" style="color:var(--muted);font-size:.8rem;">· ${escapeHtml(o.type)} · ${escapeHtml(o.postedBy)} · ${escapeHtml(o.email)}</span>
        <p style="margin:2px 0 0;font-size:.85rem;">${escapeHtml([o.org,o.location].filter(Boolean).join(' · '))}</p>
        <p style="margin:2px 0 0;font-size:.85rem;">${escapeHtml(o.description)}</p>
        <p style="margin:2px 0 0;font-size:.85rem;">Apply: ${escapeHtml(o.apply)}${o.deadline ? ' · Deadline: ' + escapeHtml(o.deadline) : ''}</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-sm btn-primary" onclick="adminApproveOpp('${o.id}')">Publish</button>
        <button class="btn btn-sm btn-danger" onclick="adminRejectOpp('${o.id}')">Reject</button>
      </div>
    </div>`).join('') : `<div class="empty">No pending opportunities.</div>`;

  /* published spotlight / opportunities */
  const spots = await storeGet('spotlight', []);
  document.getElementById('admin-spot').innerHTML = spots.length
    ? `<div class="grid grid-2">${[...spots].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)).map(s=>spotlightCardHTML(s,{adminRemove:true})).join('')}</div>`
    : `<div class="empty">No published stories.</div>`;
  const opps = await storeGet('opportunities', []);
  document.getElementById('admin-opps').innerHTML = opps.length
    ? `<div class="grid grid-3">${[...opps].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)).map(o=>opportunityCardHTML(o,true)).join('')}</div>`
    : `<div class="empty">No published opportunities.</div>`;

  /* gallery */
  const gallery = await storeGet('gallery', []);
  document.getElementById('admin-gallery').innerHTML = gallery.length
    ? `<div class="gallery-grid">${gallery.map(g=>galleryItemHTML(g,true)).join('')}</div>`
    : `<div class="empty">No gallery items yet.</div>`;
}
async function adminApprove(id){
  const pending = await storeGet('alumni:pending', []);
  const approved = await storeGet('alumni:approved', []);
  const idx = pending.findIndex(p=>p.id===id);
  if(idx === -1) return;
  const [rec] = pending.splice(idx,1);
  approved.push(rec);
  await storeSet('alumni:pending', pending);
  await storeSet('alumni:approved', approved);
  renderAdminPanel();
}
async function adminReject(id){
  if(!confirm('Reject and remove this registration?')) return;
  const pending = await storeGet('alumni:pending', []);
  await storeSet('alumni:pending', pending.filter(p=>p.id!==id));
  renderAdminPanel();
}
async function adminMarkIntroduced(id){
  const reqs = await storeGet('mentorship:requests', []);
  const r = reqs.find(x=>x.id===id);
  if(r){ r.status = 'introduced'; await storeSet('mentorship:requests', reqs); }
  renderAdminPanel();
}
async function adminDeleteRequest(id){
  if(!confirm('Delete this mentorship request?')) return;
  const reqs = await storeGet('mentorship:requests', []);
  await storeSet('mentorship:requests', reqs.filter(r=>r.id!==id));
  renderAdminPanel();
}
async function adminApproveSpot(id){
  const pending = await storeGet('spotlight:pending', []);
  const live = await storeGet('spotlight', []);
  const idx = pending.findIndex(s=>s.id===id);
  if(idx === -1) return;
  const [rec] = pending.splice(idx,1);
  rec.addedAt = Date.now(); // publishing time decides which story is "newest"
  live.push(rec);
  await storeSet('spotlight:pending', pending);
  await storeSet('spotlight', live);
  renderAdminPanel();
}
async function adminRejectSpot(id){
  if(!confirm('Reject and remove this story?')) return;
  const pending = await storeGet('spotlight:pending', []);
  await storeSet('spotlight:pending', pending.filter(s=>s.id!==id));
  renderAdminPanel();
}
async function adminRemoveSpot(id){
  if(!confirm('Remove this published story?')) return;
  const live = await storeGet('spotlight', []);
  await storeSet('spotlight', live.filter(s=>s.id!==id));
  renderAdminPanel();
}
async function adminApproveOpp(id){
  const pending = await storeGet('opportunities:pending', []);
  const live = await storeGet('opportunities', []);
  const idx = pending.findIndex(o=>o.id===id);
  if(idx === -1) return;
  const [rec] = pending.splice(idx,1);
  rec.addedAt = Date.now();
  live.push(rec);
  await storeSet('opportunities:pending', pending);
  await storeSet('opportunities', live);
  renderAdminPanel();
}
async function adminRejectOpp(id){
  if(!confirm('Reject and remove this opportunity?')) return;
  const pending = await storeGet('opportunities:pending', []);
  await storeSet('opportunities:pending', pending.filter(o=>o.id!==id));
  renderAdminPanel();
}
async function adminRemoveOpp(id){
  if(!confirm('Remove this opportunity?')) return;
  const live = await storeGet('opportunities', []);
  await storeSet('opportunities', live.filter(o=>o.id!==id));
  renderAdminPanel();
}
async function adminAddEvent(evt){
  evt.preventDefault();
  const events = await storeGet('events', []);
  events.push({
    id: uid(),
    title: document.getElementById('e-title').value.trim(),
    date: document.getElementById('e-date').value,
    type: document.getElementById('e-type').value,
    location: document.getElementById('e-location').value.trim(),
    description: document.getElementById('e-desc').value.trim(),
    interest: 0
  });
  await storeSet('events', events);
  evt.target.reset();
  renderAdminPanel();
  renderEvents();
}
async function adminDeleteGallery(id){
  if(!confirm('Remove this photo?')) return;
  const gallery = await storeGet('gallery', []);
  await storeSet('gallery', gallery.filter(g=>g.id!==id));
  renderAdminPanel();
  renderGallery();
}

/* ============ BOOT ============ */
document.addEventListener('DOMContentLoaded', () => {
  initRegisterForm();
  go('home');
});
