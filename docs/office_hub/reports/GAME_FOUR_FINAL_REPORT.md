# Nghiệm thu bốn task game — 25/10/2026

| Task | Owner | Kết quả |
|---|---|---|
| C-G1: Tính số phần, nguyên liệu thiếu | Codex | Done; kho/giỏ tách rõ, món khóa không xuất hiện |
| A-G1: Gợi ý trên chợ/thực đơn | Antigravity | Done; số phần đổi theo giỏ và món bật/tắt |
| C-G2: Thống kê doanh số từng món | Codex | Done; giá vốn giao dịch cũ, không lấy giá chợ mới |
| A-G2: Tổng kết theo món | Antigravity | Done; đúng luồng một/đa quán, bảng đọc được trên mobile |

| Kiểm chứng | Kết quả |
|---|---|
| Toàn bộ game | 16/16 PASS ngày25/10; nguồn không đổi trong lượt chạy |
| Day1 chuẩn | Két127.000đ; lãi67.000đ; test-day1 PASS |
| UI tích hợp | Ca0đơn và1đơn qua empireAction/CLOSE; số liệu khớp giao dịch |
| Ca1đơn kiểm soát | Bánh mì: thu25.000đ; vốn11.000đ; lãi gộp14.000đ |
| Trình duyệt độc lập | Chợ3/2/1 phần; giảm giỏ cập nhật; tắt món loại khỏi bảng |
| Ảnh Antigravity | Viewport360×640 và390×844; có đơn và0đơn nhất quán |
| Bảo toàn | Cảnh quán, bản đồ, nhân sự và CSS cũ giữ nguyên |
| Quyết định | Codex duyệt theo ủy quyền; GAME_ACCEPTANCE.json |

Ảnh dựng bằng save/fixture kiểm soát, không phải bằng chứng chơi tự nhiên đủ ngày.
Kiểm tra Node dùng state machine thật và DOM giả; không thay thế ảnh responsive.
Lãi gộp chưa trừ lương, hao hụt và chi phí quán. Công suất từng món không cộng chung.
Bảng360px cuộn ngang bên trong khi thiếu chỗ; giao diện game không tràn trang.
Gói Office Hub cũ và yêu cầu sửa kéo dài được theo dõi riêng.

## Bằng chứng

| Loại | Vị trí |
|---|---|
| Kiểm thử | GAME_TEST_RECEIPT.json; game-four-final-tests.log |
| Bàn giao | GAME_FOUR_ACK.md |
| Ảnh | docs/mobile_gate_evidence/game_four/ |
| Thay đổi chính | game/shop-insights.mjs; game/main.mjs; game/style.css; game/test-ui.mjs |

## Action Items for Antigravity (UI/Art)

| Task | Status | Next action |
|---|---|---|
| A-G1/A-G2 | Done | Không mở thêm tính năng game trong gói này |
| Office compact | Riêng | Xử lý yêu cầu25/10; không tính vào bốn task game |
