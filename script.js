'use strict';
// ── PHIÊN BẢN DỮ LIỆU ────────────────────────────────────────
const DB_VERSION = 'nhc4_v3_2026';

const WebApp_URL = 'https://script.google.com/macros/s/AKfycbwR0CVumSRIAOi0b4k2Csc5xOZi00fFP_H7bCpqqby9Xb0U1NqPxZo_fYDMv02cel6cog/exec';

const GS = {
  USER:     WebApp_URL,
  BOOK:     WebApp_URL,
  BORROW:   WebApp_URL,
  FEEDBACK: WebApp_URL,
  Finance:  WebApp_URL
};

// ── STORAGE KEYS ──────────────────────────────────────────────
const K = {
  BOOKS:'nhc4_books', USERS:'nhc4_users', BORROWS:'nhc4_borrows',
  DOCS:'nhc4_docs',   PWD:'nhc4_pwd',     AUTH:'nhc4_auth',
  FINANCE: 'nhc4_finance'
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
  'SGK10':   { bg:'#FEF3C7', c:'#92400E' },
  'SGK11':  { bg:'#DBEAFE', c:'#1E40AF' },
  'SGK12':   { bg:'#FCE7F3', c:'#9D174D' },
  'Truyện ngắn':    { bg:'#D1FAE5', c:'#065F46' },
  'Tiểu Thuyết':   { bg:'#EDE9FE', c:'#5B21B6' },
  'Truyện tranh': { bg:'#FEE2E2', c:'#991B1B' },
  'Kỹ năng sống':  { bg:'#D1FAE5', c:'#065F46' },
  'Khác':      { bg:'#F3F4F6', c:'#374151' },
};

const ROLE_LABEL = { student:'Học sinh', teacher:'Giáo viên', librarian:'Thủ thư' };
const ROLE_COLOR  = {
  student:   { bg:'#DBEAFE', c:'#1E40AF' },
  teacher:   { bg:'#D1FAE5', c:'#065F46' },
  librarian: { bg:'#EDE9FE', c:'#5B21B6' },
};

const PAGE_TITLE = {
  dashboard : 'Trang chủ',
  books     : 'Quản lý sách',
  borrow    : 'Mượn / Trả',
  rules     : 'Nội quy Thư viện',
  documents : 'Tài liệu & Đề thi',
  users     : 'Người dùng',
  feedback  : 'Phản hồi',
  settings  : 'Cài đặt',
  finance   : 'Quản lý Tài chính',
};

const NAV = [
  { id:'dashboard', icon:'🏠', label:'Trang chủ',  file:'dashboard.html', roles:['student','teacher','librarian'] },
  { id:'books',     icon:'📚', label:'Sách',        file:'books.html',     roles:['student','teacher','librarian'] },
  { id:'borrow',    icon:'🔄', label:'Mượn / Trả', file:'borrow.html',    roles:['student','teacher','librarian'] },
  { id:'rules',     icon:'📜', label:'Nội quy',     file:'rules.html',     roles:['student','teacher','librarian'] },
  { id:'documents', icon:'📄', label:'Tài liệu',    file:'documents.html', roles:['teacher','librarian'] },
  { id:'users',     icon:'👥', label:'Người dùng',  file:'users.html',     roles:['librarian'] },
  { id:'finance',   icon:'💰', label:'Quản lý Tài chính', file:'finance.html', roles:['librarian'] },
  { id:'feedback',  icon:'💬', label:'Phản hồi',    file:'feedback.html',  roles:['student','teacher','librarian'] },
  { id:'settings',  icon:'⚙️', label:'Cài đặt',     file:'settings.html',  roles:['librarian'] },
];

// ── LOCAL STORAGE ─────────────────────────────────────────────
const db = {
  get(k, def=null) { try { const v=localStorage.getItem(k); return v?JSON.parse(v):def; } catch { return def; } },
  set(k, v)        { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) { toast('Lỗi lưu dữ liệu: '+e.message,'error'); } },
  del(k)           { try { localStorage.removeItem(k); } catch {} },
};

