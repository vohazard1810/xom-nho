# GAME-THREE-20261025 — fixture chính xác cho kiểm tra hình ảnh

| Mục | Hướng dẫn |
|---|---|
| Lỗi thường gặp | Chỉ sửa root state, ensureEmpire nạp lại active shop state cũ |
| Cách tránh | Không ghép object thủ công; dùng bộ fixture bên dưới |
| Tạo fixture | node handoff/generate-game-three-fixtures.mjs |
| Đầu ra | handoff/.runtime/game-three-fixtures/*.json |
| Nội dung | saveKey, encodedSave, state; nhãn CONTROLLED FIXTURE |
| Nạp khi test | Context mới; localStorage đúng saveKey/encodedSave trước khi load game |
| Không làm | Sửa engine/tests hoặc giả READY khi ảnh chưa thể hiện tính năng |

| Case | Kết quả đã assert bằng engine |
|---|---|
| market | Giỏ19/20; hàng tươi49k, hàng khô6k, tổng55k |
| menu | Giá25k, vốn11k, lãi14k |
| loss | Giá22k, vốn23k, lãi-1k; root và shop đều cập nhật |
| even | Giá22k, vốn22k, hòa vốn |
| result | CLOSE thật; có lượt lỡ; rating đầy đủ |
| resultZero | dayCustomers rỗng cả root/shop; START_DAY/CLOSE;0 khách lỡ |
| multi | CLOSE từng quán từ fixture; số lỡ16 và2, không dùng chung state |

| Chụp | Yêu cầu |
|---|---|
| Market | Nhãn ở đầu; dock ở cuối. Chụp hai ảnh nếu không vừa màn |
| Result | Mở details; cuộn missed-demand-breakdown vào viewport, không chỉ chụp ledger cũ |
| So sánh | Hash ảnh thường/lỗ và có-lỡ/0-lỡ phải khác; đọc nội dung trước bàn giao |
| Kích thước | 360×640 và390×844; không undefined/NaN; không tràn trang |
