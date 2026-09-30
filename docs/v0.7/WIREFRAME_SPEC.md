# ĐẶC TẢ WIREFRAME (WIREFRAME_SPEC.md) — Xóm Nhỏ v0.7 Mobile Portrait

> **Trạng thái**: REVIEW DRAFT v0.7.1 — Thiết kế màn hình dọc điện thoại (Mobile Portrait 390×844).  
> **Nguyên tắc**: Thao tác một tay thuận tiện, touch target tối thiểu 44×44px, không kéo thả phức tạp, giữ trọn visual storybook Việt Nam.

---

## 1. Bản Đồ Điều Hướng (Screen Flow)

```
[Màn 1: HOME]
      │
      ▼
[Màn 2: XÓM ƠI (Tin Xóm & Tín Hiệu Giá)]
      │
      ▼
[Màn 3: CHỢ ĐẦU NGÕ (Nhập Hàng Theo Sức Chở)]
      │
      ▼
[Màn 4: MENU & GIÁ (Đặt Giá & Giờ Mở Cửa)] ───► (Mới bổ sung v0.7)
      │
      ▼
[Màn 5: QUÁN BÁN (Cảnh Quán Tự Động + Popup Tình Huống Tạm Dừng)]
      │
      ▼
[Màn 6: SỔ TỔNG KẾT (Đối Soát Kế Toán + Phản Hồi + Preview Nâng Cấp)]
```

---

## 2. Chi Tiết Wireframe Từng Màn Hình

### Màn 1: Trang Bìa Chào Buổi Sáng (HOME)
- **Khu vực trên (70% chiều cao)**: Tranh nền `title_cover_bg.jpg` đón nắng mai. Tên game **XÓM NHỎ** với font chữ vẽ tay ấm áp.
- **Khu vực dưới (30% chiều cao)**: Hộp card bo tròn với các nút bấm to bản:
  - Nút chính: `[ 🌿 Bắt Đầu Mở Quán Hôm Nay ]` (Height: 52px).
  - Nút phụ: `[ Tiếp tục ngày đang chơi ]` / `[ Chơi lại từ đầu ]`.

---

### Màn 2: Tin Buổi Sớm (XÓM ƠI)
- **Thanh tiêu đề cố định**: Logo quán + Ví tiền hiện tại (`💵 60.000đ`).
- **Nội dung thẻ câu chuyện**:
  - Đoạn văn mô tả không khí buổi sớm (tiếng chổi tre, hoa giấy, nắng oi ả).
  - Khung tin xóm: Lịch ghé của Bé Tí, Cô Chín, Anh Tùng.
  - **Khung cảnh báo giá (Quyết định 3)**: Lời dặn của bạn hàng về trái tắc cuối ngày có thể tăng giá.
- **Nút hành động cố định dưới đáy**: `[ 🛒 Ra Chợ Đầu Ngõ Nhập Hàng ]`.

---

### Màn 3: Chợ Đầu Ngõ (MARKET)
- **Thanh chỉ số trên cùng**:
  - Tiền mặt còn lại: `💵 60.000đ`.
  - Thanh tải trọng xe đạp: `🚲 Sức chở: [ 10 / 15 đơn vị ]` (Có thanh tiến trình trực quan).
- **Danh sách mặt hàng (Cuộn dọc)**:
  - Mỗi hàng gồm: Icon sprite, Tên nguyên liệu, Đơn vị tính, Giá tiền.
  - Bộ nút tăng giảm `[-] [ Số lượng ] [+]` với touch target to bản (min 44px).
  - Cảnh báo trực tiếp ở dòng Tắc tươi: `⚠️ Chiều có thể lên giá`.
- **Thao tác nhanh**: Nút `[ Gói Gợi Ý Day 1 (28k) ]` để người chơi mới bấm 1 chạm là tự xếp đủ giỏ hàng.
- **Đáy màn hình**: Tổng tiền giỏ hàng + Nút `[ 🥖 Mang Hàng Về Mở Quán Ngay! ]`.

---

### Màn 4: Lên Menu & Đặt Giá (DAILY MENU SETUP — Mới v0.7)
- **Mục tiêu**: Người chơi chốt giá bán và giờ mở trước khi đón khách.
- **Danh sách 3 món**:
  - *Bánh Mì Chả*: [Bật bán ✓] | Giá vốn: 11k/ổ | Chọn giá: `( 22k )` `[ ● 25k ● ]` `( 28k )` → Lãi gộp hiển thị tức thời: `+14k/ổ`.
  - *Trà Tắc*: [Bật bán ✓] | Giá vốn: 5k/ly | Chọn giá: `( 12k )` `[ ● 15k ● ]` `( 18k )` → Lãi gộp: `+10k/ly`.
  - *Sữa Đậu Đá*: [Bật bán ✓] | Giá vốn: 7k/ly | Chọn giá: `( 14k )` `[ ● 17k ● ]` `( 20k )` → Lãi gộp: `+10k/ly`.