// ── WRITE-LOCK: Ngăn cloud sync ghi đè dữ liệu vừa thay đổi cục bộ ──
// Sau khi người dùng xóa/thêm sách, chờ 60 giây trước khi cho cloud ghi đè local
const WRITE_LOCK_MS = 60000;
const _writeTS = { books: 0, users: 0, borrows: 0 };

// ── DELETED BOOKS TRACKER: Ngăn cloud sync khôi phục sách đã xóa ──
const K_DEL_BOOKS = 'nhc4_del_books';

function trackDeletedBook(bookId) {
  try {
    var list = JSON.parse(localStorage.getItem(K_DEL_BOOKS) || '[]');
    var now = Date.now();
    var fresh = list.filter(function(x) { return (now - x.ts) < 172800000; });
    fresh.push({ id: String(bookId), ts: now });
    localStorage.setItem(K_DEL_BOOKS, JSON.stringify(fresh));
  } catch(e) {}
}

function getDeletedBookIds() {
  try {
    var list = JSON.parse(localStorage.getItem(K_DEL_BOOKS) || '[]');
    var now = Date.now();
    return list.filter(function(x) { return (now - x.ts) < 172800000; }).map(function(x) { return x.id; });
  } catch(e) { return []; }
}

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

function saveBooks(v)   { db.set(K.BOOKS, v);   _writeTS.books   = Date.now(); syncBooksToCloud(v); }
function saveUsers(v)   { db.set(K.USERS, v);   _writeTS.users   = Date.now(); syncUsersToCloud(v); }
function saveBorrows(v) { db.set(K.BORROWS, v); _writeTS.borrows = Date.now(); syncBorrowsToCloud(v); }
function saveDocs(v)    { db.set(K.DOCS,    v); }
function savePwds(p)    { db.set(K.PWD,     p); syncPwdsToCloud(p); }

// ══════════════════════════════════════════════════════════════
// ĐỒNG BỘ DỮ LIỆU VỚI GOOGLE SHEETS
// ══════════════════════════════════════════════════════════════

// ── Đọc dữ liệu từ Google Sheets ──
function gsGet(action) {
  return fetch(WebApp_URL + '?action=' + action)
    .then(r => r.json())
    .catch(err => {
      console.warn('gsGet error:', err);
      const b = document.getElementById('offline-badge');
      if (b) b.classList.add('show');
      return { success: false, data: [] };
    });
}

