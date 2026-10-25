# GAME-THREE-20261025 — ghi chú kiểm tra UI đang triển khai

| Task | File | Hướng dẫn cụ thể |
|---|---|---|
| A-G4 | main.mjs:512 | Bỏ CLOSE/engine; dùng câu người chơi bên dưới |
| A-G4 | main.mjs:499 | Tổng tiền giỏ chỉ hiện một lần, giữ tiền còn lại |
| A-G3 | main.mjs:541 | Bỏ chỉ đạo agent “Không tự đổi giá” khỏi giao diện |
| Cả ba | evidence/game_three | Kiểm tra360/390, đúng quán, ca0 lỡ |

| Vị trí | Câu thay thế |
|---|---|
| Chợ | Hàng tươi dư sẽ bỏ cuối ca; hàng khô giữ lại. Giỏ chưa thanh toán. |
| Thực đơn | Ước tính theo giá chợ hôm nay, chưa trừ lương/phí. Giá cao có thể làm khách bỏ mua. |

| Delivery | Trạng thái |
|---|---|
| agentapi góp ý | Chưa gửi: giới hạn6 lượt/giờ; không bypass |
| Repo | Góp ý đã lưu; chờ Anti đọc/bàn giao |
| Review | Chưa chốt verdict; UI đang triển khai |
