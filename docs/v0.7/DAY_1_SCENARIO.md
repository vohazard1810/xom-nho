# KỊCH BẢN DAY 1 (DAY_1_SCENARIO.md) — Xóm Nhỏ v0.7

> **Trạng thái**: REVIEW DRAFT v0.7.1 — Đã cập nhật 5 quyết định chốt từ Owner.  
> **Lưu ý**: Toàn bộ số liệu là **fixture thử nghiệm nhịp độ**, chưa phải bảng cân bằng kinh tế chính thức.

---

## 1. Mục tiêu Playtest Day 1

- Đo lường nhịp chơi **60–90 giây** (ở tốc độ x1) xem quán tự phục vụ có tạo cảm giác thư thái nhưng vẫn đủ sinh động không.
- Kiểm tra tính mượt mà khi đồng hồ in-game **tự động pause** khi có tình huống (Bé Tí xin thêm chả, đợt tắc tăng giá) và người chơi đưa ra lựa chọn.
- Xác nhận sổ sách đối soát cuối ngày minh bạch: tách biệt dòng tiền mặt thực tế và lãi gộp kinh tế.

---

## 2. Các giai đoạn trong ngày (Phase Walkthrough)

### Phase 1: Chuẩn Bị (Trước giờ mở cửa)

1. **Tin Xóm (Xóm Ơi)**:
   - Thời tiết nắng ráo, ve kêu râm ran đầu hẻm.
   - Tin đồn: Bé Tí tan học lúc 10h, Cô Chín đi chợ về lúc 11h, Anh Tùng chạy xe ôm ghé trưa.
   - **Tín hiệu cảnh báo giá (Quyết định 3)**: Bà Sáu bán tắc đầu chợ nhắn nhủ: *"Trái tắc đợt này khan hàng, trưa chiều có mối gom về ép nước, mai mốt giá có thể nhích lên đó nghen!"* (Cung cấp tín hiệu trước, không làm người chơi bị phạt bất ngờ).
2. **Ra Chợ Nhập Hàng**:
   - Vốn đầu ngày: **60.000đ**.
   - Phương tiện: **Xe đạp cũ** — sức chở tối đa **15 đơn vị**.
   - Bảng giá chợ sáng: Bánh mì (4k), Chả lụa (5k), Dưa ngò (2k), Đá bi (1k), Nước đường (2k), Tắc tươi (2k), Sữa đậu (4k).
   - Người chơi chọn mua gói hàng vừa sức chở (ví dụ: 1 ổ bánh mì, 2 khoanh chả, 1 dưa ngò, 2 ca đá, 2 muỗng đường, 1 trái tắc, 1 bịch sữa đậu = 10 đơn vị, tổng tiền **28.000đ**).
3. **Lên Menu & Đặt Giá (Quyết định 2)**:
   - Chọn mở bán cả 3 món:
     - *Bánh Mì Chả*: Giá vốn dự kiến 11.000đ → Chọn giá bán: [22k / **25k** / 28k] (Lãi gộp: 14.000đ).
     - *Trà Tắc*: Giá vốn dự kiến 5.000đ → Chọn giá bán: [12k / **15k** / 18k] (Lãi gộp: 10.000đ).
     - *Sữa Đậu Đá*: Giá vốn dự kiến 7.000đ → Chọn giá bán: [14k / **17k** / 20k] (Lãi gộp: 10.000đ).
4. **Chọn Giờ Mở Cửa**:
   - [Mở sớm 6:00] (Đón thêm người đi làm sớm nhưng tốn sức).
   - [**Đúng giờ 8:00**] (Nhịp chuẩn, 8 khách ghé quán).
   - [Mở trễ 10:00] (Bỏ lỡ khách ăn sáng).

---

### Phase 2: Mở Quán Tự Bán (Service Phase — 60–90 giây, có x1/x2)

Đồng hồ chạy từ 8:00 đến 14:00. Khách lần lượt xuất hiện theo danh sách 8 khách fixture:

