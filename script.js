'use strict';
/* ════════════════════════════════════════════════════════════════
   Thư viện THPT Nguyễn Hữu Cảnh — Core Script (dùng chung mọi trang)
   ════════════════════════════════════════════════════════════════ */

// ── PHIÊN BẢN DỮ LIỆU ────────────────────────────────────────
const DB_VERSION = 'nhc4_v3_2026';

const WebApp_URL = 'https://script.google.com/macros/s/AKfycbzj7-Ex9GqOf5DzRt0QnVZXL58mLZciCUQ9bul-UVCU7pGEgqhBynXEURzxGzHvElnDjg/exec';

const GS = {
  USER:     WebApp_URL,
  BOOK:     WebApp_URL,
  BORROW:   WebApp_URL,
  FEEDBACK: WebApp_URL // Nếu có dùng feedback thì dán luôn
};
// ── STORAGE KEYS ──────────────────────────────────────────────
const K = {
  BOOKS:'nhc4_books', USERS:'nhc4_users', BORROWS:'nhc4_borrows',
  DOCS:'nhc4_docs',   PWD:'nhc4_pwd',     AUTH:'nhc4_auth',
};
const K_VER = 'nhc4_dbver';

// ── KIỂM TRA PHIÊN BẢN ────────────────────────────────────────
(function checkVersion() {
  if (localStorage.getItem(K_VER) !== DB_VERSION) {
    const ALL_KEYS = [...Object.values(K), 'nhc4_feedbacks', 'nhc4_config', K_VER];
    ALL_KEYS.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(K_VER, DB_VERSION);
    if (!window.location.pathname.endsWith('login.html') &&
        !window.location.pathname.endsWith('index.html') &&
        window.location.pathname !== '/') {
      window.location.href = 'login.html';
    }
  }
})();

// ── DỮ LIỆU MẶC ĐỊNH ─────────────────────────────────────────
const DEF_USERS = [
  {
    id:'u1', username:'MTuyeen', name:'Quản trị viên',
    email:'admin@nhc.edu.vn', studentId:'LS001', className:'',
    role:'librarian', status:'approved', createdDate:'2026-01-01',
  },
];
const DEF_BOOKS   = [];
const DEF_BORROWS = [];

const ANNOUNCEMENTS = [
  { id:'a1', title:'Chào mừng đến hệ thống thư viện!', content:'Hệ thống quản lý thư viện THPT Nguyễn Hữu Cảnh đã sẵn sàng. Thủ thư có thể bắt đầu nhập sách và quản lý mượn trả.', date:'2026-03-24', type:'notice' },
  { id:'a2', title:'Hướng dẫn sử dụng', content:'Thủ thư vào trang Sách để thêm đầu sách. Học sinh/Giáo viên đăng ký tài khoản và chờ thủ thư phê duyệt trước khi đăng nhập.', date:'2026-03-24', type:'news' },
];

const CAT_COLORS = {
  'Văn học':   { bg:'#FEF3C7', c:'#92400E' },
  'Toán học':  { bg:'#DBEAFE', c:'#1E40AF' },
  'Lịch sử':   { bg:'#FCE7F3', c:'#9D174D' },
  'Vật lý':    { bg:'#D1FAE5', c:'#065F46' },
  'Hóa học':   { bg:'#EDE9FE', c:'#5B21B6' },
  'Ngoại ngữ': { bg:'#FEE2E2', c:'#991B1B' },
  'Sinh học':  { bg:'#D1FAE5', c:'#065F46' },
  'Địa lý':    { bg:'#FEF3C7', c:'#78350F' },
  'Khác':      { bg:'#F3F4F6', c:'#374151' },
};

const ROLE_LABEL = { student:'Học sinh', teacher:'Giáo viên', librarian:'Thủ thư' };
const ROLE_COLOR  = {
  student:   { bg:'#DBEAFE', c:'#1E40AF' },
  teacher:   { bg:'#D1FAE5', c:'#065F46' },
  librarian: { bg:'#EDE9FE', c:'#5B21B6' },
};

const PAGE_TITLE = {
  dashboard:'Trang chủ', books:'Quản lý sách', borrow:'Mượn / Trả',
  documents:'Tài liệu & Đề thi', users:'Người dùng', settings:'Cài đặt', feedback:'Phản hồi',
};

const NAV = [
  { id:'dashboard', icon:'🏠', label:'Trang chủ',   file:'dashboard.html', roles:['student','teacher','librarian'] },
  { id:'books',     icon:'📚', label:'Sách',         file:'books.html',     roles:['student','teacher','librarian'] },
  { id:'borrow',    icon:'🔄', label:'Mượn / Trả',  file:'borrow.html',    roles:['student','teacher','librarian'] },
  { id:'documents', icon:'📄', label:'Tài liệu',     file:'documents.html', roles:['teacher','librarian'] },
  { id:'users',     icon:'👥', label:'Người dùng',   file:'users.html',     roles:['librarian'] },
  { id:'feedback',  icon:'💬', label:'Phản hồi',     file:'feedback.html',  roles:['student','teacher','librarian'] },
  { id:'settings',  icon:'⚙️', label:'Cài đặt',      file:'settings.html',  roles:['librarian'] },
];

