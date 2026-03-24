════════════════════════════════════════════════════════════
  THƯ VIỆN THPT NGUYỄN HỮU CẢNH — Hướng dẫn chạy
════════════════════════════════════════════════════════════

CÁCH CHẠY (Không cần npm, không cần cài đặt gì!)
──────────────────────────────────────────────────

Cách 1: VS Code + Live Server (Khuyến nghị)
  1. Mở thư mục này trong VS Code
  2. Cài extension "Live Server" (ritwickdey.LiveServer)
  3. Click chuột phải vào login.html → "Open with Live Server"
  4. Trình duyệt tự mở tại http://127.0.0.1:5500/login.html

Cách 2: Double-click trực tiếp
  - Mở login.html trong Chrome/Edge/Firefox
  - (Một số tính năng như fetch() cần Live Server)

TRANG ADMIN MẶC ĐỊNH (KHÔNG HIỆN TRONG FORM)
──────────────────────────────────────────────
  Tên đăng nhập: MTuyeen
  Mật khẩu:      123

CẤU TRÚC FILE
──────────────
  login.html      → Đăng nhập + Đăng ký
  dashboard.html  → Trang chủ / Tổng quan
  books.html      → Quản lý sách (xem/thêm/xóa)
  borrow.html     → Mượn / Trả sách
  documents.html  → Tài liệu & Đề thi (GV + Thủ thư)
  users.html      → Quản lý người dùng (Thủ thư)
  feedback.html   → Phản hồi & Đánh giá
  settings.html   → Cài đặt hệ thống (Thủ thư)
  style.css       → Giao diện toàn bộ
  script.js       → Logic dùng chung
  school-logo.png → Logo trường (copy vào đây)

PHÂN QUYỀN THEO VAI TRÒ
────────────────────────
  Học sinh:  Dashboard, Sách, Mượn của tôi, Phản hồi
  Giáo viên: Dashboard, Sách, Mượn của tôi, Tài liệu, Phản hồi
  Thủ thư:   Tất cả trang + Quản lý người dùng, Cài đặt

GOOGLE SHEETS LINKS (đã cấu hình)
────────────────────────────────────
  Đăng ký / Đăng nhập:  SCRIPT_URL
  Danh mục sách:         SCRIPT_BOOK_URL
  Mượn / Trả:            SCRIPT_BORROW_URL
  Phản hồi:              SCRIPT_FEEDBACK_URL

  Dữ liệu gửi lên GS khi: đăng ký, đăng nhập, thêm sách,
  mượn sách, trả sách, gửi phản hồi, duyệt/từ chối tài khoản.

DỮ LIỆU
────────
  Lưu trong localStorage của trình duyệt.
  Trang Cài đặt có thể xuất/nhập file JSON để backup.
  Tài liệu upload được lưu dưới dạng base64 (tối đa 8MB/file).

════════════════════════════════════════════════════════════
  © 2026 Thư viện THPT Nguyễn Hữu Cảnh
════════════════════════════════════════════════════════════