// ── Đồng bộ TẤT CẢ dữ liệu từ cloud về local (gọi khi mở trang) ──
function syncFromCloud(callback) {
  gsGet('GET_ALL').then(result => {
    if (result && result.success) {
      const now = Date.now();

      // ★ FIX RACE CONDITION: Chỉ ghi đè local nếu không có thay đổi cục bộ gần đây
      // (tránh cloud sync xóa mất thao tác xóa/thêm của người dùng)
      if (result.books && result.books.length > 0 &&
          (now - _writeTS.books > WRITE_LOCK_MS)) {
        // ★ FIX: Chuẩn hóa tên field khi nhận sách từ cloud
        const normalizedBooks = result.books.map(function(b) {
          return Object.assign({}, b, {
            avail:     b.avail     !== undefined ? b.avail     : (b.available !== undefined ? Number(b.available) : Number(b.qty || 0)),
            cover:     b.cover     || b.coverUrl  || '',
            publisher: b.publisher || b.description || '',
            pdf:       b.pdf       || '',
            bCount:    Number(b.bCount) || 0,
            qty:       Number(b.qty)    || 0,
          });
        });
        // ★ FIX XÓA SÁCH: Lọc ra các sách đã bị xóa cục bộ (ngăn cloud khôi phục lại)
        const deletedIds = getDeletedBookIds();
        const finalBooks = deletedIds.length > 0
          ? normalizedBooks.filter(function(b) { return !deletedIds.includes(b.id); })
          : normalizedBooks;
        db.set(K.BOOKS, finalBooks);
        // Nếu cloud vẫn còn sách đã xóa → ghi lại lên cloud để đồng bộ
        if (deletedIds.length > 0 && normalizedBooks.length !== finalBooks.length) {
          console.log('🗑️ Đồng bộ xóa sách lên cloud (' + (normalizedBooks.length - finalBooks.length) + ' sách)');
          syncBooksToCloud(finalBooks);
        }
      } else if (now - _writeTS.books <= WRITE_LOCK_MS) {
        console.log('⏸️ Bỏ qua ghi đè sách từ cloud (vừa có thay đổi cục bộ)');
      }

      // ★ FIX: Extract mật khẩu từ users data (Apps Script trả về users có trường password)
      if (result.users && result.users.length > 0 &&
          (now - _writeTS.users > WRITE_LOCK_MS)) {
        const cloudPwds = {};
        const cleanUsers = result.users.map(function(u) {
          if (u.password) {
            cloudPwds[u.username] = u.password;
          }
          const clean = Object.assign({}, u);
          delete clean.password;
          return clean;
        });
        db.set(K.USERS, cleanUsers);

        if (Object.keys(cloudPwds).length > 0) {
          const localPwds = getPwds();
          const merged = Object.assign({}, localPwds, cloudPwds);
          db.set(K.PWD, merged);
          console.log('✅ Đã đồng bộ ' + Object.keys(cloudPwds).length + ' mật khẩu từ cloud');
        }
      }

      if (result.pwds && Object.keys(result.pwds).length > 0) {
        const localPwds = getPwds();
        const merged = Object.assign({}, localPwds, result.pwds);
        db.set(K.PWD, merged);
      }

      if (result.borrows && result.borrows.length > 0 &&
          (now - _writeTS.borrows > WRITE_LOCK_MS)) {
        db.set(K.BORROWS, result.borrows);
      }

      if (result.finance && result.finance.length > 0) {
        db.set(K.FINANCE, result.finance);
      }

      const b = document.getElementById('offline-badge');
      if (b) b.classList.remove('show');

      console.log('✅ Đã đồng bộ dữ liệu từ cloud');
      toast('Đã đồng bộ dữ liệu', 'success');
    } else {
      console.warn('⚠️ Không thể đồng bộ, dùng dữ liệu local');
    }
    if (callback) callback();
  }).catch(() => {
    console.warn('⚠️ Offline - dùng dữ liệu local');
    if (callback) callback();
  });
}

// ── Ghi sách lên cloud ──
function syncBooksToCloud(books) {
  gsPost(WebApp_URL, { action: 'SAVE_BOOKS', books: books });
}

// ── Ghi users lên cloud ──
function syncUsersToCloud(users) {
  const pwds = getPwds();
  gsPost(WebApp_URL, { action: 'SAVE_USERS', users: users, pwds: pwds });
}

// ── Ghi borrows lên cloud ──
function syncBorrowsToCloud(borrows) {
  gsPost(WebApp_URL, { action: 'SAVE_BORROWS', borrows: borrows });
}

// ── Ghi mật khẩu lên cloud ──
function syncPwdsToCloud(pwds) {
  // ★ FIX: SAVE_PWDS nay đã có trong Apps Script (trước đây bị thiếu)
  gsPost(WebApp_URL, { action: 'SAVE_PWDS', pwds: pwds });
}

// ── AUTH ──────────────────────────────────────────────────────
function getCurrentUser() {
  const uid = db.get(K.AUTH);
  if (!uid) return null;

  // ★ FIX: Xử lý trường hợp đặc biệt admin_root (MTuyeen không cần cloud)
  if (uid === 'admin_root') {
    return { id:'admin_root', username:'MTuyeen', name:'Ngọc Tuyền (Admin)', role:'librarian', status:'approved' };
  }

  // ★ FIX: Hỗ trợ legacy - nếu lỡ lưu cả object thay vì id string
  if (typeof uid === 'object' && uid !== null) {
    if (uid.id === 'admin_root') {
      return { id:'admin_root', username:'MTuyeen', name:'Ngọc Tuyền (Admin)', role:'librarian', status:'approved' };
    }
    return getUsers().find(u => u.id === uid.id) || uid;
  }

  return getUsers().find(u => u.id === uid) || null;
}

