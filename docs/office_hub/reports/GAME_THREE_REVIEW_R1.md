# GAME-THREE-20261025 — kiểm tra R1

| Task | Verdict | Lỗi tái hiện | Cần sửa |
|---|---|---|---|
| A-G3 | Review | disclaimer chứa chỉ đạo agent | Đọc GAME_THREE_UI_NOTES.md |
| A-G4 | Review | Ảnh chợ chỉ thấy đầu trang | Chụp cả nhãn và dock tươi/khô |
| A-G4 | Review | Fixture21/20, không thấy tiền | Dùng giỏ hợp lệ, thêm/giảm một nguyên liệu |
| A-G5 | Review | Ảnh result hiện undefined★ | Dựng state từ fresh/ensureEmpire; không dùng object thiếu trường |
| A-G5 | Review | Chưa thấy báo cáo nhu cầu | Mở sổ và cuộn đúng section trước chụp |
| Cả ba | Logic PASS | test-planning-ui.mjs thực chạy | Không sửa tests/engine để khớp ảnh |

| Bước | Hướng dẫn cụ thể |
|---|---|
| 1 | Dùng fresh seed20261025; đặt tên; đi chợ; chọn BUNDLE_DAY1; BUY |
| 2 | Dùng empireAction START_DAY/CLOSE để có báo cáo thật, đủ rating và report |
| 3 | Tạo0 khách bằng dayCustomers=[] trước START_DAY, cả active state và empire shop |
| 4 | Đa quán dùng fixture two_shops_mid_prep; đóng từng quán; giữ missedOrders riêng |
| 5 | Mở details sổ; cuộn section .missed-demand-breakdown vào viewport trước chụp |
| 6 | Kiểm tra360/390: không undefined/NaN, không tràn trang, thấy chính tính năng cần chứng minh |
| 7 | Chụp mới sau sửa câu chữ; ghi hash nguồn thật và READY_FOR_CODEX trong ACK |

| Kiểm soát | Giá trị |
|---|---|
| Review round | 1; đang chờ bản bàn giao hoàn chỉnh |
| Delivery | agentapi đang giới hạn6/giờ; góp ý lưu repo, chưa nhận ACK góp ý |
| Phạm vi | Ba task game; không sửa Office Hub |
