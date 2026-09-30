# KỊCH BẢN DAY 1 (DAY_1_SCENARIO.md) — Xóm Nhỏ v0.7

> **Trạng thái**: REVIEW DRAFT v0.7.2 — Đã cập nhật Bảng giao dịch 8 khách chi tiết, khớp từng đồng giữa kho, doanh thu, COGS, tiền mặt và lãi gộp.  
> **Lưu ý**: Toàn bộ số liệu là **fixture thử nghiệm nhịp độ (60–90 giây)**, chưa phải bảng cân bằng kinh tế chính thức.

---

## 1. Mục Tiêu Kịch Bản Day 1

1. **Trải nghiệm quản lý quán**: Người chơi bắt đầu ngày mới bằng việc đọc tin xóm, lên menu 3 món, và nhập giỏ hàng vừa sức chở xe đạp.
2. **Nhịp quán tự bán (60–90s)**: Đơn thường tự phục vụ nhanh gọn; đồng hồ in-game **tự động tạm dừng (pause)** khi có tình huống đặc biệt (Bé Tí xin thêm chả, tin thị trường tắc tăng giá).
3. **Tính toán kế toán minh bạch 100%**: Bé Tí, Cô Chín, Anh Tùng đều được phục vụ thành công; các đơn bán trừ kho chính xác; sổ sách cuối ngày đối soát rõ ràng giữa dòng tiền mặt và lãi gộp.

---

## 2. Phase 1: Chuẩn Bị Trước Khi Mở Quán

### 1.1 Tin Buổi Sớm (Xóm Ơi)
- Nắng sớm len lỏi qua giàn hoa giấy. Tiếng chổi tre xào xạc hòa cùng tiếng còi xe máy đầu hẻm.
- **Lịch ghé dự kiến**: Bé Tí tan học ~10h, Cô Chín đi chợ về ~11h, Anh Tùng chạy xe ôm ghé trưa.
- **Tin tức thị trường (Quyết định 2 & 3)**: Bà Sáu đầu chợ nhắn nhủ: *"Trái tắc dạo này mối lái gom ép nước nhiều, trưa chiều có thể khan hàng, mai mốt giá có thể nhích lên đó nghen!"* (Cung cấp tín hiệu sớm để chuẩn bị cho kế hoạch Day 2, không phạt người chơi đột ngột).

### 1.2 Nhập Hàng Chợ Đầu Ngõ
- **Vốn khởi điểm trong két**: **60.000đ**.
- **Phương tiện vận chuyển**: **Xe đạp chở hàng** — Sức chở tối đa: **20 đơn vị**.
- **Bảng giá chợ sáng**:
  - Bánh mì: 4.000đ/ổ | Chả lụa: 5.000đ/khoanh | Dưa ngò: 2.000đ/phần
  - Đá bi: 1.000đ/ca | Nước đường: 2.000đ/muỗng | Tắc tươi: 2.000đ/trái | Sữa đậu: 4.000đ/bịch
- **Gói mua hàng Day 1 (19 đơn vị — vừa vặn dưới sức chở 20)**:
  - Bánh mì: 3 ổ × 4k = 12.000đ
  - Chả lụa: 4 khoanh × 5k = 20.000đ
  - Dưa ngò: 3 phần × 2k = 6.000đ
  - Đá bi: 3 ca × 1k = 3.000đ
  - Nước đường: 3 muỗng × 2k = 6.000đ
  - Tắc tươi: 2 trái × 2k = 4.000đ
  - Sữa đậu: 1 bịch × 4k = 4.000đ
  - **Tổng số đơn vị**: 3 + 4 + 3 + 3 + 3 + 2 + 1 = **19 / 20 đơn vị**.
  - **Tổng tiền mua hàng**: 12k + 20k + 6k + 3k + 6k + 4k + 4k = **55.000đ**.
  - **Tiền mặt còn lại trong két**: 60.000đ - 55.000đ = **5.000đ**.

### 1.3 Lên Menu & Đặt Giá (3 Slots Ban Đầu)
- Quầy mở bán đủ cả 3 món khởi đầu:
  - **Bánh Mì Chả**: Giá vốn dự kiến 11k/ổ → Chốt giá bán: **25.000đ** (Lãi gộp: 14k/ổ).
  - **Trà Tắc**: Giá vốn dự kiến 5k/ly → Chốt giá bán: **15.000đ** (Lãi gộp: 10k/ly).
  - **Sữa Đậu Đá**: Giá vốn dự kiến 7k/ly → Chốt giá bán: **17.000đ** (Lãi gộp: 10k/ly).
- Giờ mở cửa: Chọn **[ Đúng giờ 8:00 ]** (đón 8 khách trong ngày).

---

## 3. Phase 2: Bán Hàng (Service Phase — Bảng Giao Dịch 8 Khách)

Đồng hồ in-game chạy từ 08:00 đến 14:00 (khoảng 60–90 giây thực tế ở tốc độ x1).