function doLogin(data) {
  // ★ FIX: Hỗ trợ cả doLogin({username, password}) lẫn doLogin(username, password)
  let username, password;
  if (typeof data === 'object' && data !== null) {
    username = data.username;
    password = data.password;
  } else {
    username = data;
    password = arguments[1];
  }

  // 1. ★ Kiểm tra Admin đặc biệt - LUÔN ưu tiên, không cần cloud, không cần localStorage
  if (username === 'MTuyeen' && password === '123') {
    db.set(K.AUTH, 'admin_root'); // ★ FIX: Lưu id string thay vì object
    return 'success';
  }

  // 2. Kiểm tra User thông thường từ LocalStorage
  const users = getUsers();
  const u = users.find(x => x.username === username);

  if (!u) return 'not_found';           // ★ FIX: trả về code thay vì chuỗi
  if (u.status === 'pending')  return 'pending';
  if (u.status === 'rejected') return 'rejected';
  if (u.status !== 'approved') return 'not_found';

  const pwds = getPwds();
  if (pwds[username] === password) {
    db.set(K.AUTH, u.id);               // ★ FIX: Lưu u.id thay vì cả object u
    return 'success';
  }

  return 'wrong_pwd';                   // ★ FIX: trả về code thay vì chuỗi
}
function doLogout() {
  db.del(K.AUTH);
  location.href = 'login.html';
}

// ★ FIX: Lưu mật khẩu vào local TRƯỚC khi gọi saveUsers
// để syncUsersToCloud bao gồm password của user mới
function doRegister(data) {
  const users = getUsers();
  if (users.some(u => u.username && u.username.toLowerCase() === data.username.trim().toLowerCase()))
    return 'exists';
  const nu = {
    id:'u'+Date.now(), username:data.username.trim(), name:data.name.trim(),
    email:data.email.trim(), studentId:data.studentId||'', className:data.className||'',
    role:data.role, status:'pending', createdDate:todayStr(),
  };
  // ★ FIX: Lưu password local TRƯỚC để syncUsersToCloud đọc được
  const p = getPwds();
  p[nu.username] = data.password;
  db.set(K.PWD, p); // Lưu cục bộ (chưa sync riêng)
  // Thêm user và sync (lúc này getPwds() đã có password mới)
  users.push(nu);
  saveUsers(users);  // Sync users + pwds lên cloud
  syncPwdsToCloud(p); // Sync pwds riêng (backup đảm bảo lưu được)
  return 'success';
}

