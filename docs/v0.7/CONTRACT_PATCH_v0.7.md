# CONTRACT PATCH v0.7 — Hướng Quản Lý Quán (Idle Management)

> **Baseline**: `GAMEPLAY_CONTRACT.md` (v0.6 frozen), `CONTENT_CONTRACT.md`, `ARCHITECTURE.md`, `VISUAL_BIBLE.md` (v0.6)  
> **Nhánh**: `docs/be-ti-static-production`  
> **Trạng thái**: REVIEW DRAFT v0.7.1 — Đã cập nhật theo 5 quyết định chốt từ Owner. Chưa sửa code gameplay v0.7, chưa sản xuất asset hàng loạt.

---

## 1. Tóm tắt định hướng mới (Idle Management)

- **v0.6 (Cũ)**: Phục vụ thủ công từng đơn (`SELECT` → `TAP` nguyên liệu vào giỏ nháp → `COMMIT`).
- **v0.7 (Mới)**: **Quản lý quán trên điện thoại (Mobile Portrait Offline)**. Người chơi là chủ quán, ra quyết định chiến lược trước và trong ngày:
  - **Trước giờ bán**: Đọc tin xóm, xem giá nhập, chọn giờ mở cửa, lên menu & đặt giá bán, nhập hàng vừa sức chở.
  - **Trong giờ bán (60–90 giây, có x1/x2)**: Quán tự động xử lý phần lớn đơn thường (auto-service trừ kho và nhận tiền đúng công thức). Người chơi quan sát cảnh quán sinh động, khách ra vào, hàng tồn, trạng thái cảm xúc.
  - **Tình huống phát sinh**: Đồng hồ in-game **bắt buộc tạm dừng (pause)** để người chơi đọc và chọn phương án; không tự động chọn khi đang tua nhanh.
  - **Cuối ngày**: Đối soát sổ sách minh bạch (tách biệt Tiền mặt, Doanh thu, COGS của hàng đã bán, Tồn kho thực tế, Nợ/ghi sổ) và đọc câu chuyện phản hồi từ khách.

---

## 2. Bảng đối chiếu: v0.6 vs v0.7

| Trọng tâm | v0.6 (Frozen cũ) | v0.7 (Idle Management mới) | Đánh giá mâu thuẫn & Xử lý |
|---|---|---|---|
| **Vòng lặp chính (Core loop)** | Chọn khách → gắp nguyên liệu thủ công → giao món | Lên kế hoạch & nhập hàng → Quán tự bán → Quyết định tình huống → Đối soát | ⚠️ **THAY ĐỔI LỚN**: Chuyển trọng tâm từ thao tác tay sang quyết định quản lý. |
| **Cơ chế phục vụ (Service)** | Thủ công 100% (cấm auto-fulfill cho đơn thường) | **Auto-service cho đơn thường**; chỉ can thiệp khi có tình huống | ⚠️ **MÂU THUẪN v0.6**: v0.7 bãi bỏ quy tắc cấm auto-fulfill của v0.6 đối với đơn đủ điều kiện. |
| **Thời gian & Nhịp chơi** | Không có đồng hồ, khách chờ vô hạn | Đồng hồ in-game chạy nhanh, chia khung giờ (Sáng, Trưa, Chiều, Tối). Phiên bán 60–90s, có x1/x2 | ⚠️ **MỚI**: Cần engine đồng hồ và bộ điều khiển tốc độ. |
| **Giá bán** | Giá cứng theo recipe (25k / 15k / 17k) | Người chơi chọn 1 trong 2–3 mức giá trước giờ mở cửa | ⚠️ **MỚI**: Bổ sung màn hình Menu & Giá. |
| **Biến động giá nhập** | Giá fixture cố định | Giá nguyên liệu có biến động theo tin tức chợ | ⚠️ **MỚI**: Tín hiệu xuất hiện trước khi mua hàng hoặc ảnh hưởng kế hoạch ngày sau. |
| **Khách hàng** | 3 NPC tên cố định (Bé Tí, Cô Chín, Anh Tùng) | 3 khách quen + nhóm khách vãng lai có biến thể ngoại hình (`visualId` ≠ `personId` ≠ `displayName`) | ⚠️ **MỞ RỘNG**: Tái sử dụng base sprite bằng tint/phụ kiện. |
| **Cảm xúc khách** | Trạng thái hiển thị tĩnh | 3 trạng thái: `normal`, `happy`, `impatient` thể hiện qua nét mặt/thoại | ✅ Tương thích (thu gọn từ 12 state xuống 3). |
| **Sao quán** | Không có | Mở đầu "Chưa đủ đánh giá", nhận đánh giá đầu tiên cuối ngày dựa trên sự kiện phục vụ thật | ✅ Không dùng công thức nhân vô lý. |
| **Tồn kho & Hao hụt** | Không tính tồn qua ngày | Ghi nhận số lượng & giá trị tồn kho riêng; không trộn hao hụt vào COGS | ✅ Chuẩn mực kế toán minh bạch. |
| **Nâng cấp** | Ngoài phạm vi | Cuối Day 1 cho preview 1 nâng cấp nhỏ có hiệu lực từ Day 2 | ✅ Mục tiêu quay lại, không đổi kết quả Day 1. |
| **Chất liệu Việt Nam** | Tiếng rao, hoa giấy, hẻm nhỏ Sài Gòn | Giữ nguyên và đào sâu nhịp sống, thói quen đi chợ, xe ôm, học sinh | ✅ Kế thừa trọn vẹn `VISUAL_BIBLE.md`. |
| **Trí nhớ NPC (Facts)** | Chỉ lưu sự kiện thực tế, cấm điểm trừu tượng | Giữ nguyên nguyên tắc Fact-based Memory | ✅ Giữ nguyên từ `GAMEPLAY_CONTRACT.md`. |

