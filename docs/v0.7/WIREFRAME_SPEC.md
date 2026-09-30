# ĐẶC TẢ WIREFRAME (WIREFRAME_SPEC.md) — Xóm Nhỏ v0.7 Mobile Portrait

> **Trạng thái**: REVIEW DRAFT v0.7.2 — Thiết kế màn hình dọc điện thoại (Mobile Portrait 390×844).  
> **Nguyên tắc**: Thao tác một tay thuận tiện, touch target tối thiểu 44×44px, không kéo thả phức tạp, giữ trọn visual storybook ấm áp của con hẻm Sài Gòn.

---

## 1. Bản Đồ Điều Hướng (Screen Flow)

```
[Màn 1: HOME]
      │
      ▼
[Màn 2: XÓM ƠI (Tin Xóm Buổi Sớm & Tín Hiệu Thị Trường)]
      │
      ▼
[Màn 3: CHỢ ĐẦU NGÕ (Nhập Hàng Theo Sức Chở Xe Đạp 20 Đơn Vị)]
      │
      ▼
[Màn 4: MENU & GIÁ (Mở Bán 3 Slots Khởi Đầu & Đặt Giá)]
      │
      ▼
[Màn 5: QUÁN BÁN (Cảnh Quán Tự Động + Storyboard Bếp + Modal Pause Khi Có Tình Huống)]
      │
      ▼
[Màn 6: SỔ TỔNG KẾT (Đối Soát Kế Toán Minh Bạch + Nhận Xét + Preview Nâng Cấp Day 2)]
```

---

## 2. Chi Tiết Wireframe Từng Màn Hình

### Màn 1: Trang Bìa Chào Buổi Sáng (HOME)
- **Khu vực trên (70% chiều cao)**: Tranh nền `title_cover_bg.jpg` đón nắng mai. Tên game **XÓM NHỎ** với font chữ vẽ tay mộc mạc.
- **Khu vực dưới (30% chiều cao)**: Hộp card bo tròn với các nút bấm to bản:
  - Nút chính: `[ 🌿 Bắt Đầu Mở Quán Hôm Nay ]` (Height: 52px).
  - Nút phụ: `[ Tiếp tục ngày đang chơi ]` / `[ Chơi lại từ đầu ]`.

---

### Màn 2: Tin Buổi Sớm (XÓM ƠI)
- **Thanh tiêu đề cố định**: Logo quán + Ví tiền hiện tại (`💵 60.000đ`).
- **Nội dung thẻ câu chuyện**:
  - Đoạn văn mô tả không khí buổi sớm (tiếng chổi tre, hoa giấy, nắng oi ả).
  - Khung tin xóm: Lịch ghé của Bé Tí, Cô Chín, Anh Tùng.
  - **Khung tin tức thị trường (Quyết định 2 & 3)**: Lời dặn của bà Sáu về giá tắc chiều có thể khan hàng, chuẩn bị tinh thần cho Day 2.
- **Nút hành động cố định dưới đáy**: `[ 🛒 Ra Chợ Đầu Ngõ Nhập Hàng ]`.

---

### Màn 3: Chợ Đầu Ngõ (MARKET)
- **Thanh chỉ số trên cùng**:
  - Tiền mặt trong két: `💵 60.000đ`.
  - Thanh tải trọng xe đạp: `🚲 Sức chở: [ 19 / 20 đơn vị ]` (Có thanh tiến trình trực quan).
- **Danh sách mặt hàng (Cuộn dọc)**:
  - Mỗi hàng gồm: Icon sprite watercolor, Tên nguyên liệu, Đơn vị tính, Giá tiền.
  - Bộ nút tăng giảm `[-] [ Số lượng ] [+]` với touch target to bản (min 44px).
  - Cảnh báo trực tiếp ở dòng Tắc tươi: `⚠️ Chiều có thể lên giá`.
- **Thao tác nhanh**: Nút `[ Gói Gợi Ý Day 1 (55k · 19 đơn vị) ]` để người chơi mới bấm 1 chạm là tự xếp đủ giỏ hàng phục vụ 6 khách.
- **Đáy màn hình**: Tổng tiền giỏ hàng (`55.000đ`) + Nút `[ 🥖 Mang Hàng Về Mở Quán Ngay! ]`.

---

### Màn 4: Lên Menu & Đặt Giá (DAILY MENU SETUP — 3 Slots Khởi Đầu)
- **Mục tiêu**: Người chơi chốt giá bán cho **3 slot quầy khởi đầu** trước khi đón khách:
  - *Slot 1 — Bánh Mì Chả*: [Bật bán ✓] | Giá vốn: 11k/ổ | Chọn giá: `( 22k )` `[ ● 25k ● ]` `( 28k )` → Lãi gộp: `+14k/ổ`.
  - *Slot 2 — Trà Tắc*: [Bật bán ✓] | Giá vốn: 5k/ly | Chọn giá: `( 12k )` `[ ● 15k ● ]` `( 18k )` → Lãi gộp: `+10k/ly`.
  - *Slot 3 — Sữa Đậu Đá*: [Bật bán ✓] | Giá vốn: 7k/ly | Chọn giá: `( 14k )` `[ ● 17k ● ]` `( 20k )` → Lãi gộp: `+10k/ly`.
  *(Nâng cấp ở Day 2 sẽ mở thêm Slot 4 để bán món Bánh Mì Ốp-La).*
- **Khung chọn giờ mở cửa**:
  - `[ 🌅 Sớm 6h ]` `[ ● ⏰ Đúng giờ 8h ● ]` `[ 😴 Trễ 10h ]`.
- **Nút mở quán**: `[ 🏪 Bắt Đầu Đón Khách ]`.

---