// ── GOOGLE SHEETS POST ────────────────────────────────────────
// ★ FIX: Thêm mode:'no-cors' để tránh CORS block
// Google Apps Script POST cần no-cors để request thực sự được gửi đi
function gsPost(url, payload) {
  fetch(url, {
    method:  'POST',
    mode:    'no-cors',  // ★ FIX: Bắt buộc để tránh CORS block với Google Apps Script
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(payload),
  }).then(() => {
    // Với no-cors, response là opaque (không đọc được body)
    // nhưng request ĐÃ ĐƯỢC GỬI THÀNH CÔNG đến server
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
  const rc = ROLE_COLOR[role] || { bg:'#F3F4F6', c:'#374151' };
  const letter = esc((name || '?').charAt(0));
  return `<div class="avatar ${cls}" style="background:${rc.bg};color:${rc.c}">${letter}</div>`;
}
function catTag(cat) {
  const cc = CAT_COLORS[cat] || CAT_COLORS['Khác'];
  return `<span class="cat-tag" style="background:${cc.bg};color:${cc.c}">${esc(cat)}</span>`;
}
function roleTag(role) {
  const rc = ROLE_COLOR[role] || { bg:'#F3F4F6', c:'#374151' };
  return `<span class="role-tag" style="background:${rc.bg};color:${rc.c}">${ROLE_LABEL[role]||role}</span>`;
}

// ── LOGO HTML helper ──────────────────────────────────────────
function logoImgHtml(cls, size=40, extraStyle='') {
  return `<img src="unnamed.jpg" alt="Logo NHC" class="${cls}"
    style="${extraStyle}"
    onerror="this.onerror=null;this.outerHTML='<div class=&quot;${cls === 'sb-logo' ? 'sb-logo-fb' : 'll-logo-fb'}&quot;>📚</div>';">`;
}

// ── PAGE INIT ────────────────────────────────────────────────
function initPage(pageId, allowed=[]) {
  const u = getCurrentUser();
  if (!u) { location.replace('login.html'); return; }
  if (allowed.length && !allowed.includes(u.role)) { location.replace('dashboard.html'); return; }
  renderLayout(u, pageId);

  // ★ Tự động đồng bộ dữ liệu từ cloud khi mở trang
  // Sau khi sync xong, gọi onSyncComplete() nếu trang có định nghĩa
  syncFromCloud(function() {
    if (typeof onSyncComplete === 'function') {
      onSyncComplete();
    }
  });

  // ★ AUTO-SYNC KHI NGƯỜI DÙNG QUAY LẠI TAB/CỬA SỔ
  // Giúp Máy B tự cập nhật sách khi Máy A vừa thêm và Máy B focus lại trình duyệt
  let _lastFocusSync = Date.now();
  window.addEventListener('focus', function() {
    const now = Date.now();
    // Chỉ sync nếu cách lần sync trước ít nhất 30 giây (tránh spam)
    if (now - _lastFocusSync > 30000) {
      _lastFocusSync = now;
      console.log('🔄 Auto-sync khi focus lại trang...');
      syncFromCloud(function() {
        if (typeof onSyncComplete === 'function') {
          onSyncComplete();
        }
      });
    }
  });

  // ★ AUTO-SYNC ĐỊNH KỲ mỗi 2 phút khi đang ở trang
  // Đảm bảo máy B luôn cập nhật dữ liệu mới nhất từ cloud
  setInterval(function() {
    _lastFocusSync = Date.now();
    syncFromCloud(function() {
      if (typeof onSyncComplete === 'function') {
        onSyncComplete();
      }
    });
  }, 120000); // 2 phút
}

// ── SIDEBAR + TOPBAR ──────────────────────────────────────────
function renderLayout(u, pageId) {
  const pending = getUsers().filter(x => x.status === 'pending').length;
  const userName      = u.name  || 'Người dùng';
  const userRole      = u.role  || 'student';
  const userRoleLabel = ROLE_LABEL[userRole] || userRole;

  function navLink(href, id, icon, label) {
    const active = pageId === id;
    return `
    <a href="${href}" class="nav-item${active ? ' active' : ''}">
      ${active ? '<span class="nav-bar"></span>' : ''}
      <span class="nav-icon">${icon}</span>
      <span class="nav-label">${label}</span>
    </a>`;
  }

  function navLinkSpecial(href, id, icon, label, badge) {
    const active = pageId === id;
    return `
    <a href="${href}" class="nav-item nav-item-finance${active ? ' active' : ''}">
      ${active ? '<span class="nav-bar"></span>' : ''}
      <span class="nav-icon">${icon}</span>
      <span class="nav-label">${label}</span>
      ${badge && !active ? `<span class="nav-badge-new">${esc(badge)}</span>` : ''}
    </a>`;
  }

  const sidebarHtml = `
<aside class="sidebar" id="sidebar">
  <div class="sb-header">
    <img src="unnamed.jpg" alt="Logo" class="sb-logo-img"
      onerror="this.onerror=null;this.outerHTML='<div class=\\'sb-logo-fb\\'>📚</div>';">
    <div>
      <p class="sb-title">Thư viện NHC</p>
      <p class="sb-sub">Kết nối tri thức</p>
    </div>
  </div>
  <nav class="sb-nav">
    ${navLink('dashboard.html', 'dashboard', '📊', 'Tổng quan')}
    ${navLink('books.html',     'books',     '📚', 'Kho sách')}
    ${navLink('borrow.html',    'borrow',    '🔄', 'Mượn / Trả')}
    ${navLink('rules.html',     'rules',     '📜', 'Nội quy')}
    ${navLink('feedback.html',  'feedback',  '💬', 'Phản hồi')}
    ${(userRole === 'teacher' || userRole === 'librarian')
      ? navLink('documents.html', 'documents', '📄', 'Tài liệu')
      : ''}
    ${userRole === 'librarian' ? `
    <div style="font-size:10px;font-weight:700;color:rgba(147,197,253,.7);
                text-transform:uppercase;letter-spacing:.8px;
                padding:12px 20px 4px">Quản trị</div>
    ${navLink('users.html',    'users',    '👥', 'Thành viên')}
    ${navLinkSpecial('finance.html', 'finance', '💰', 'Tài chính', 'Mới')}
    ${navLink('settings.html', 'settings', '⚙️', 'Cài đặt')}` : ''}
  </nav>
  <div class="sb-user">
    <div class="sb-avatar">${esc((userName).charAt(0))}</div>
    <div style="flex:1;min-width:0">
      <p class="sb-uname">${esc(userName)}</p>
      <p class="sb-urole">${userRoleLabel}</p>
    </div>
    <span class="sb-logout" title="Đăng xuất" onclick="confirmLogout()">🚪</span>
  </div>
</aside>`;

  const topbarHtml = `
<header class="topbar">
  <button class="menu-btn" onclick="toggleSidebar()">☰</button>
  <div class="topbar-info">
    <p class="topbar-greet">Xin chào, <strong>${esc(userName)}</strong>!</p>
    <p class="topbar-sub">${PAGE_TITLE[pageId] || 'Trang chủ'}</p>
  </div>
  <div class="topbar-right">
    <span class="offline-badge" id="offline-badge">📡 Offline</span>
    ${pending > 0 && userRole === 'librarian'
      ? `<button class="icon-btn" onclick="location.href='users.html'"
              title="${pending} tài khoản chờ duyệt" style="color:#D97706">
              🔔<span class="dot"></span>
            </button>` : ''}
    <button class="icon-btn" onclick="syncFromCloud(function(){location.reload();})"
            title="Đồng bộ dữ liệu">🔄</button>
  </div>
</header>`;

  const sbCnt = document.getElementById('sidebar-cnt');
  const tbCnt = document.getElementById('topbar-cnt');
  if (sbCnt) sbCnt.innerHTML = sidebarHtml + `<div class="sb-backdrop" id="sb-backdrop" onclick="toggleSidebar()"></div>`;
  if (tbCnt) tbCnt.innerHTML = topbarHtml;
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const bd = document.getElementById('sb-backdrop');
  if (sb) sb.classList.toggle('open');
  if (bd) bd.classList.toggle('show');
}

function confirmLogout() {
  if (confirm('Bạn có chắc muốn đăng xuất không?')) doLogout();
}

function getFinance(cb) {
  const data = db.get(K.FINANCE, []);
  if (cb) cb(data);
}

function updatePaymentStatus(id) {
  const data = db.get(K.FINANCE, []);
  const updated = data.map(f => f.id === id ? { ...f, status: 'Đã nộp' } : f);
  db.set(K.FINANCE, updated);
}

function createFine(fineData) {
  const data = db.get(K.FINANCE, []);
  data.unshift(fineData);
  db.set(K.FINANCE, data);
  gsPost(GS.Finance, {
    action:    'CREATE_FINE',
    id:        fineData.id,
    studentId: fineData.studentId,
    name:      fineData.name,
    className: fineData.className,
    fee:       fineData.fee,
    reason:    fineData.reason,
    status:    fineData.status,
    date:      fineData.date,
    createdAt: nowStr(),
  });
}