---

## 3. Năm Quyết Định Đã Chốt từ Owner

1. **Khách hàng Day 1 (Fixture thử nhịp)**:
   - Sử dụng **8 khách** (3 khách quen: Bé Tí, Cô Chín, Anh Tùng + 5 khách vãng lai) làm fixture thử nghiệm nhịp độ.
   - Không khóa cứng số 8; mục tiêu là đo lường trong khoảng **60–90 giây** xem khách xuất hiện có tự nhiên không và người chơi có đủ thời gian tiếp nhận 2 tình huống hay không.

2. **Quy tắc đổi giá giữa ngày**:
   - Menu và giá bán được chốt trước khi mở quán.
   - Trong giờ bán, nếu có sự kiện biến động (ví dụ tắc tăng giá), mở **1 quyết định đặc biệt duy nhất**:
     - *Phương án A*: Giữ giá cũ (15k) → giữ khách, chấp nhận giảm biên lãi.
     - *Phương án B*: Tăng giá (18k) cho các đơn mới phát sinh sau đó → khách vãng lai nhạy giá có thể từ chối; các đơn đã nhận trước thời điểm này vẫn tính giá cũ.
     - *Phương án C*: Tạm ngừng nhận món trà tắc.

3. **Cơ chế giá vốn & Hàng trong kho**:
   - Nguyên liệu đã mua và nằm trong kho **KHÔNG tự động tăng giá vốn**. COGS của mỗi phần bán ra tính theo đúng giá mua thực tế tại thời điểm nhập hàng.
   - Giá nhập mới chỉ áp dụng cho lần nhập hàng tiếp theo.
   - Vì Day 1 không có cơ chế chạy đi chợ lần hai giữa ngày, tin tăng giá sẽ xuất hiện dưới dạng cảnh báo trước ở "Tin Xóm" buổi sáng, hoặc trở thành bài toán chuẩn bị cho Day 2.

4. **Trạng thái Sao quán (Reputation)**:
   - Bãi bỏ các con số giả định như "0.5 sao" hay "+0.5 sao".
   - Đầu Day 1, quán ở trạng thái: **"Quán mới mở · Chưa đủ đánh giá"**.
   - Cuối Day 1, quán nhận **nhận xét và đánh giá đầu tiên** dựa trên dữ kiện thực tế: số đơn phục vụ thành công, số đơn bị lỡ, phản ứng của khách quen.

5. **Nâng cấp cuối Day 1**:
   - Cuối Day 1 hiển thị preview / lựa chọn 1 nâng cấp nhỏ (ví dụ: giỏ chở hàng xe đạp tăng lên 20 đơn vị hoặc mở thêm khay bày).
   - Tác dụng áp dụng từ Day 2.
   - Trong phạm vi bản thử Day 1, mục này mang tính chất **xem trước (preview) và định hướng mục tiêu**, không trừ tiền và không làm thay đổi sổ sách Day 1 vừa chơi.

---

## 4. Danh sách Quy tắc Test (Invariants) cho v0.7

Khi chuyển sang code v0.7, bộ kiểm thử tự động phải xác minh các bất biến sau:
1. **Bán tự động trừ kho đúng 1 lần**: Khi một đơn thường hoàn tất auto-service, số lượng nguyên liệu trong kho bị trừ chính xác bằng định lượng công thức, không có hiện tượng trừ 2 lần.
2. **Giá bán & COGS đúng thời điểm**: Đơn bán tại thời điểm nào áp dụng đúng giá bán niêm yết tại thời điểm đó. COGS tính đúng theo giá vốn lô hàng đã nhập.
3. **Quyết định tạm dừng tua nhanh**: Khi đang bật tốc độ x2, nếu có sự kiện tình huống xảy ra, đồng hồ in-game **phải lập tức pause**, không được tự động bỏ qua hay tự chọn.
4. **Đối soát kế toán hoàn chỉnh**:
   - `Tiền mặt cuối ngày = Tiền vốn đầu ngày - Tiền mua hàng ở chợ + Doanh thu bán hàng + Tiền tip`.
   - `Lợi nhuận gộp = Doanh thu - COGS của các phần đã bán`.
   - `Giá trị hàng tồn kho` được hạch toán riêng, không bị tính gộp vào COGS.
5. **An toàn Save/Load giữa ngày**: Nạp lại save game khi đang giữa ca bán không được sinh thêm tiền, không nhân đôi đơn hàng và không làm mất khách trong hàng đợi.

---

## 5. Tình trạng Tái sử dụng & Dọn dẹp Code

- **Dùng lại 100%**: Bộ sprite nhân vật Bé Tí (4-frame loop, crop, canvas anchor), hình ảnh Cô Chín, Anh Tùng, bộ 7 sprite nguyên liệu watercolor, ảnh 3 món ăn hoàn chỉnh, ảnh nền hẻm `alley_counter_clean.jpg`.
- **Đã dọn dẹp (Commit `docs/be-ti-static-production`)**: Đã gỡ bỏ triệt để các biến rác và lệnh dọn timer cũ (`autoServiceTimer`, `patienceTimer`, `pourInterval`, `isHoldingPour`, `pourProgress`, `skillResult`) trong `game/main.mjs`, trả code về trạng thái sạch sẽ không lỗi runtime.
- **Sẽ thay thế ở v0.7**: Thay khay chế biến bấm tay và nút COMMIT bằng module **Auto-Service Engine** và **Bảng hiển thị trạng thái kho/khách**.