### BẢNG GIAO DỊCH CHI TIẾT TỪNG BƯỚC

| # | Khách hàng | Khung giờ | Món gọi | Kho trước giao dịch | Xử lý & Tình huống | Kho sau giao dịch | Kết quả | Giá bán | COGS | Tiền thu | Lãi gộp |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | **Bác Ba** *(Vãng lai)* | 08:30 | Bánh mì chả | BM:3, Chả:4, Dưa:3<br>Đá:3, Đường:3, Tắc:2, Sữa:1 | Đơn thường: Quán tự động chuẩn bị (1.5s) | BM:2, Chả:3, Dưa:2<br>Đá:3, Đường:3, Tắc:2, Sữa:1 | ✅ Thành công | 25.000đ | 11.000đ | +25.000đ | +14.000đ |
| **2** | **Chị Hai** *(Vãng lai)* | 09:15 | Trà tắc | BM:2, Chả:3, Dưa:2<br>Đá:3, Đường:3, Tắc:2, Sữa:1 | Đơn thường: Quán tự động pha chế (1.5s) | BM:2, Chả:3, Dưa:2<br>Đá:2, Đường:2, Tắc:1, Sữa:1 | ✅ Thành công | 15.000đ | 5.000đ | +15.000đ | +10.000đ |
| **3** | **BÉ TÍ** *(Khách quen)* | 10:00 | Bánh mì chả *(Xin thêm chả)* | BM:2, Chả:3, Dưa:2<br>Đá:2, Đường:2, Tắc:1, Sữa:1 | ⏸ **CLOCK TỰ ĐỘNG PAUSE**<br>Bé Tí: *"Chú ơi cho con xin thêm chả nghen!"*<br>👉 Người chơi chọn: **"Đồng ý thêm chả (+1 chả)"**<br>→ Định lượng: 1 BM, 2 Chả, 1 Dưa. Đủ hàng! | BM:1, Chả:1, Dưa:1<br>Đá:2, Đường:2, Tắc:1, Sữa:1 | ✅ Thành công | 25.000đ | 16.000đ | +25.000đ | +9.000đ |
| **4** | **CÔ CHÍN** *(Khách quen)* | 11:00 | Trà tắc | BM:1, Chả:1, Dưa:1<br>Đá:2, Đường:2, Tắc:1, Sữa:1 | Đơn thường: Quán còn đúng 1 trái tắc, 2 ca đá. Quán tự pha ly trà tắc mát rượi. | BM:1, Chả:1, Dưa:1<br>Đá:1, Đường:1, Tắc:0, Sữa:1 | ✅ Thành công | 15.000đ | 5.000đ | +15.000đ | +10.000đ |
| **—** | **Sự Kiện Thị Trường** | 11:15 | — | BM:1, Chả:1, Dưa:1<br>Đá:1, Đường:1, Tắc:0, Sữa:1 | ⏸ **CLOCK TỰ ĐỘNG PAUSE**<br>Tin tức: Giá tắc ngoài chợ vọt lên 3k/trái do gom hàng ép nước.<br>👉 **Quyết định cho Day 2**: Ghi nhận tin đồn để chuẩn bị vốn và định giá bán cho Day 2. Tắc đã mua sáng nay vẫn giữ nguyên giá vốn 2k. | BM:1, Chả:1, Dưa:1<br>Đá:1, Đường:1, Tắc:0, Sữa:1 | ℹ️ Thông tin thị trường | — | — | — | — |
| **5** | **ANH TÙNG** *(Khách quen)* | 11:45 | Sữa đậu đá | BM:1, Chả:1, Dưa:1<br>Đá:1, Đường:1, Tắc:0, Sữa:1 | Khách vội chạy cuốc trưa. Quán còn đúng 1 ca đá, 1 muỗng đường, 1 bịch sữa đậu. Tự phục vụ bình thường, không mini-game. | BM:1, Chả:1, Dưa:1<br>Đá:0, Đường:0, Tắc:0, Sữa:0 | ✅ Thành công | 17.000đ | 7.000đ | +17.000đ | +10.000đ |
| **6** | **Bác Năm** *(Vãng lai)* | 12:15 | Bánh mì chả | BM:1, Chả:1, Dưa:1<br>Đá:0, Đường:0, Tắc:0, Sữa:0 | Đơn thường: Còn đúng 1 ổ bánh mì, 1 khoanh chả, 1 phần dưa cuối cùng. Bán sạch quầy bánh mì! | BM:0, Chả:0, Dưa:0<br>Đá:0, Đường:0, Tắc:0, Sữa:0 | ✅ Thành công | 25.000đ | 11.000đ | +25.000đ | +14.000đ |
| **7** | **Cô Bảy** *(Vãng lai)* | 12:45 | Trà tắc | BM:0, Chả:0, Dưa:0<br>Đá:0, Đường:0, Tắc:0, Sữa:0 | **HẾT NGUYÊN LIỆU NƯỚC** (Tắc: 0, Đá: 0).<br>Cô Bảy: *"Hết nước rồi hả con? Tiếc ghê, để mai cô ghé sớm!"* | BM:0, Chả:0, Dưa:0<br>Đá:0, Đường:0, Tắc:0, Sữa:0 | ❌ Từ chối *(Out of stock)* | 0đ | 0đ | 0đ | 0đ |
| **8** | **Chú Tư** *(Vãng lai)* | 13:15 | Bánh mì chả | BM:0, Chả:0, Dưa:0<br>Đá:0, Đường:0, Tắc:0, Sữa:0 | **HẾT BÁNH MÌ** (Bánh mì: 0).<br>Chú Tư: *"Nay đắt hàng dữ ta, hết bánh mì sớm rồi!"* | BM:0, Chả:0, Dưa:0<br>Đá:0, Đường:0, Tắc:0, Sữa:0 | ❌ Từ chối *(Out of stock)* | 0đ | 0đ | 0đ | 0đ |