### Màn 5: Quán Bán Tự Động (SHOP / IDLE SERVICE) & STORYBOARD BẾP

Layout màn hình dọc kết hợp hài hòa giữa không gian phố và quầy chế biến:

```
┌──────────────────────────────────────┐
│ [XÓM NHỎ | ⏰ 10:00 · Trưa | 💵 80k]  │  ← Thanh trạng thái & Đồng hồ in-game
├──────────────────────────────────────┤
│ ╔══════════════════════════════════╗ │
│ ║  CẢNH PHỐ & CỬA SỔ QUÁN (50%)    ║ │  ← Nền alley_counter_clean.jpg
│ ║                                  ║ │
│ ║   [Hàng chờ: 👤 👤 👤]            ║ │  ← Khách đang chờ ngoài hẻm
│ ║                                  ║ │
│ ║          [ 👧 Bé Tí ]            ║ │  ← Khách đang đứng ở quầy (có bóng đổ)
│ ║    ┌──────────────────────────┐  ║ │
│ ║    │ "Cho con ổ thêm chả nha!"│  ║ │  ← Bong bóng thoại
│ ║    └──────────────────────────┘  ║ │
│ ║ ════════════════════════════════ ║ │  ← Bậu gỗ cửa sổ (counter-sill-bar)
│ ╚══════════════════════════════════╝ │
│                                      │
│ ╔══════════════════════════════════╗ │
│ ║  QUẦY BẾP TỰ ĐỘNG CHẾ BIẾN (32%) ║ │  ← STORYBOARD VẬT LÝ ĐỒNG BỘ ART STYLE
│ ║  [ Thớt Gỗ / Ly Thủy Tinh Mờ ]   ║ │
│ ║                                  ║ │
│ ║  (Quá trình tự làm diễn ra 1.5s  ║ │
│ ║   với animation vật lý từng lớp, ║ │
│ ║   không dùng icon trôi nổi)      ║ │
│ ╚══════════════════════════════════╝ │
│                                      │
│ ┌── TỒN KHO & ĐIỀU KHIỂN (18%) ────┐ │
│ │ 🥖:1  🍖:1  🥒:1  🧊:2  🍯:2  🍊:1│ │  ← Số lượng nguyên liệu giảm dần
│ │ [ ▶ x1 ]  [ ⏩ x2 ]   [ Đóng Quán]│ │  ← Điều khiển tốc độ & kết thúc ca
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

#### STORYBOARD QUÁ TRÌNH TỰ PHỤC VỤ (AUTO-PREP STORYBOARD)
Thay vì dùng icon lướt vào món ăn, quá trình tự phục vụ thể hiện bằng **hình ảnh quầy bếp thực tế đồng bộ phong cách Watercolor Storybook Việt Nam**:

1. **Đơn Bánh Mì Chả (1.5 giây)**:
   - *0.0s – 0.4s*: Ổ bánh mì vàng ươm, nóng giòn tự động mở sẵn trên thớt gỗ sồi mộc mạc.
   - *0.4s – 0.9s*: Lát chả lụa hồng hào (hoặc 2 lát nếu là Bé Tí thêm chả) đặt gọn gàng vào thân bánh kèm tiếng "xực" nhẹ vui tai.
   - *0.9s – 1.3s*: Cọng ngò rí và dưa leo xanh giòn điểm xuyết lên trên.
   - *1.3s – 1.5s*: Ổ bánh mì gói nhẹ trong nửa tờ giấy báo buộc thun, đẩy lên bậu gỗ quầy. Khách nhận món, mỉm cười và rời đi. Tiền vàng bay lên `+25.000đ`.

2. **Đơn Trà Tắc / Sữa Đậu Đá (1.5 giây)**:
   - *0.0s – 0.4s*: Ly thủy tinh đọng sương mát lạnh xuất hiện trên khay inox.
   - *0.4s – 0.8s*: Đá bi rơi lách cách vào ly cùng tiếng leng keng trong trẻo.
   - *0.8s – 1.2s*: Nước đường mật ong sánh mịn hòa cùng nước cốt tắc vàng tươi (hoặc sữa đậu nành trắng béo bùi dâng đầy ly).
   - *1.2s – 1.5s*: Lát tắc tươi gài miệng ly (hoặc ống hút tre cắm vào), đẩy nhẹ sang tay khách. Tiền bay lên `+15.000đ` hoặc `+17.000đ`.

---

### Màn 6: Sổ Ghi Tiền & Đối Soát Cuối Ngày (DAY RESULT)
- **Giao diện**: Trang sổ kẻ ngang mộc mạc.
- **Nội dung hạch toán minh bạch**:
  1. *Dòng tiền mặt*: Vốn đầu ngày (60k) - Mua chợ (55k) + Thu bán hàng (122k) = **127.000đ trong két** (+67.000đ chênh lệch).
  2. *Kết quả kinh doanh (P&L)*: Doanh thu (122k) - COGS (55k) = **Lợi nhuận gộp +67.000đ**. Tồn kho: 0đ.
  3. *Lãi gộp theo món*: Bánh mì chả (+37k), Trà tắc (+20k), Sữa đậu đá (+10k).
  4. *Đơn bỏ lỡ*: 2 đơn (Cô Bảy, Chú Tư hết hàng).
  5. *Đánh giá quán*: Nhận xét thực tế từ Bé Tí, Cô Chín, Anh Tùng.
  6. *Preview nâng cấp Day 2*: Rổ đèo hàng xe đạp (sức chở 30 đơn vị) và mối trứng gà giao bánh mì ốp-la.
- **Nút bấm**: `[ 🔄 Mở Quán Chơi Lại ]` hoặc `[ ▶️ Tiếp Tục Ngày Sau ]`.
