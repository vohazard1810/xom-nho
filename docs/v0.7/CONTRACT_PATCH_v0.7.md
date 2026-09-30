# CONTRACT PATCH v0.7 — Hướng Quản Lý Quán (Idle Management)

> **Baseline**: `GAMEPLAY_CONTRACT.md` (v0.6 frozen), `CONTENT_CONTRACT.md`, `ARCHITECTURE.md`, `VISUAL_BIBLE.md` (v0.6)  
> **Nhánh**: `docs/be-ti-static-production`  
> **Trạng thái**: REVIEW DRAFT v0.7.2 — Đã cập nhật 3 lỗi chặn và các điểm chuẩn hóa kế toán / kỹ thuật từ Owner. Chưa sửa code gameplay v0.7, chưa sản xuất asset hàng loạt.

---

## 1. Tóm Tắt Định Hướng Mới (Idle Management)

- **v0.6 (Cũ)**: Phục vụ thủ công từng đơn (`SELECT` → `TAP` nguyên liệu vào giỏ nháp → `COMMIT`).
- **v0.7 (Mới)**: **Quản lý quán trên điện thoại (Mobile Portrait Offline)**. Người chơi là chủ quán, ra quyết định chiến lược trước và trong ngày:
  - **Trước giờ bán (Prepare Phase)**: Đọc tin xóm, xem giá chợ, chọn giờ mở cửa, lên menu 3 món & đặt giá bán từ 2–3 mức định sẵn, nhập hàng vừa sức chở xe đạp (20 đơn vị).
  - **Trong giờ bán (Service Phase — 60–90 giây, có x1/x2)**: Quán tự động xử lý phần lớn đơn thường (auto-service trừ kho và ghi nhận doanh thu đúng định lượng). Người chơi quan sát cảnh quán sinh động, khách ra vào, hàng tồn, trạng thái cảm xúc.
  - **Tình huống phát sinh**: Đồng hồ in-game **bắt buộc tạm dừng (pause)** để người chơi đọc và chọn phương án; không tự động chọn khi đang tua nhanh.
  - **Cuối ngày (Wrap-up Phase)**: Đối soát sổ sách minh bạch (tách biệt Tiền mặt thực tế, Doanh thu, COGS của hàng đã bán, Tồn kho thực tế, Nợ/ghi sổ) và đọc câu chuyện phản hồi từ khách.

---

## 2. Bảng Đối Chiếu: v0.6 vs v0.7

