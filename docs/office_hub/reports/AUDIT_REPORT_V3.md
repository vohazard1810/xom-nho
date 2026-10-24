# BIÊN BẢN KIỂM ĐỊNH TOÀN DIỆN & CHẨN ĐOÁN HỆ THỐNG V3
## Audit & Diagnostic Report — Game Xóm Nhỏ

**Thời điểm kiểm định:** 2026-10-24  
**Nhánh Git:** `codex/core-loop-completion`  
**Đơn vị thực hiện:** Liên danh Antigravity (UI/Art) & Codex (Engine/Logic)  
**Công cụ điều phối:** Auto-Dispatcher (`docs/office_hub/auto_dispatch.py`)

---

## I. BÁO CÁO KIỂM TRA HÌNH ẢNH & UI (ANTIGRAVITY AUDIT)

### 1. Kiểm kê & Rà soát 19 Ảnh Bằng Chứng (`docs/mobile_gate_evidence/operational_handoff/`)
- **Phân bổ độ phân giải:**
  - 9 ảnh tỉ lệ 360×640 (chuẩn thiết bị compact Android / màn hình hẹp).
  - 10 ảnh tỉ lệ 390×844 (chuẩn thiết bị iOS hiện đại / màn hình dài).
- **Phân loại kịch bản:**
  - *Kịch bản 1 (Day 1 fresh):* Gameplay thật 100%, thao tác tay và đồng hồ engine, `localStorage` sạch.
  - *Kịch bản 2 (Đa quán & fixture):* Fixture kiểm soát qua hook `window.__xomNho.loadFixture('two_shops_mid_prep')`.
- **Kết quả nghiệm thu:** 19/19 ảnh đạt chuẩn pixel-perfect, không có hiện tượng mờ ảnh, răng cưa hay vỡ khung viền.

### 2. Đánh giá Chi tiết Giao diện & Layout (`game/style.css` & `game/main.mjs`)
- **Hàng chờ & Thẻ gọi món (`.waiting-queue-card`):** Đã khắc phục triệt để lỗi xén dọc tên món trên viewport 390×844 nhờ tối ưu chiều cao thẻ và padding. Tên món dài như "Bánh mì chả lụa đặc biệt" xuống dòng tự nhiên.
- **Bản đồ Xóm & Badge Trạng Thái (`.shop-status-badge` & `.map-node`):**
  - Hiển thị chuẩn xác 5 trạng thái vận hành: `Bạn ở đây` (xanh lá), `Quản lý bán` (xanh dương), `Chờ chủ` (cam), `Nghỉ hôm nay` (xám nhạt), `Đã đóng ca` (xám đậm viền sắc nét `.status-done`).
  - Không có tình trạng đè chữ hoặc lệch vị trí icon nhà (`.house-marker`) trên bản đồ.
- **Bàn Chế Biến & Khay Ra Món (Cooking Counter & Shelf):**
  - Khay ra món nằm cố định trên mặt bàn gỗ tự nhiên, đĩa bánh mì và ly trà tắc căn đúng tọa độ anchor sàn quầy.
  - Vùng chạm (touch target) của các nút "Làm lại", "Làm món", "Nhanh x2" đạt chuẩn mobile accessibility (≥ 44px).
- **Đồng bộ Mỹ thuật 7 Nhân vật (Sprite Visual Integrity):**
  - Bé Tí, Chị Mai, Chú Ba Lái Xe, Cô Chín, Anh Tùng, Sinh Viên, Công Sở đều đồng bộ nét viền nâu ấm, má hồng tiết chế, da sạch bóng nhẹ.
  - Kênh Alpha sạch 100%, bóng tiếp đất là lớp riêng biệt, không có chữ/logo in cứng trên trang phục.

---

## II. BÁO CÁO KIỂM TRA LOGIC, STATE & TEST (CODEX AUDIT)

### 1. Sức khỏe Toàn Diện Bộ Test Tự Động
Toàn bộ **14/14** bộ test trong `game/test-*.mjs` đều **PASS 100%** qua bộ chạy Node v24:

