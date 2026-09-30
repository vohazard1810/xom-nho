# CONTRACT PATCH v0.7 — Hướng Quản Lý Quán (Idle Management)

> **Baseline**: `GAMEPLAY_CONTRACT.md` (v0.6 frozen), `CONTENT_CONTRACT.md`, `ARCHITECTURE.md`, `VISUAL_BIBLE.md` (v0.6)  
> **Nhánh**: `docs/be-ti-static-production`  
> **Trạng thái**: REVIEW DRAFT v0.7.3 — Đã chuẩn hóa công thức kế toán dòng tiền, tách bạch nhãn bằng chứng v0.6 baseline, và chuẩn hóa 1 Quyết định pause + 1 Tin thị trường không pause.

---

## 1. Tóm Tắt Định Hướng Mới (Idle Management)

- **v0.6 (Baseline cũ)**: Phục vụ thủ công từng đơn (`SELECT` → `TAP` nguyên liệu vào giỏ nháp → `COMMIT`).
- **v0.7 (Mục tiêu mới)**: **Quản lý quán trên điện thoại (Mobile Portrait Offline)**. Người chơi là chủ quán, ra quyết định chiến lược trước và trong ngày:
  - **Trước giờ bán (Prepare Phase)**: Đọc tin xóm, xem giá chợ, chọn giờ mở cửa, lên menu 3 món & đặt giá bán từ 2–3 mức định sẵn, nhập hàng vừa sức chở xe đạp (20 đơn vị).
  - **Trong giờ bán (Service Phase — 60–90 giây, có x1/x2)**: Quán tự động xử lý phần lớn đơn thường (auto-service trừ kho và ghi nhận doanh thu đúng định lượng). Người chơi quan sát cảnh quán sinh động, khách ra vào, hàng tồn, trạng thái cảm xúc.
  - **Tình huống phát sinh**: Chỉ tạm dừng (pause) đồng hồ in-game khi có **quyết định quản lý thực sự** (Bé Tí xin thêm chả). Các tin tức thị trường khác hiển thị lướt qua dưới dạng banner/bong bóng tin, không làm đứt đoạn nhịp chơi.
  - **Cuối ngày (Wrap-up Phase)**: Đối soát sổ sách minh bạch (tách biệt Tiền mặt thực tế, Doanh thu, COGS của hàng đã bán, Tồn kho thực tế, Nợ/ghi sổ) và đọc câu chuyện phản hồi từ khách.

---

## 2. Bảng Đối Chiếu: v0.6 vs v0.7

| Trọng tâm | v0.6 (Frozen Baseline) | v0.7 (Idle Management Mới) | Đánh giá & Xử lý |
|---|---|---|---|
| **Vòng lặp chính** | Chọn khách → gắp nguyên liệu thủ công → giao món | Lên kế hoạch & nhập hàng → Quán tự bán → Quyết định tình huống → Đối soát | ⚠️ **THAY ĐỔI LỚN**: Chuyển trọng tâm từ thao tác tay sang quyết định quản lý. |
| **Cơ chế phục vụ** | Thủ công 100% (cấm auto-fulfill cho đơn thường) | **Auto-service cho đơn thường**; chỉ can thiệp khi có tình huống | ⚠️ **MÂU THUẪN v0.6**: v0.7 bãi bỏ quy tắc cấm auto-fulfill của v0.6 đối với đơn đủ điều kiện. |
| **Thời gian & Nhịp chơi** | Không có đồng hồ, khách chờ vô hạn | Đồng hồ in-game chạy nhanh, chia khung giờ. Phiên bán 60–90s, có x1/x2 | ⚠️ **MỚI**: Cần engine đồng hồ và bộ điều khiển tốc độ. |
| **Giá bán** | Giá cứng theo recipe (25k / 15k / 17k) | Người chơi chọn 1 trong 2–3 mức giá trước giờ mở cửa | ⚠️ **MỚI**: Bổ sung màn hình Menu & Giá. |
| **Biến động giá nhập** | Giá fixture cố định | Giá nguyên liệu biến động theo tin tức chợ; giá mới chỉ áp dụng cho lần nhập tiếp theo, hàng trong kho giữ nguyên giá vốn | ⚠️ **MỚI**: Tin thị trường trưa xuất hiện lướt qua, không pause, chuẩn bị cho Day 2. |
| **Khách hàng** | 3 NPC tên cố định (Bé Tí, Cô Chín, Anh Tùng) | 3 khách quen + 5 khách vãng lai có biến thể ngoại hình (`visualVariantId` ≠ `personId` ≠ `displayName`) | ⚠️ **MỞ RỘNG**: 8 khách làm fixture thử nhịp độ 60–90s. |
| **Tình huống trong ngày** | Không có | **1 Quyết định thực sự (PAUSE)**: Bé Tí xin thêm chả.<br>**1 Tin thị trường (KHÔNG PAUSE)**: Giá tắc chợ chiều tăng. | ✅ Tránh gián đoạn giả tạo. |
| **Sao quán** | Không có | Mở đầu "Quán mới mở · Chưa đủ đánh giá", nhận nhận xét đầu tiên cuối ngày dựa trên sự kiện phục vụ thật | ✅ Không dùng công thức nhân số ảo. |
| **Tồn kho & Hao hụt** | Không tính tồn qua ngày | Ghi nhận số lượng & cost basis (giá vốn theo lô) riêng; không trộn hao hụt vào COGS | ✅ Chuẩn mực kế toán minh bạch. |
| **Khay quầy (Slots)** | Không giới hạn hiển thị | Ban đầu có 3 slot quầy (vừa đủ bán cả 3 món Bánh mì, Trà tắc, Sữa đậu); nâng cấp mở slot thứ 4 | ✅ Đồng nhất Schema và Wireframe. |
| **Nâng cấp** | Ngoài phạm vi | Cuối Day 1 cho preview 1 nâng cấp nhỏ có hiệu lực từ Day 2 (không trừ tiền Day 1) | ✅ Mục tiêu quay lại, không đổi kết quả Day 1. |
| **Chất liệu Việt Nam** | Tiếng rao, hoa giấy, hẻm nhỏ Sài Gòn | Giữ nguyên và đào sâu nhịp sống, thói quen đi chợ, xe ôm, học sinh | ✅ Kế thừa trọn vẹn `VISUAL_BIBLE.md`. |
| **Trí nhớ NPC (Facts)** | Chỉ lưu sự kiện thực tế, cấm điểm trừu tượng | Giữ nguyên nguyên tắc Fact-based Memory | ✅ Giữ nguyên từ `GAMEPLAY_CONTRACT.md`. |