| Trọng tâm | v0.6 (Frozen cũ) | v0.7 (Idle Management mới) | Đánh giá mâu thuẫn & Xử lý |
|---|---|---|---|
| **Vòng lặp chính (Core loop)** | Chọn khách → gắp nguyên liệu thủ công → giao món | Lên kế hoạch & nhập hàng → Quán tự bán → Quyết định tình huống → Đối soát | ⚠️ **THAY ĐỔI LỚN**: Chuyển trọng tâm từ thao tác tay sang quyết định quản lý. |
| **Cơ chế phục vụ (Service)** | Thủ công 100% (cấm auto-fulfill cho đơn thường) | **Auto-service cho đơn thường**; chỉ can thiệp khi có tình huống | ⚠️ **MÂU THUẪN v0.6**: v0.7 bãi bỏ quy tắc cấm auto-fulfill của v0.6 đối với đơn đủ điều kiện. |
| **Thời gian & Nhịp chơi** | Không có đồng hồ, khách chờ vô hạn | Đồng hồ in-game chạy nhanh, chia khung giờ (Sáng, Trưa, Chiều). Phiên bán 60–90s, có x1/x2 | ⚠️ **MỚI**: Cần engine đồng hồ và bộ điều khiển tốc độ. |
| **Giá bán** | Giá cứng theo recipe (25k / 15k / 17k) | Người chơi chọn 1 trong 2–3 mức giá trước giờ mở cửa | ⚠️ **MỚI**: Bổ sung màn hình Menu & Giá. |
| **Biến động giá nhập** | Giá fixture cố định | Giá nguyên liệu có biến động theo tin tức chợ; giá mới áp dụng cho lần nhập tiếp theo, hàng trong kho giữ nguyên giá vốn | ⚠️ **MỚI**: Tín hiệu xuất hiện ở Tin Xóm hoặc chợ chiều để chuẩn bị Day 2. |
| **Khách hàng** | 3 NPC tên cố định (Bé Tí, Cô Chín, Anh Tùng) | 3 khách quen + 5 khách vãng lai có biến thể ngoại hình (`visualVariantId` ≠ `personId` ≠ `displayName`) | ⚠️ **MỞ RỘNG**: 8 khách làm fixture thử nhịp độ 60–90s. |
| **Cảm xúc khách** | Trạng thái hiển thị tĩnh | 3 trạng thái: `normal`, `happy`, `impatient` thể hiện qua nét mặt/thoại | ✅ Tương thích (thu gọn từ 12 state xuống 3). |
| **Sao quán** | Không có | Mở đầu "Quán mới mở · Chưa đủ đánh giá", nhận nhận xét đầu tiên cuối ngày dựa trên sự kiện phục vụ thật | ✅ Không dùng công thức nhân số ảo. |
| **Tồn kho & Hao hụt** | Không tính tồn qua ngày | Ghi nhận số lượng & cost basis (giá vốn theo lô) riêng; không trộn hao hụt vào COGS | ✅ Chuẩn mực kế toán minh bạch. |
| **Khay quầy (Slots)** | Không giới hạn hiển thị | Ban đầu có 3 slot quầy (vừa đủ bán cả 3 món Bánh mì, Trà tắc, Sữa đậu); nâng cấp mở slot thứ 4 | ✅ Đồng nhất Schema và Wireframe. |
| **Nâng cấp** | Ngoài phạm vi | Cuối Day 1 cho preview 1 nâng cấp nhỏ có hiệu lực từ Day 2 (không trừ tiền Day 1) | ✅ Mục tiêu quay lại, không đổi kết quả Day 1. |
| **Chất liệu Việt Nam** | Tiếng rao, hoa giấy, hẻm nhỏ Sài Gòn | Giữ nguyên và đào sâu nhịp sống, thói quen đi chợ, xe ôm, học sinh | ✅ Kế thừa trọn vẹn `VISUAL_BIBLE.md`. |
| **Trí nhớ NPC (Facts)** | Chỉ lưu sự kiện thực tế, cấm điểm trừu tượng | Giữ nguyên nguyên tắc Fact-based Memory | ✅ Giữ nguyên từ `GAMEPLAY_CONTRACT.md`. |

---

## 3. Giải Quyết 3 Lỗi Chặn & Chuẩn Hóa Logic (v0.7.2)

1. **Khớp Kịch Bản và Sổ Sách (Blocker 1)**:
   - Sức chở xe đạp Day 1 là **20 đơn vị**.
   - Giỏ mua hàng sáng: 3 bánh mì, 4 chả, 3 dưa, 3 đá, 3 đường, 2 tắc, 1 sữa đậu = **19 đơn vị** (tổng tiền mua: **55.000đ**).
   - Lịch 8 khách gồm 6 khách mua thành công (bao gồm cả Bé Tí, Cô Chín, Anh Tùng) và 2 khách vãng lai đến sau bị từ chối do hết hàng.
   - Bé Tí đến lúc kho còn 2 bánh mì, 3 chả, 2 dưa → **Đủ hàng để đồng ý thêm chả (+1 chả)**.
   - Cô Chín đến lúc kho còn 1 tắc, 2 đá, 2 đường → **Đủ hàng uống Trà tắc**.
   - Anh Tùng đến lúc kho còn 1 đá, 1 đường, 1 sữa đậu → **Đủ hàng uống Sữa đậu đá**.
   - Toàn bộ 19 đơn vị bán sạch sành sanh: Doanh thu 122k, COGS 55k, Lợi nhuận gộp +67k, Tiền mặt trong két 127k. Mọi con số khớp nhau từng đồng.