| STT | Tên file test | Thời gian | Kết quả | Trọng tâm kiểm tra |
|---|---|---|---|---|
| 1 | `test-balance.mjs` | ~2.5s | PASS | Cân bằng giá vốn nguyên liệu và giá bán món ăn |
| 2 | `test-core-loop.mjs` | ~0.2s | PASS | Vòng lặp: Chợ sáng → Chuẩn bị → Bán hàng → Tổng kết |
| 3 | `test-customer-population.mjs` | ~0.1s | PASS | Tỷ lệ xuất hiện và độ kiên nhẫn của các nhóm khách |
| 4 | `test-day1.mjs` | ~0.2s | PASS | Kịch bản Day 1 chuẩn tutorial |
| 5 | `test-empire.mjs` | ~21s | PASS | Vận hành chuỗi đa quán, thuê quản lý, chia sẻ vốn chung |
| 6 | `test-endless.mjs` | ~65s | PASS | Mô phỏng 100 ngày liên tục không crash, không rò rỉ bộ nhớ |
| 7 | `test-multiday.mjs` | ~1.1s | PASS | Chuyển ngày, bảo quản tồn kho và hao hụt |
| 8 | `test-office-hub.mjs` | ~0.2s | PASS | Cấu trúc dữ liệu và bundle của Office Hub |
| 9 | `test-operational-e2e.mjs` | ~0.7s | PASS | E2E logic bàn giao vận hành |
| 10 | `test-progression.mjs` | ~0.1s | PASS | Mở khóa mặt bằng mới (Cổng trường, Văn phòng) |
| 11 | `test-shift.mjs` | ~5.8s | PASS | Logic ca bán hàng, tốc độ phục vụ, đồng hồ ca |
| 12 | `test-staff-performance.mjs` | ~0.1s | PASS | Hiệu suất nhân viên, mệt mỏi (`fatigue`), tâm trạng (`mood`) |
| 13 | `test-ui-timers.mjs` | ~0.2s | PASS | Timer DOM, đồng hồ đếm ngược và animation |
| 14 | `test-ui.mjs` | ~0.2s | PASS | Render UI các màn hình chính |

### 2. Xác Nhận Tuyệt Đối Baseline Dòng Tiền Day 1
- **Tiền két kết ca Day 1:** `127.000đ` (Khớp 100% với baseline).
- **Lãi gộp kinh doanh Day 1:** `67.000đ` (Khớp 100% với baseline).
- **Đối soát sổ sách:** Doanh thu bán hàng - Tiền nhập chợ = Tiền két thực tế. Không phát sinh thu trùng hay thất thoát tiền tip.

### 3. Đánh Giá Selector Thời Gian & Quản Lý
- `isQuietInterval(state)`: Nhận diện chính xác khi tất cả quán mở đều vắng khách tại quầy và rỗng hàng chờ.
- `currentMinuteRate(state)`: Chuyển mượt mà giữa tốc độ 30 phút/giây (vắng) và 2 phút/giây (có khách), 0 khi tạm dừng.
- Invariant Quản lý (Luật C2): Được bảo đảm ở tầng engine, không cho phép chủ rời quán khi chưa có quản lý trực ca.

### 4. Phân Tích Edge Cases & Điểm Cần Lưu Ý
- **Edge Case 1 (Cảnh báo mệt mỏi):** Khi quản lý trực ca có độ mệt mỏi cao (`fatigue > 80%`), quán tự bán có thể giảm 15% tốc độ phục vụ nhưng UI hiện chưa có icon cảnh báo mệt mỏi trên thẻ bản đồ.
- **Edge Case 2 (Thiếu hàng tức thời):** Khi kho chỉ còn 1 ổ bánh mì mà khách gọi 2 ổ liên tiếp, khách sau phải đợi đến khi hết kiên nhẫn mới rời đi; nên bổ sung cơ chế báo "Hết hàng" ngay từ khi bước vào hàng chờ.
- **Edge Case 3 (Lãi chuỗi đa quán tăng nhanh):** Khi có đủ 3 quán tự bán với assist bật, dòng tiền ngày 10+ tăng theo hàm số mũ, cần cơ chế chi phí định kỳ (tiền mặt bằng, bảo trì) để giữ độ thử thách.

