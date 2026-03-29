'use strict';
// ── PHIÊN BẢN DỮ LIỆU ────────────────────────────────────────
const DB_VERSION = 'nhc4_v3_2026';

const WebApp_URL = 'https://script.google.com/macros/s/AKfycbzfnxFEr6PwxlwDZO6qJcB2Z1MICXrxKu2SgnndzD3IhnRUG7FfJbP-xHCMv0I1bjcAGQ/exec';

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
      if (result.books && result.books.length > 0 &&
          (now - _writeTS.books > WRITE_LOCK_MS)) {
        // ★ FIX: Chuẩn hóa tên field khi nhận sách từ cloud
        // Google Sheets lưu tiêu đề tiếng Việt nên cần map sang tiếng Anh
        const normalizedBooks = result.books.map(function(b) {
          var id        = b.id        || b['Mã sách']      || '';
          var title     = b.title     || b['Tên sách']     || '';
          var author    = b.author    || b['Tác giả']      || '';
          var category  = b.category  || b['Thể loại']     || 'Khác';
          var qty       = Number(b.qty    !== undefined ? b.qty    : (b['Số lượng'] !== undefined ? b['Số lượng'] : 0));
          var availRaw  = b.avail     !== undefined ? b.avail     :
                          (b['Còn lại'] !== undefined ? b['Còn lại'] :
                          (b.available  !== undefined ? b.available  : qty));
          var avail     = Number(availRaw);
          var publisher = b.publisher || b['Nhà xuất bản'] || b.description || '';
          var cover     = b.cover     || b['Link ảnh bìa'] || b.coverUrl    || '';
          var pdf       = b.pdf       || b['Link sách PDF']|| '';
          var addedDate = b.addedDate || b['Ngày tải']     || '';
          var bCount    = Number(b.bCount !== undefined ? b.bCount : (b['Lượt mượn'] !== undefined ? b['Lượt mượn'] : 0));
          return {
            id:        String(id),
            title:     title,
            author:    author,
            category:  category,
            qty:       qty,
            avail:     avail,
            publisher: publisher,
            cover:     cover,
            pdf:       pdf,
            addedDate: addedDate,
            bCount:    bCount,
          };
        });
        // ★ FIX XÓA SÁCH: Lọc ra các sách đã bị xóa cục bộ
        const deletedIds = getDeletedBookIds();
        const finalBooks = deletedIds.length > 0
          ? normalizedBooks.filter(function(b) { return !deletedIds.includes(b.id); })
          : normalizedBooks;
        db.set(K.BOOKS, finalBooks);
        if (deletedIds.length > 0 && normalizedBooks.length !== finalBooks.length) {
          console.log('🗑️ Đồng bộ xóa sách lên cloud (' + (normalizedBooks.length - finalBooks.length) + ' sách)');
          syncBooksToCloud(finalBooks);
        }
      } else if (now - _writeTS.books <= WRITE_LOCK_MS) {
        console.log('⏸️ Bỏ qua ghi đè sách từ cloud (vừa có thay đổi cục bộ)');
      }

      // ★ FIX: Extract mật khẩu + chuẩn hóa tên cột từ sheet USER
      if (result.users && result.users.length > 0 &&
          (now - _writeTS.users > WRITE_LOCK_MS)) {
        const cloudPwds = {};
        const cleanUsers = result.users.map(function(u) {
          // ★ FIX: Map cột tiếng Việt/mixed (sheet USER) về field tiếng Anh (frontend)
          // Sheet USER: id | Username | Họ và tên | Email | Vai trò | Lớp | Số hiệu | Status | Ngày đăng ký | password
          var username = u.username    || u['Username']     || '';
          var password = u.password;
          if (password) cloudPwds[username] = password;
          return {
            id:          u.id          || u['id']           || '',
            username:    username,
            name:        u.name        || u['Họ và tên']    || '',
            email:       u.email       || u['Email']        || '',
            role:        u.role        || u['Vai trò']      || 'student',
            className:   u.className   || u['Lớp']          || '',
            studentId:   u.studentId   || u['Số hiệu']      || '',
            status:      u.status      || u['Status']       || 'pending',
            createdDate: u.createdDate || u['Ngày đăng ký'] || '',
          };
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

      // ★ FIX: Chuẩn hóa tên cột từ sheet BORROW
      // Sheet BORROW: id | Họ và tên | Tên đăng nhập | Số hiệu | Lớp | Ngày mượn | Ngày trả | Trạng thái | Ghi chú | userId | bookId | Tên sách
      if (result.borrows && result.borrows.length > 0 &&
          (now - _writeTS.borrows > WRITE_LOCK_MS)) {
        const normalizedBorrows = result.borrows.map(function(b) {
          return {
            id:         String(b.id        || b['id']          || ''),
            userId:     b.userId           || b['userId']       || '',
            userName:   b.userName         || b['Họ và tên']    || '',
            bookId:     b.bookId           || b['bookId']       || '',
            bookTitle:  b.bookTitle        || b['Tên sách']     || '',
            borrowDate: b.borrowDate       || b['Ngày mượn']    || '',
            dueDate:    b.dueDate          || b['Ngày trả']     || '',
            returnDate: b.returnDate       || '',
            status:     b.status           || b['Trạng thái']   || '',
            note:       b.note             || b['Ghi chú']      || '',
          };
        });
        db.set(K.BORROWS, normalizedBorrows);
      }

      // ★ FIX: Chuẩn hóa tên cột từ sheet Finance
      // Sheet Finance: id | Họ và tên | Tên đăng nhập | Lớp | Số hiệu | Tiền phạt | Lý do | Trạng thái | Ngày ghi nhận
      if (result.finance && result.finance.length > 0) {
        const normalizedFinance = result.finance.map(function(f, idx) {
          return {
            id:        f.id        || f['id']             || ('f_' + idx + '_' + String(f['Ngày ghi nhận'] || f.date || Date.now()).toString().replace(/[^0-9]/g, '')),
            userId:    f.userId    || '',
            studentId: f.studentId || f['Số hiệu']        || '',
            name:      f.name      || f['Họ và tên']      || '',
            className: f.className || f['Lớp']            || '',
            fee:       Number(f.fee !== undefined ? f.fee : (f['Tiền phạt'] !== undefined ? f['Tiền phạt'] : 0)),
            reason:    f.reason    || f['Lý do']           || '',
            status:    f.status    || f['Trạng thái']      || 'Chưa nộp',
            date:      f.date      || f['Ngày ghi nhận']   || '',
          };
        });
        db.set(K.FINANCE, normalizedFinance);
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
  gsPost(WebApp_URL, { action: 'SAVE_PWDS', pwds: pwds });
}

// ★ FIX: Ghi finance lên cloud (trước đây thiếu hàm này)
function syncFinanceToCloud(finance) {
  gsPost(WebApp_URL, { action: 'SAVE_FINANCE', finance: finance });
}

// ── AUTH ──────────────────────────────────────────────────────
function getCurrentUser() {
  const uid = db.get(K.AUTH);
  if (!uid) return null;

  if (uid === 'admin_root') {
    return { id:'admin_root', username:'MTuyeen', name:'Ngọc Tuyền (Admin)', role:'librarian', status:'approved' };
  }

  if (typeof uid === 'object' && uid !== null) {
    if (uid.id === 'admin_root') {
      return { id:'admin_root', username:'MTuyeen', name:'Ngọc Tuyền (Admin)', role:'librarian', status:'approved' };
    }
    return getUsers().find(u => u.id === uid.id) || uid;
  }

  return getUsers().find(u => u.id === uid) || null;
}

function doLogin(data) {
  let username, password;
  if (typeof data === 'object' && data !== null) {
    username = data.username;
    password = data.password;
  } else {
    username = data;
    password = arguments[1];
  }

  if (username === 'MTuyeen' && password === '123') {
    db.set(K.AUTH, 'admin_root');
    return 'success';
  }

  const users = getUsers();
  const u = users.find(x => x.username === username);

  if (!u) return 'not_found';
  if (u.status === 'pending')  return 'pending';
  if (u.status === 'rejected') return 'rejected';
  if (u.status !== 'approved') return 'not_found';

  const pwds = getPwds();
  if (pwds[username] === password) {
    db.set(K.AUTH, u.id);
    return 'success';
  }

  return 'wrong_pwd';
}

function doLogout() {
  db.del(K.AUTH);
  location.href = 'login.html';
}

function doRegister(data) {
  const users = getUsers();
  if (users.some(u => u.username && u.username.toLowerCase() === data.username.trim().toLowerCase()))
    return 'exists';
  const nu = {
    id:'u'+Date.now(), username:data.username.trim(), name:data.name.trim(),
    email:data.email.trim(), studentId:data.studentId||'', className:data.className||'',
    role:data.role, status:'pending', createdDate:todayStr(),
  };
  const p = getPwds();
  p[nu.username] = data.password;
  db.set(K.PWD, p);
  users.push(nu);
  saveUsers(users);
  syncPwdsToCloud(p);
  return 'success';
}

// ── GOOGLE SHEETS POST ────────────────────────────────────────
function gsPost(url, payload) {
  fetch(url, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body:    JSON.stringify(payload),
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

  syncFromCloud(function() {
    if (typeof onSyncComplete === 'function') {
      onSyncComplete();
    }
  });

  let _lastFocusSync = Date.now();
  window.addEventListener('focus', function() {
    const now = Date.now();
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

  setInterval(function() {
    _lastFocusSync = Date.now();
    syncFromCloud(function() {
      if (typeof onSyncComplete === 'function') {
        onSyncComplete();
      }
    });
  }, 120000);
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

// ★ FIX: updatePaymentStatus giờ đồng bộ lên cloud sau khi cập nhật
function updatePaymentStatus(id) {
  const data = db.get(K.FINANCE, []);
  const updated = data.map(f => f.id === id ? { ...f, status: 'Đã nộp' } : f);
  db.set(K.FINANCE, updated);
  // ★ Sync lên cloud để trạng thái thanh toán được lưu vĩnh viễn
  syncFinanceToCloud(updated);
}

function createFine(fineData) {
  const data = db.get(K.FINANCE, []);
  data.unshift(fineData);
  db.set(K.FINANCE, data);
  gsPost(GS.Finance, {
    action:    'CREATE_FINE',
    id:        fineData.id,
    userId:    fineData.userId,
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