| Thứ tự | Khung giờ in-game | Tên khách | Phân loại | Món gọi | Hành vi & Xử lý |
|---|---|---|---|---|---|
| 1 | 8:30 | Bác Ba | Vãng lai | Bánh mì chả | Đơn thường: Quán tự gắp bánh mì, chả, dưa ngò (1.5s) → Giao món → Khách vui vẻ rời đi (+25k). |
| 2 | 9:15 | Chị Hai | Vãng lai | Trà tắc | Đơn thường: Quán tự rót đá, đường, vắt tắc (1.5s) → Giao món (+15k). |
| 3 | 10:00 | **Bé Tí** | **Khách quen** | Bánh mì chả | **TÌNH HUỐNG 1 — ĐỒNG HỒ TỰ ĐỘNG TẠM DỪNG (PAUSE)**: Bé Tí xin thêm chả ("Chú ơi cho con xin thêm chả nghen!").<br>• Lựa chọn A: *Đồng ý thêm chả* (+1 chả, tốn thêm 5k vốn, Bé Tí cười tít mắt).<br>• Lựa chọn B: *Bán phần thường* (1 chả, Bé Tí vẫn ăn ngoan).<br>→ Sau khi người chơi bấm chọn, đồng hồ tiếp tục chạy. |
| 4 | 10:45 | Cô Tư | Vãng lai | Sữa đậu đá | Đơn thường: Quán tự pha đá, đường, sữa đậu → Giao món (+17k). |
| 5 | 11:15 | — | **Sự Kiện** | Trà tắc | **TÌNH HUỐNG 2 — BIẾN ĐỘNG GIÁ TẮC GIỮA NGÀY (PAUSE)**:<br>Tin tức từ bạn hàng: Tắc ngoài chợ đã vọt lên 3.000đ/trái.<br>• *Phương án A (Giữ giá)*: Giữ giá bán 15k, giữ chân khách, biên lãi các đơn sau giảm.<br>• *Phương án B (Tăng giá)*: Đổi giá bán thành 18k cho các đơn mới phát sinh (khách vãng lai nhạy giá có thể rời đi; đơn cũ giữ nguyên giá).<br>• *Phương án C (Tạm ngừng)*: Tạm dừng nhận món Trà Tắc.<br>*(Lưu ý theo Quyết định 3: Số tắc đã mua trong kho vẫn giữ nguyên giá vốn 2.000đ lúc nhập).* |
| 6 | 11:45 | **Cô Chín** | **Khách quen** | Trà tắc | Đơn thường: Quán tự phục vụ. Cô Chín uống ngụm trà tắc mát lạnh, khen quán pha vừa miệng. |
| 7 | 12:15 | **Anh Tùng** | **Khách quen** | Sữa đậu đá | Tình huống thoại vội ("Đang vội chạy cuốc khách trưa!"). Quán tự phục vụ bình thường, Anh Tùng uống ực một hơi sảng khoái rồi đi làm. Không có mini-game ép thời gian. |
| 8 | 13:00 | Anh Nam | Vãng lai | Bánh mì chả | Đơn thường: Nếu còn nguyên liệu thì hoàn tất; nếu hết hàng thì lịch sự từ chối (ghi nhận missed order không phạt vô lý). |

---

### Phase 3: Đóng Cửa & Đối Soát (Wrap-Up Phase)

Hiển thị sổ tay thu chi minh bạch:

```
📖 SỔ GHI TIỀN QUÁN XÓM NHỎ — NGÀY 1
────────────────────────────────────────────
💵 1. DÒNG TIỀN MẶT TRONG KÉT
   • Tiền vốn mở quầy sáng nay:           60.000đ
   • Chi mua nguyên liệu ở chợ:          -28.000đ
   • Thu tiền bán bánh & nước:           +57.000đ
   • Tiền tip:                                 0đ
   ──────────────────────────────────────────
   👉 TỔNG TIỀN MẶT TRONG KÉT:            89.000đ
   👉 Chênh lệch tiền mặt trong ngày:    +29.000đ

📊 2. BÁO CÁO KẾT QUẢ KINH DOANH (P&L)
   • Doanh thu thuần:                    +57.000đ
   • Giá vốn hàng đã bán (COGS):         -28.000đ
   ──────────────────────────────────────────
   👉 LỢI NHUẬN RÒNG NGÀY 1:              +29.000đ
   • Giá trị nguyên liệu còn tồn kho:          0đ (Bán sạch)
   • Khoản ghi sổ / nợ:                        0đ (Không nợ)

📊 3. LÃI GỘP THEO TỪNG MÓN
   • Bánh Mì Chả:  1 phần (25k) - COGS 16k = +9.000đ (do thêm 1 chả cho Bé Tí)
   • Trà Tắc:      1 phần (15k) - COGS  5k = +10.000đ
   • Sữa Đậu Đá:   1 phần (17k) - COGS  7k = +10.000đ

⭐ 4. TRẠNG THÁI QUÁN (Quyết định 4)
   • Đánh giá: "Quán mới mở · Nhận phản hồi tích cực từ 3 người xóm cũ"
   • Lời nhắn: Bé Tí cười tít mắt vì được chú cho thêm chả; Cô Chín khen trà tắc thanh mát; Anh Tùng cảm ơn ly nước giải khát giữa trưa.

🔧 5. KẾ HOẠCH NGÀY 2 (Quyết định 5)
   • Gợi ý mở rộng: Mối giao trứng gà tươi giá mềm đầu chợ → có thể thêm món Bánh Mì Ốp-La.
   • Xem trước nâng cấp: Rổ đèo hàng xe đạp (+5 sức chở) để chở được nhiều đá hơn cho ngày nắng. (Preview mục tiêu, không trừ tiền Day 1).
```
