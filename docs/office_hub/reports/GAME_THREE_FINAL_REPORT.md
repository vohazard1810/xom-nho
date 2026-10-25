# Ba task game — nghiệm thu25/10/2026

| Task | Phân công | Kết quả |
|---|---|---|
| A-G3: Lãi gộp thực đơn | Codex tính; Anti UI | Done; đổi tier cập nhật, cảnh báo lỗ/hòa vốn |
| A-G4: Hàng tươi/khô | Codex tính; Anti UI | Done; nhãn bảo quản, tiền giỏ chưa mua |
| A-G5: Nhu cầu bị lỡ | Codex tính; Anti UI | Done; từng món/nguyên nhân, đúng từng quán |
| Nghiệm thu | Codex theo ủy quyền | PASS vòng2; lưu lịch sửR1 |

| Kiểm chứng | Kết quả |
|---|---|
| Toàn bộ game | 18/18 PASS; mã nguồn không đổi |
| Day1 | Két127.000đ/lãi67.000đ, giữ chuẩn |
| MENU | Tier25k→22k; lãi14k→11k; fixture lỗ/hòa vốn |
| MARKET | Bánh mì4k tươi; nước đường2k khô; tổng6k; chưa trừ tiền |
| Mua hàng | Cash30k→24k đúng giỏ6k |
| CLOSE | Chơi thử:7 lỡ,2 hết hàng,5 đóng sớm; nhóm từng món khớp |
| Đa quán | Fixture engine có số đơn lỡ khác nhau; UI hiển thị riêng |
| Mobile | 360×640/390×844; ảnh sau sửa trong game_three/ |
| Bảo toàn | Scenery/map/staff và CSS cũ giữ nguyên |
| Tài nguyên | Phiên bản hash CSS/main/selector tránh trình duyệt giữ bản cũ |

## Giới hạn bằng chứng

| Loại | Phạm vi |
|---|---|
| Ảnh Anti | Fixture kiểm soát; không giả chơi tự nhiên |
| Trình duyệt Codex | Nút UI và thời gian engine thật trên save thử riêng |
| Node UI | DOM giả, engine thật; không thay kiểm tra hình ảnh |
| Ước tính | Theo giá chợ hôm nay; chưa trừ lương/phí; không phải FIFO đã bán |
| Khách lỡ | Đếm phiếu thực tế; không suy ra doanh thu giả định |

## Bằng chứng

| Tệp | Nội dung |
|---|---|
| GAME_THREE_ACCEPTANCE.json | Quyết định, hash nguồn/ảnh, ủy quyền |
| GAME_THREE_TEST_RECEIPT.json | 18/18, nguồn cố định |
| GAME_THREE_ACK.md | Bàn giao UI Anti |
| GAME_THREE_REVIEW_R1.json | Lịch sử trả sửa |
| GAME_THREE_BROWSER_CHECK.json | Thao tác trình duyệt Codex |
| docs/mobile_gate_evidence/game_three/ | Ảnh mobile đã duyệt |

## Action Items for Antigravity (UI/Art)

| Task | Status | Next action |
|---|---|---|
| A-G3/A-G4/A-G5 | Done | Dừng gói này; chưa mở thêm tính năng |