---

## 4. Phase 3: Đóng Cửa & Sổ Đối Soát Cuối Ngày (Reconciliation)

Sổ tay cuối ngày được cộng dồn chuẩn xác 100% từ Bảng Giao Dịch trên:

```
📖 SỔ GHI TIỀN QUÁN XÓM NHỎ — NGÀY 1
─────────────────────────────────────────────────────────────
💵 1. BÁO CÁO DÒNG TIỀN MẶT TRONG KÉT
   • Tiền vốn mở quầy sáng nay:                     60.000đ
   • Chi tiền mua nguyên liệu ở chợ:                -55.000đ
   • Thu tiền bán bánh & nước (6 đơn):             +122.000đ
   • Các khoản bán ghi sổ chưa thu (nợ):                  0đ
   • Tiền tip:                                           0đ
   ─────────────────────────────────────────────────────────
   👉 TỔNG TIỀN MẶT TRONG KÉT CUỐI NGÀY:            127.000đ
   👉 Chênh lệch tiền mặt trong ngày:               +67.000đ

📊 2. BÁO CÁO KẾT QUẢ KINH DOANH (P&L)
   • Doanh thu thuần:                               +122.000đ
   • Giá vốn hàng đã bán (COGS 6 đơn):              -55.000đ
   ─────────────────────────────────────────────────────────
   👉 LỢI NHUẬN GỘP (GROSS PROFIT):                  +67.000đ
   • Giá trị nguyên liệu còn tồn kho:                     0đ (Bán sạch 19/19 đơn vị)
   • Hao hụt / hủy hàng:                                  0đ
   • Chi phí vận hành khác:                                0đ

📊 3. LÃI GỘP THEO TỪNG MÓN ĂN
   • Bánh Mì Chả:  3 phần | Doanh thu:  75.000đ | COGS: 38.000đ | Lãi gộp: +37.000đ
     (Trong đó 1 phần Bé Tí thêm chả có COGS 16k; 2 phần thường có COGS 11k/phần)
   • Trà Tắc:      2 ly   | Doanh thu:  30.000đ | COGS: 10.000đ | Lãi gộp: +20.000đ
   • Sữa Đậu Đá:   1 ly   | Doanh thu:  17.000đ | COGS:  7.000đ | Lãi gộp: +10.000đ
   ─────────────────────────────────────────────────────────
   👉 TỔNG LÃI GỘP CÁC MÓN:                         +67.000đ

🚫 4. TỔNG KẾT ĐƠN BỎ LỠ
   • Số đơn phục vụ thành công:                     6 / 8 đơn (75%)
   • Số đơn bỏ lỡ do hết hàng (Out of stock):       2 đơn (Cô Bảy, Chú Tư)

⭐ 5. ĐÁNH GIÁ QUÁN (Quyết định 4)
   • Trạng thái: "Quán mới mở · Nhận phản hồi tích cực từ 3 người xóm quen"
   • Lời nhắn thực tế:
     - Bé Tí: Cầm ổ bánh mì đầy ắp chả cười tít mắt, tấm tắc khen chú làm ngon và hứa mai tan học lại ghé.
     - Cô Chín: Uống ly trà tắc giải nhiệt, khen quán pha thanh mát vừa miệng.
     - Anh Tùng: Uống ly sữa đậu mát rượi, khen quán chu đáo rồi nổ máy chạy cuốc xe trưa.
     - Cô Bảy & Chú Tư: Hẹn mai ghé sớm hơn để mua được hàng.

🔧 6. XEM TRƯỚC NÂNG CẤP DAY 2 (Quyết định 5)
   • Xem trước nâng cấp: [Rổ Đèo Hàng Xe Đạp] — Tăng sức chở từ 20 lên 30 đơn vị để chở thêm đá và bánh mì cho ngày đông khách.
     *(Chỉ xem trước định hướng, không trừ tiền Day 1).*
   • Mối hàng mới: Ngày mai bà Bảy giao mối trứng gà tươi giá mềm đầu chợ → Cơ hội mở món Bánh Mì Ốp-La!
```