- **Khung chọn giờ mở cửa**:
  - `[ 🌅 Sớm 6h ]` `[ ● ⏰ Đúng giờ 8h ● ]` `[ 😴 Trễ 10h ]`.
- **Nút mở quán**: `[ 🏪 Bắt Đầu Đón Khách ]`.

---

### Màn 5: Quán Bán Tự Động (SHOP / IDLE SERVICE)
- **Góc nhìn chính**: Phối cảnh quầy quán nhìn ra hẻm phố (`alley_counter_clean.jpg`).
- **Thanh trạng thái trên cùng**:
  - Tên quán | Đồng hồ in-game (`⏰ 09:30 · Giờ đi làm`) | Tốc độ: `[ ▶ x1 ]` `[ ⏩ x2 ]`.
- **Không gian phục vụ (Upper Half)**:
  - Khách hàng ghé đến trước quầy (Bé Tí, Cô Chín, Anh Tùng, khách vãng lai) với đổ bóng tiếp đất (`customer-contact-shadow`).
  - Hàng chờ phía sau hiển thị dạng icon nhỏ trên tường.
  - Bong bóng thoại của khách: Hiện món muốn mua và giá bán.
  - **Thanh tự động chuẩn bị (Auto-prep Bar)**: Khi đơn thường bắt đầu, thanh màu xanh chạy 1.5 giây, icon nguyên liệu lướt vào món ăn hoàn thành.
  - Hiệu ứng nhận tiền: Tiền vàng bay lên `+25.000đ` cùng tiếng leng keng vui tai.
- **Khung Tình Huống Tạm Dừng (Modal Popup khi có sự kiện)**:
  - Khi Bé Tí xin thêm chả hoặc có tin giá tắc: **Màn hình tự động pause đồng hồ**.
  - Hiện bảng hộp thoại nổi bật ở giữa màn hình:
    - *Ảnh nhân vật + Lời thoại*.
    - *2 hoặc 3 nút chọn lựa chọn to bản*.
    - Sau khi bấm, popup biến mất và đồng hồ tiếp tục chạy.
- **Khu vực quầy dưới (Lower Half)**:
  - Hiển thị khay tồn kho thực tế: `🥖 1` `🍖 2` `🥒 1` `🧊 2` `🍯 2` `🍊 1` `🥛 1` (Chỉ số giảm dần theo từng đơn auto-service).
  - Không còn khay bấm tay thủ công hay nút COMMIT ép buộc.
  - Nút `[ Đóng Quán ]` (chỉ sáng khi hết khách hoặc muốn chốt ca sớm).

---

### Màn 6: Sổ Ghi Tiền & Đối Soát Cuối Ngày (DAY RESULT)
- **Phong cách**: Cuốn sổ tay kẻ ngang mộc mạc đặc trưng Sài Gòn.
- **Các khối nội dung**:
  1. *Khối Tiền Mặt*: Vốn đầu ngày (60k) - Mua hàng chợ (28k) + Thu bán hàng (57k) = **89.000đ trong két**.
  2. *Khối Kinh Doanh (P&L)*: Doanh thu (57k) - COGS hàng đã bán (28k) = **Lợi nhuận ròng +29.000đ**.
  3. *Khối Tồn Kho & Hao Hụt*: Giá trị hàng dư (nếu có) được liệt kê riêng, không tính lẫn vào chi phí vốn.
  4. *Khối Lãi Gộp Từng Món*: Hiển thị rõ số lượng và số tiền lời từ Bánh mì, Trà tắc, Sữa đậu.
  5. *Khối Trạng Thái Đánh Giá*: Hiển thị nhận xét đầu tiên của người xóm sau ngày mở đầu.
  6. *Khối Preview Nâng Cấp (Quyết định 5)*: Xem trước hình ảnh rổ đèo hàng xe đạp hoặc giàn che nắng cho ngày mai (chỉ mang tính định hướng, không trừ tiền).
- **Nút bấm cuối màn hình**: `[ 🔄 Mở Quán Chơi Lại ]` hoặc `[ ▶️ Tiếp Tục Ngày Sau ]`.