2. **Xử Lý Sự Kiện Tăng Giá Tắc (Blocker 2)**:
   - Tắc mua sáng giá 2k/trái. Số tắc nằm trong kho **KHÔNG tự động tăng giá vốn**.
   - Sự kiện lúc 11:15 trưa là **tin tức thị trường chợ chiều**: thông báo đầu nậu gom hàng ép nước khiến giá tắc ngoài chợ tăng lên 3k/trái.
   - Tin tức này là **thông tin chuẩn bị cho kế hoạch Day 2** (giúp người chơi cân nhắc lượng vốn và giá bán ngày mai), giữ cho scope Day 1 gọn gàng, không cần cơ chế đi chợ lần hai giữa ngày.

3. **Tính Tuần Tự Hóa JSON & Cost Basis (Blocker 3)**:
   - Bỏ toàn bộ function references (như `immediateEffect`) trong `DecisionOption`. Thay bằng POJO thuần túy: `actionKey: string` và `actionPayload?: Record<string, string | number | boolean>` để đảm bảo lưu/tải giữa ngày qua `JSON.stringify / JSON.parse` an toàn 100%.
   - `PantryStockLine` lưu số lượng kèm cấu trúc `StockBatchEntry` ghi nhận `unitCost` (giá vốn theo lô) để tính COGS chuẩn xác khi bán hoặc mang tồn qua ngày.

---

## 4. Chuẩn Hóa Thuật Ngữ Kế Toán & Dòng Tiền

- **Lợi nhuận gộp (Gross Operating Profit)**:
  $$\text{Lợi nhuận gộp} = \text{Doanh thu thuần} - \text{Giá vốn hàng bán (COGS)}$$
  *(Không dùng từ "Lợi nhuận ròng" vì Day 1 chưa trừ chi phí vận hành hay thuế).*
- **Dòng tiền mặt trong két (Cash Reconciliation)**:
  $$\text{Tiền mặt cuối ngày} = \text{Vốn đầu ngày} - \text{Chi mua hàng chợ} + \text{Thu bán hàng tiền mặt} + \text{Tiền tip} - \text{Các khoản bán ghi sổ chưa thu}$$
  *(Day 1: $60.000đ - 55.000đ + 122.000đ + 0đ - 0đ = 127.000đ$).*
- **Hao hụt & Hàng tồn**: Được hạch toán thành các dòng riêng biệt, tuyệt đối không trộn vào COGS của các phần đã bán.

---

## 5. Danh Sách Quy Tắc Test (Invariants) Bắt Buộc

1. **Auto-service trừ kho đúng định lượng**: Mỗi đơn hoàn thành chỉ trừ kho 1 lần duy nhất đúng theo công thức của món (Bánh mì thường: 1 bm, 1 chả, 1 dưa; Bé Tí thêm chả: 1 bm, 2 chả, 1 dưa).
2. **Giá bán & COGS đúng thời điểm**: Đơn hàng ghi nhận doanh thu theo giá bán niêm yết lúc khách gọi món; COGS tính theo giá vốn của lô hàng đã nhập buổi sáng.
3. **Quyết định tạm dừng tua nhanh**: Khi đang bật tốc độ x2, nếu có sự kiện tình huống xảy ra, đồng hồ in-game **phải lập tức pause**, không được tự động bỏ qua hay tự chọn.
4. **Đối soát khớp số 100%**: Doanh thu, COGS, tồn kho, tiền mặt trong két phải khớp chính xác với tổng hợp của từng giao dịch trong ngày.
5. **An toàn Save/Load giữa ngày**: Nạp lại save game khi đang giữa ca bán không được sinh thêm tiền, không nhân đôi đơn hàng và không làm mất khách trong hàng đợi.