// ── LOCAL STORAGE ─────────────────────────────────────────────
const db = {
  get(k, def=null) { try { const v=localStorage.getItem(k); return v?JSON.parse(v):def; } catch { return def; } },
  set(k, v)        { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) { toast('Lỗi lưu dữ liệu: '+e.message,'error'); } },
  del(k)           { try { localStorage.removeItem(k); } catch {} },
};

// ── DATA GETTERS ──────────────────────────────────────────────
function getBooks()   { return db.get(K.BOOKS,   DEF_BOOKS);   }
function getUsers()   { return db.get(K.USERS,   DEF_USERS);   }
function getBorrows() { return db.get(K.BORROWS, DEF_BORROWS); }
function getDocs()    { return db.get(K.DOCS,    []);           }
function getPwds()    {
  const p = db.get(K.PWD);
  if (p) return p;
  return { MTuyeen: '123' };
}

function saveBooks(v)   { db.set(K.BOOKS,   v); }
function saveUsers(v)   { db.set(K.USERS,   v); }
function saveBorrows(v) { db.set(K.BORROWS, v); }
function saveDocs(v)    { db.set(K.DOCS,    v); }
function savePwds(p)    { db.set(K.PWD,     p); }

// ── AUTH ──────────────────────────────────────────────────────
function getCurrentUser() {
  const uid = db.get(K.AUTH);
  if (!uid) return null;
  return getUsers().find(u => u.id === uid) || null;
}

function doLogin(username, password) {
  const users = getUsers();
  const u = users.find(x => x.username.toLowerCase() === username.trim().toLowerCase());
  if (!u)                       return 'not_found';
  if (u.status === 'pending')   return 'pending';
  if (u.status === 'rejected')  return 'rejected';
  const pwds   = getPwds();
  const stored = pwds[u.username] ?? u.username;
  if (password !== stored)      return 'wrong_pwd';
  db.set(K.AUTH, u.id);
  gsPost(GS.USER, {
    action:'LOGIN', username:u.username, name:u.name,
    role:ROLE_LABEL[u.role]||u.role, loginTime:nowStr(),
  });
  return 'success';
}

function doLogout() {
  db.del(K.AUTH);
  location.href = 'login.html';
}

function doRegister(data) {
  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === data.username.trim().toLowerCase()))
    return 'exists';
  const nu = {
    id:'u'+Date.now(), username:data.username.trim(), name:data.name.trim(),
    email:data.email.trim(), studentId:data.studentId||'', className:data.className||'',
    role:data.role, status:'pending', createdDate:todayStr(),
  };
  users.push(nu);
  saveUsers(users);
  const p = getPwds(); p[nu.username] = data.password; savePwds(p);
  gsPost(GS.USER, {
    action:'REGISTER', username:nu.username, name:nu.name, email:nu.email,
    studentId:nu.studentId, className:nu.className, role:ROLE_LABEL[nu.role]||nu.role,
    status:'Chờ duyệt', registerDate:nu.createdDate,
  });
  return 'success';
}

// ── GOOGLE SHEETS ─────────────────────────────────────────────
function gsPost(url, payload) {
  fetch(url, {
    method:'POST', mode:'no-cors',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload),
  }).then(() => {
    const b = document.getElementById('offline-badge');
    if (b) b.classList.remove('show');
  }).catch(() => {
    const b = document.getElementById('offline-badge');
    if (b) b.classList.add('show');
  });
}

