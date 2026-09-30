# Xóm Nhỏ — mobile idle management prototype

Từ gốc repo chạy `python3 -m http.server 8000` và mở `http://localhost:8000/game/`. Chơi trên điện thoại dọc 390×844 hoặc viewport tương đương. Tên quán được đặt khi bắt đầu và lưu bằng hai bản save có checksum trong localStorage.

Day 1 giữ kết quả fixture v0.7 (8 khách, 55k nhập, 122k doanh thu, 127k tiền két, 67k lãi gộp). Ngày 2–7 có nâng cấp xe/quầy/ghế, món ốp la, giá nguyên liệu thay đổi, tin xóm và thời tiết, khách có tính cách, sao quán, hàng tươi hỏng và tồn khô theo lô. Engine chạy tiếp qua ngày 21 để kiểm chứng; luật và số liệu thử nghiệm nằm ở `game/day-content.mjs`. Xem `docs/GAMEPLAY_7_DAY_PROTOTYPE.md` để biết rõ giả định và công thức.

Chạy:

```sh
node game/test-day1.mjs
node game/test-multiday.mjs
node game/test-ui.mjs
```

Các bài Playwright ở `tools/playtest/` kiểm tra Day 1 trên browser/điện thoại và cần máy có Edge hoặc Playwright browser. Art Day 2+, nhân vật và hoạt ảnh là placeholder để Antigravity sản xuất sau; chưa có bằng chứng visual gate cho bản nhiều ngày.
