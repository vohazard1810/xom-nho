# Bốn task trong game — 2026-10-24

| Mục | Giá trị |
|---|---|
| Nguồn | Chủ dự án sửa phạm vi: bốn task game; Office Hub xử lý riêng |
| Nonce | GAME-FOUR-20261024 |
| Điều phối/nghiệm thu | Codex, theo ủy quyền |
| Kết ca | Xong bốn task hoặc Blocked; không mở ý tưởng tiếp |

| Task | Owner | Status | Tiêu chí |
|---|---|---|---|
| C-G1: Sẵn sàng thực đơn | Codex | Done | menuReadiness: số phần theo kho, thiếu nguyên liệu, xem thêm giỏ; không tự mua |
| A-G1: Gợi ý chuẩn bị | Antigravity | Done | MARKET tính cả giỏ; MENU tính kho; nêu rõ nguyên liệu dùng chung |
| C-G2: Doanh số theo món | Codex | Done | recipeSalesSummary: giao dịch thực, giá vốn lịch sử, không đổi kinh tế |
| A-G2: Tổng kết theo món | Antigravity | Done | DAY_RESULT: món bán chạy, số đơn, doanh thu, giá vốn và lãi gộp |

## Hợp đồng selector

| API | Kết quả |
|---|---|
| game/shop-insights.mjs:menuReadiness(state,{includeBasket:false}) | [{recipeId,name,servings,shortages,estimatedUnitCost}] |
| shortages | [{id,name,needed,available,missing}] cho một phần thông thường |
| includeBasket:true | Kho cộng giỏ đang chọn; không phải hàng đã thanh toán |
| servings | Công suất riêng từng món; không cộng tất cả do dùng chung nguyên liệu |
| estimatedUnitCost | Ước tính theo chợ hiện tại; không phải giá vốn giao dịch đã bán |
| recipeSalesSummary(state) | {items,totals,bestSeller}; từ servedOrders của ca hiện tại |
| items | recipeId,name,orders,revenue,cogs,tips,onlineFees,grossProfit,contribution |
| grossProfit | revenue − cogs; chưa trừ lương, hao hụt và chi phí quán |
| contribution | grossProfit + tips − onlineFees; chưa trừ chi phí chung |
| bestSeller | recipeId theo số đơn, rồi doanh thu; null khi chưa bán |

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| test-shop-insights.mjs | PASS tại nhánh Codex và repo phục vụ |
| Baseline Day 1 | PASS trên repo phục vụ; giữ két127.000đ/lãi67.000đ |
| Giao diện mới | Chưa triển khai; chưa có bằng chứng trình duyệt |

## Action Items for Antigravity (UI/Art)

| Task | File | Next action |
|---|---|---|
| A-G1 | game/main.mjs; game/style.css | Nhỏ gọn, dễ thu gọn; không che quầy; không sửa logic mua hàng |
| A-G2 | game/main.mjs; game/style.css | Bảng theo món trong chi tiết tổng kết; không gọi lãi gộp là lãi ròng |
| Nộp | reports/GAME_FOUR_ACK.md | ACK nonce, task, file, ảnh360/390, snapshot; không chỉ tự báo PASS |

Không sửa Office Hub UI, asset game, anchor nhân vật hoặc nền quán trong gói này.
