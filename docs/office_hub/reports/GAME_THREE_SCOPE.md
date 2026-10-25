# GAME-THREE-20261025 — ba task game được chủ dự án giao

| ID | Owner UI | Codex logic | Tiêu chí |
|---|---|---|---|
| A-G3 | Antigravity | menuPricePreview(state) | MENU: giá bán, vốn hôm nay, lãi gộp ước tính; âm/0 cảnh báo |
| A-G4 | Antigravity | marketFreshnessPreview(state) | MARKET: nhãn dùng trong ngày/giữ qua đêm, tổng tiền hàng tươi trong giỏ |
| A-G5 | Antigravity | missedDemandSummary(shopState) | DAY_RESULT mỗi quán: món lỡ, số khách, nguyên nhân; 0 lỡ có câu rõ |

Codex đang thêm ba selector đọc thuần vào game/shop-insights.mjs. KHÔNG sửa file đó hoặc engine/tests.
API chính thức:
menuPricePreview => [{recipeId,name,enabled,sellPrice,estimatedUnitCost,estimatedGrossProfit,marginRate,risk}]; known recipes only, kể cả tắt; risk loss/break_even/positive; marginRate null khi sellPrice=0.
marketFreshnessPreview => {items:[{id,name,unit,quantity,unitPrice,cost,storage:'same_day'|'overnight'}],freshCost,carryoverCost,totalCost}; chỉ giỏ qty>0, không cộng kho. Dùng FRESH_INGREDIENTS engine, không tự liệt kê.
missedDemandSummary => {items:[{recipeId,name,count,reasons:[{reason,count}]}],totalMissed}; count từ missedOrders, reason theo engine, không tính tiền thu giả, món unknown dùng tên dự phòng. Sắp count giảm dần, tie id.

MENU: ghi rõ ước tính theo giá chợ hôm nay, chưa trừ lương/phí, không hứa khách mua khi giá cao. Không tự đổi giá.
MARKET: ghi rõ hàng tươi còn dư bị dọn khi sang ngày, hàng khô giữ lại; không hứa giữ qua đêm cho hàng engine bỏ. Giỏ không phải đã thanh toán.
RESULT: dùng shop.state từ empire.shops theo shopId; không dùng cùng active state cho mọi quán. Dùng helper tái sử dụng cho legacy và empire result.

Đọc handoff/ART_AND_REWORK_POLICY.md. Gói này không cần vẽ asset mới; không sửa Office Hub ngoài báo cáo/tasks/bundle. Không sửa scenery/map/staff hoặc xoá code dirty cũ.
Chủ dự án đã ủy quyền Codex duyệt. Tối đa 3 vòng; sai vòng3 Blocked giữ lịch sử. Không tự Done.
Giữ nguyên game engine, giao dịch, giá, SAVE_KEY, fixture baseline127k/67k. Chỉ sửa game/main.mjs/style.css và tạo ảnh bằng chứng.
Chụp360x640 và390x844: menu đổi tier/loss fixture; market giỏ đổi tiền hàng tươi; result có lỡ/0 lỡ và đúng quán.
ACK: docs/office_hub/reports/GAME_THREE_ACK.md ghi nonce GAME-THREE-20261025, READY_FOR_CODEX, hash main/style, danh sách ảnh, tool thực dùng và loại fixture/gameplay. Nếu cần tôi giải thích API hãy hỏi trong ACK.
Không commit cả repo live đang dirty. Tôi sẽ tích hợp riêng các hunk. Hãy bắt đầu UI khi selector có trên đĩa, không tự tạo bản giả.