---

## 3. Chuẩn Hóa Công Thức Kế Toán & Dòng Tiền (Khắc phục lỗi trừ 2 lần)

Để đảm bảo tính nhất quán tuyệt đối giữa Contract, Schema và Code, chuẩn hóa định nghĩa kế toán như sau:

### 3.1 Mối quan hệ Doanh Thu & Ghi Sổ
$$\text{Tổng Doanh Thu Ghi Nhận (Total Revenue)} = \text{Tiền Mặt Thu Từ Bán Hàng (Cash Sales)} + \text{Khoản Bán Chịu Chưa Thu (Credit Receivables)}$$

### 3.2 Dòng Tiền Mặt Trong Két (Cash Flow Reconciliation)
Có hai cách biểu diễn toán học tương đương và thống nhất:

- **Cách 1 (Từ tiền mặt thực thu — Khuyến nghị dùng trong Schema)**:
  $$\text{Tiền Mặt Cuối Ngày} = \text{Vốn Đầu Ngày} - \text{Chi Mua Hàng} + \text{Tiền Mặt Thu Từ Bán Hàng} + \text{Tiền Tip}$$
  *(Vì $\text{Tiền Mặt Thu Từ Bán Hàng}$ đã là số tiền thực sự cầm trên tay, TUYỆT ĐỐI KHÔNG trừ thêm $\text{Khoản Bán Chịu}$).*

- **Cách 2 (Từ tổng doanh thu niêm yết)**:
  $$\text{Tiền Mặt Cuối Ngày} = \text{Vốn Đầu Ngày} - \text{Chi Mua Hàng} + (\text{Tổng Doanh Thu} - \text{Khoản Bán Chịu Chưa Thu}) + \text{Tiền Tip}$$

### 3.3 Báo Cáo Kết Quả Kinh Doanh (P&L)
$$\text{Lợi Nhuận Gộp (Gross Operating Profit)} = \text{Tổng Doanh Thu Thuần} - \text{Giá Vốn Hàng Đã Bán (COGS)}$$
*(Hao hụt hàng hư, chi phí vận hành hay thuế nếu có được thể hiện ở dòng riêng, không trộn vào COGS).*

---

## 4. Phân Biệt Sự Kiện: 1 Quyết Định Pause + 1 Tin Thị Trường Không Pause

Để tránh tạo cảm giác bị ngắt quãng vô cớ khi chơi:
1. **Quyết định có Pause (Decision Event)**:
   - Chỉ kích hoạt khi người chơi có **2 lựa chọn thực sự tạo ra hậu quả kinh tế/quan hệ khác nhau**.
   - Day 1: **Bé Tí xin thêm chả (10:00)**:
     - Nhánh A: Đồng ý (+1 chả) → tốn thêm 5k vốn, đổi định lượng, Bé Tí vui.
     - Nhánh B: Từ chối (phần thường) → giữ chả cho khách sau, Bé Tí bình thường.
2. **Tin thị trường không Pause (Market News Ticker)**:
   - Dành cho thông tin ngoại cảnh, tin đồn giá cả phục vụ kế hoạch ngày sau.
   - Day 1: **Tin giá tắc chợ chiều tăng (11:15)**:
     - Xuất hiện dưới dạng banner tin tức nhẹ nhàng hoặc lời thoại của người đi đường lướt qua quầy.
     - Đồng hồ in-game **vẫn tiếp tục chạy**, không bắt người chơi bấm xác nhận vô nghĩa.
     - Tin tức này được nhắc lại ở mục "Gợi ý ngày mai" trong sổ tổng kết cuối ngày.

---

## 5. Ranh Giới Bằng Chứng & Code Base

- **Thư mục ảnh**: Toàn bộ 13 screenshot kiểm thử hiện tại đã được chuyển vào [`docs/v0.6_baseline_screenshots/`](https://github.com/vohazard1810/xom-nho/tree/docs/be-ti-static-production/docs/v0.6_baseline_screenshots).
- **Ý nghĩa bằng chứng**: Thư mục này chỉ đóng vai trò xác nhận bản **v0.6 manual assembly** (khung 28k/57k cũ, nút COMMIT, Cô Chín đứng chờ) và xác minh việc sửa lỗi timer hiển thị màn phản ứng của Anh Tùng.
- **Ranh giới v0.7**: Hiện tại **CHƯA CÓ CODE BUILD IDLE v0.7**. Bộ tài liệu v0.7.3 này là bản đặc tả hoàn chỉnh và thống nhất, dùng làm căn cứ kỹ thuật để triển khai prototype idle sau khi được duyệt.