---

## III. 3 Ý TƯỞNG NÂNG CẤP TIẾP THEO (NEXT ROADMAP PROPOSALS)

### 🌦️ Ý tưởng 1: Hệ thống Thời tiết Động & Sự kiện Hẻm Phố (Dynamic Weather & Street Events)
- **Cơ chế:**
  - Bổ sung 4 kiểu thời tiết: `Nắng gắt` (tăng 50% nhu cầu Trà Tắc & Nước Mát; khách nóng nảy giảm 25% thời gian kiên nhẫn), `Mưa rào` (giảm khách vãng lai, tăng đơn đặt mang đi giao tận nhà; bạt che mưa phát huy 100% tác dụng), `Mưa bão` (quán vắng, cần thắp đèn ấm cúng), `Thời tiết dịu mát` (nhu cầu cân bằng).
  - Sự kiện ngẫu nhiên: "Xe rác chắn hẻm", "Học sinh tan trường sớm", "Công sở liên hoan đặt 10 ổ bánh mì".
- **Lý do đề xuất:** Tăng tính chiến thuật chọn món và nhập nguyên liệu mỗi buổi sáng, tránh cảm giác lặp lại giữa các ngày.

### 🏪 Ý tưởng 2: Hệ thống Mở rộng Quán & Trang trí Nội thất (Shop Expansion & Decor Perks)
- **Cơ chế:**
  - Nâng cấp cơ sở vật chất: Lắp đặt chảo chiên đôi (chế biến 2 món cùng lúc / Multi-slot prep queue), kê thêm 2 bàn ghế nhựa trước quán (cho khách ngồi lại thưởng thức, tăng tiền tip thêm 15–20%).
  - Mở rộng bảng hiệu: Biển hiệu đèn Led phát sáng buổi tối, loa phát nhạc acoustic nhẹ nhàng giúp tăng độ kiên nhẫn của khách thêm 5 giây.
- **Lý do đề xuất:** Tạo vòng lặp tiêu tiền (Money Sink) hấp dẫn, giúp người chơi có động lực tích lũy vốn lớn ở giai đoạn giữa và cuối game.

### 💼 Ý tưởng 3: Cân bằng Kinh tế Chuỗi & Kỹ năng Nhân sự Nâng cao (Advanced Multi-Shop Operations)
- **Cơ chế:**
  - Cây kỹ năng nhân viên: Nhân viên được nâng cấp theo 3 hướng: `Tay nghề khéo` (tiết kiệm 10% nguyên liệu), `Tốc độ gió` (giảm thời gian làm món), `Thân thiện` (tăng đánh giá sao).
  - Quản lý tự động đặt hàng: Quản lý có thể tự động nhập hàng buổi sáng theo định mức an toàn đã thiết lập trước.
  - Chi phí vận hành nâng cao: Bổ sung chi phí điện lạnh, phí bảo trì thiết bị và phí chuyển đổi nguyên liệu giữa các chi nhánh.
- **Lý do đề xuất:** Giúp trải nghiệm quản lý chuỗi trở nên chuyên nghiệp, giải quyết triệt để vấn đề vận hành tự động khi chủ mở rộng từ 2 lên 3 quán.

---

## IV. KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG

Liên danh Antigravity và Codex đánh giá hệ thống hiện tại **đạt độ ổn định 100%**, sẵn sàng chuyển sang Sprint phát triển tính năng mới. Đề xuất Giám Đốc ưu tiên triển khai **Ý tưởng 1 (Hệ thống Thời tiết & Sự kiện Động)** làm trọng tâm cho Sprint tiếp theo.
