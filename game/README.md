# Xóm Nhỏ — playable active idle prototype

Chạy `python3 -m http.server 8000` từ gốc repo và mở `http://localhost:8000/game/`. Đặt tên quán, đọc tin xóm, nhập hàng và chọn menu/giá trước khi mở. Trong ca, có thể ưu tiên khách vội, tập trung phục vụ, x1/x2 hoặc tạm dừng. Sổ có feedback và tự chuyển tới buổi chuẩn bị kế tiếp; mở sổ chi tiết để dừng đếm.

Gameplay dùng chung `shift-engine.mjs` trên trình duyệt và trong test. Ca và tiến trình chế biến được lưu trên trình duyệt đang dùng; ngày đăng nhập tách khỏi ngày trong game. Không có tiến triển ca khi đóng trang. Có vòng ngày 1–21, nâng xe/quầy/ghế/mái che, học món, thuê nhân viên và nhận đơn mang đi.

Kiểm thử nhanh:

```sh
node game/test-shift.mjs
node game/test-day1.mjs
node game/test-multiday.mjs
node game/test-balance.mjs
node game/test-progression.mjs
node game/test-ui.mjs
node game/test-ui-timers.mjs
node tools/playtest/playable_smoke.cjs
```

Browser smoke cần Playwright và Chromium đã cài. Có thể chỉ định `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Nó tự mở server, dùng đồng hồ Playwright để kiểm tra ca ngắn, không ghi video. Full mobile gate 7 ngày chỉ chạy cho mốc lớn. Đóng gói bản tĩnh bằng `python tools/build-playable.py --out dist`.

Xem `docs/PLAYABLE_GAMEPLAY_HANDOFF.md` và `docs/playable_evidence/browser_smoke.json` để biết thay đổi, bằng chứng và phạm vi chưa kiểm tra. Art hiện tại là bản dùng lại, để Antigravity hoàn thiện sau.