// ── TOAST ─────────────────────────────────────────────────────
function toast(msg, type='info', title='') {
  let c = document.getElementById('toast-container');
  if (!c) { c=document.createElement('div'); c.id='toast-container'; document.body.appendChild(c); }
  const d = document.createElement('div');
  d.className = 'toast toast-'+type;
  d.innerHTML = `<div class="toast-body">${title?`<p class="toast-title">${esc(title)}</p>`:''}<p class="toast-msg">${esc(msg)}</p></div><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  c.appendChild(d);
  setTimeout(() => d.remove(), 4500);
}

// ── UTILS ─────────────────────────────────────────────────────
function esc(s)    { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function todayStr(){ return new Date().toISOString().split('T')[0]; }
function nowStr()  { return new Date().toLocaleString('vi-VN'); }
function defDue()  { const d=new Date(); d.setDate(d.getDate()+14); return d.toISOString().split('T')[0]; }
function fmtD(s)   { if(!s) return '—'; return new Date(s).toLocaleDateString('vi-VN'); }
function fmtSz(b)  { if(!b) return ''; if(b<1024) return b+'B'; if(b<1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; }
function uid()     { return 'id'+Date.now()+Math.random().toString(36).slice(2,6); }
function docIcon(t){ if(!t) return '📄'; const e=t.split('.').pop()?.toLowerCase(); return {pdf:'📕',doc:'📘',docx:'📘',ppt:'📙',pptx:'📙',xls:'📗',xlsx:'📗',txt:'📝',png:'🖼️',jpg:'🖼️',jpeg:'🖼️'}[e]||'📄'; }

function statusBadge(st) {
  if (st==='borrowed') return `<span class="badge badge-blue">⏳ Đang mượn</span>`;
  if (st==='overdue')  return `<span class="badge badge-red">⚠️ Quá hạn</span>`;
  return `<span class="badge badge-green">✅ Đã trả</span>`;
}
function userStatusBadge(st) {
  if (st==='pending')  return `<span class="badge badge-yellow">⏳ Chờ duyệt</span>`;
  if (st==='approved') return `<span class="badge badge-green">✅ Đã duyệt</span>`;
  return `<span class="badge badge-red">❌ Từ chối</span>`;
}
function avatarHtml(name, role, cls='avatar-md') {
  const rc = ROLE_COLOR[role]||{bg:'#F3F4F6',c:'#374151'};
  return `<div class="avatar ${cls}" style="background:${rc.bg};color:${rc.c}">${esc((name||'?').charAt(0))}</div>`;
}
function catTag(cat) {
  const cc = CAT_COLORS[cat]||CAT_COLORS['Khác'];
  return `<span class="cat-tag" style="background:${cc.bg};color:${cc.c}">${esc(cat)}</span>`;
}
function roleTag(role) {
  const rc = ROLE_COLOR[role]||{bg:'#F3F4F6',c:'#374151'};
  return `<span class="role-tag" style="background:${rc.bg};color:${rc.c}">${ROLE_LABEL[role]||role}</span>`;
}

// ── LOGO HTML helper (thử PNG → SVG → emoji fallback) ─────────
function logoImgHtml(cls, size=40, extraStyle='') {
  return `<img src="school-logo.png" alt="Logo NHC" class="${cls}"
    style="${extraStyle}"
    onerror="this.onerror=null;this.src='school-logo.svg';this.onerror=function(){this.outerHTML='<div class=&quot;${cls === 'sb-logo' ? 'sb-logo-fb' : 'll-logo-fb'}&quot;>📚</div>'};">`;
}

// ── PAGE INIT ─────────────────────────────────────────────────
function initPage(pageId, allowed=[]) {
  const u = getCurrentUser();
  if (!u) { location.replace('login.html'); return; }
  if (allowed.length && !allowed.includes(u.role)) { location.replace('dashboard.html'); return; }
  renderLayout(pageId, u);
}

// ── SIDEBAR + TOPBAR ──────────────────────────────────────────
function renderLayout(pageId, u) {
  const pending = getUsers().filter(x=>x.status==='pending').length;
  const visible = NAV.filter(n=>n.roles.includes(u.role));

  const sidebarHtml = `
<aside class="sidebar" id="sidebar">
  <div class="sb-header">
    ${logoImgHtml('sb-logo')}
    <div><p class="sb-title">Thư viện THPT</p><p class="sb-sub">Nguyễn Hữu Cảnh</p></div>
  </div>
  <nav class="sb-nav">
    ${visible.map(n=>`
    <button class="nav-item${pageId===n.id?' active':''}" onclick="location.href='${n.file}'" title="${n.label}">
      ${pageId===n.id?'<span class="nav-bar"></span>':''}
      <span class="nav-icon">${n.icon}</span>
      <span class="nav-label">${n.label}</span>
      ${n.id==='users'&&pending?`<span class="nav-badge">${pending}</span>`:''}
    </button>`).join('')}
  </nav>
  <div class="sb-user">
    ${avatarHtml(u.name, u.role)}
    <div style="flex:1;min-width:0">
      <p class="sb-uname">${esc(u.name)}</p>
      <p class="sb-urole">${ROLE_LABEL[u.role]||u.role}</p>
    </div>
    <span class="sb-logout" title="Đăng xuất" onclick="confirmLogout()">🚪</span>
  </div>
</aside>`;

  const topbarHtml = `
<header class="topbar">
  <button class="menu-btn" onclick="toggleSidebar()">☰</button>
  <div class="topbar-info">
    <p class="topbar-greet">Xin chào, <strong>${esc(u.name)}</strong>!</p>
    <p class="topbar-sub">${PAGE_TITLE[pageId]||'Trang chủ'}</p>
  </div>
  <div class="topbar-right">
    <span class="offline-badge" id="offline-badge">📡 Offline</span>
    ${pending>0&&u.role==='librarian'
      ?`<button class="icon-btn" onclick="location.href='users.html'"
          title="${pending} tài khoản chờ duyệt" style="color:#D97706">
          🔔<span class="dot"></span>
        </button>`:''}
  </div>
</header>`;

  const sbCnt = document.getElementById('sidebar-cnt');
  const tbCnt = document.getElementById('topbar-cnt');
  if (sbCnt) sbCnt.innerHTML = sidebarHtml + `<div class="sb-backdrop" id="sb-backdrop" onclick="toggleSidebar()"></div>`;
  if (tbCnt) tbCnt.innerHTML = topbarHtml;
}

function toggleSidebar() {
  document.getElementById('sidebar')?.classList.toggle('open');
  document.getElementById('sb-backdrop')?.classList.toggle('show');
}

function confirmLogout() {
  if (confirm('Bạn có chắc muốn đăng xuất không?')) doLogout();
}