/* ============ CONFIG ============ */
// Change this before sharing the admin link with volunteers.
const ADMIN_PASSCODE = "MTE-ADMIN-2026";
const SECTORS = ["Robotics & Automation","Software & IT","Automotive","Energy & Power","Manufacturing & Industry 4.0","Academia & Research","Higher Studies","Public Service / Government","Entrepreneurship","Other"];
const FIRST_BATCH_YEAR = 2013;
const CURRENT_YEAR = new Date().getFullYear();

let adminUnlocked = false;
let currentProfile = null; // {status:'approved'|'pending', record}

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

/* ============ ROUTING ============ */
function go(pageId){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.navlinks button').forEach(b => b.classList.toggle('active', b.dataset.page === pageId));
  document.getElementById('navlinks').classList.remove('open');
  window.scrollTo({top:0, behavior:'smooth'});
  if(pageId === 'directory') renderDirectory();
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

/* ============ ALUMNI CARD RENDER ============ */
function initials(name){
  return name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('');
}
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHtml(s); }

function alumniCardHTML(a){
  const avatar = a.photo
    ? `<div class="avatar"><img src="${escapeAttr(a.photo)}" alt=""></div>`
    : `<div class="avatar">${initials(a.name||'?')}</div>`;
  const role = [a.position, a.company].filter(Boolean).join(' · ');
  const loc = [a.city, a.country].filter(Boolean).join(', ');
  return `
    <div class="alumni-card">
      <div class="alumni-top">
        ${avatar}
        <div>
          <span class="partcode">MTE-${String(a.batch).slice(2)}</span>
          <h4>${escapeHtml(a.name)}</h4>
          <p class="role">${escapeHtml(role || 'Role not listed')}</p>
        </div>
      </div>
      <div class="pin-row">
        ${a.sector ? `<span class="pin">${escapeHtml(a.sector)}</span>` : ''}
        ${loc ? `<span class="pin">${escapeHtml(loc)}</span>` : ''}
      </div>
      ${a.bio ? `<p class="bio">${escapeHtml(a.bio)}</p>` : ''}
      <div class="alumni-links">
        ${a.linkedin ? `<a href="${escapeAttr(a.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>` : ''}
      </div>
    </div>`;
}

/* ============ HOME ============ */
async function renderHome(){
  const approved = await storeGet('alumni:approved', []);
  document.getElementById('stat-alumni').textContent = approved.length;
  document.getElementById('stat-batches').textContent = new Set(approved.map(a=>a.batch)).size;
  document.getElementById('stat-countries').textContent = new Set(approved.map(a=>a.country).filter(Boolean)).size;

  const recent = [...approved].sort((a,b)=> (b.addedAt||0)-(a.addedAt||0)).slice(0,3);
  const homeRecent = document.getElementById('home-recent');
  homeRecent.innerHTML = recent.length ? recent.map(alumniCardHTML).join('') :
    `<div class="empty">No alumni listed yet — be the first to <a href="#" onclick="go('register');return false;">join the directory</a>.</div>`;

  const events = await storeGet('events', []);
  const upcoming = events.filter(e => e.date >= todayStr()).sort((a,b)=> a.date.localeCompare(b.date)).slice(0,3);
  document.getElementById('home-events').innerHTML = upcoming.length
    ? upcoming.map(eventRowHTML).join('')
    : `<div class="empty">No upcoming events yet. Check back soon.</div>`;
}
function todayStr(){ return new Date().toISOString().slice(0,10); }

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

  const filtered = approved.filter(a => {
    if(batch && String(a.batch) !== batch) return false;
    if(sector && a.sector !== sector) return false;
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
        <p style="margin:0;font-size:.85rem;">${escapeHtml(e.location||'')}${e.description ? ' — ' + escapeHtml(e.description) : ''}</p>
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
  if(ev){ ev.interest = (ev.interest||0) + 1; await storeSet('events', events); renderEvents(); }
}

/* ============ GALLERY ============ */
function galleryItemHTML(g, adminMode){
  return `
    <div class="gallery-item">
      <img src="${escapeAttr(g.imageUrl)}" alt="${escapeAttr(g.caption)}" loading="lazy" onerror="this.style.display='none'">
      <div class="gallery-cap"><b>${escapeHtml(g.caption)}</b><br>— ${escapeHtml(g.submittedBy)}
        ${adminMode ? `<br><button class="btn btn-sm btn-danger" style="margin-top:6px;" onclick="adminDeleteGallery('${g.id}')">Remove</button>` : ''}
      </div>
    </div>`;
}
async function renderGallery(){
  const gallery = await storeGet('gallery', []);
  document.getElementById('gallery-grid').innerHTML = gallery.length
    ? [...gallery].sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)).map(g=>galleryItemHTML(g,false)).join('')
    : `<div class="empty" style="grid-column:1/-1;">No photos yet — add the first one below.</div>`;
}
async function submitGallery(evt){
  evt.preventDefault();
  const g = {
    id: uid(),
    submittedBy: document.getElementById('g-name').value.trim(),
    imageUrl: document.getElementById('g-url').value.trim(),
    caption: document.getElementById('g-caption').value.trim(),
    addedAt: Date.now()
  };
  const gallery = await storeGet('gallery', []);
  gallery.push(g);
  const ok = await storeSet('gallery', gallery);
  const msg = document.getElementById('g-msg');
  msg.className = 'msg show ' + (ok ? 'ok' : 'err');
  msg.textContent = ok ? 'Photo added to the gallery.' : 'Could not save — please try again.';
  if(ok){ evt.target.reset(); renderGallery(); }
}

/* ============ REGISTRATION ============ */
function initRegisterForm(){
  populateBatchOptions(document.getElementById('r-batch'), false);
  populateSectorOptions(document.getElementById('r-sector'), false);
}
async function submitRegistration(evt){
  evt.preventDefault();
  const msg = document.getElementById('r-msg');
  const email = document.getElementById('r-email').value.trim().toLowerCase();

  const pending = await storeGet('alumni:pending', []);
  const approved = await storeGet('alumni:approved', []);
  if(pending.some(a=>a.email===email) || approved.some(a=>a.email===email)){
    msg.className = 'msg show err';
    msg.textContent = 'This email is already registered. Use "My Profile" to edit your listing.';
    return;
  }

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
    addedAt: Date.now()
  };
  pending.push(record);
  const ok = await storeSet('alumni:pending', pending);
  msg.className = 'msg show ' + (ok ? 'ok' : 'err');
  msg.textContent = ok
    ? 'Thanks! Your profile is pending review and will appear in the directory once approved.'
    : 'Something went wrong saving your registration — please try again.';
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
  msg.className = '';
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
  };
  const key = status === 'approved' ? 'alumni:approved' : 'alumni:pending';
  const list = await storeGet(key, []);
  const idx = list.findIndex(a=>a.id===record.id);
  if(idx > -1) list[idx] = updated;
  const ok = await storeSet(key, list);
  currentProfile.record = updated;
  const msg = document.getElementById('ed-msg');
  msg.className = 'msg show ' + (ok?'ok':'err');
  msg.textContent = ok ? 'Saved.' : 'Could not save changes.';
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
  const msg = document.getElementById('a-msg');
  if(val === ADMIN_PASSCODE){
    adminUnlocked = true;
    document.getElementById('admin-gate').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    renderAdminPanel();
  }else{
    msg.className = 'msg show err';
    msg.textContent = 'Incorrect passcode.';
  }
}
async function renderAdminPanel(){
  const pending = await storeGet('alumni:pending', []);
  document.getElementById('pending-count').textContent = pending.length;
  document.getElementById('pending-list').innerHTML = pending.length ? pending.map(p => `
    <div class="pending-row">
      <div>
        <strong>${escapeHtml(p.name)}</strong> <span class="mono" style="color:var(--muted);font-size:.8rem;">· MTE'${String(p.batch).slice(2)} · ${escapeHtml(p.email)}</span>
        <p style="margin:2px 0 0;font-size:.85rem;">${escapeHtml([p.position,p.company].filter(Boolean).join(' at '))}</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-sm btn-primary" onclick="adminApprove('${p.id}')">Approve</button>
        <button class="btn btn-sm btn-danger" onclick="adminReject('${p.id}')">Reject</button>
      </div>
    </div>`).join('') : `<div class="empty">No pending registrations.</div>`;

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
  renderHome();
  go('home');
});
