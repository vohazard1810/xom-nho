# XÓM NHỎ — BÁO CÁO NGHIỆM THU MOBILE GATE 7 NGÀY & ĐỐI SOÁT KỸ THUẬT (V2)

> **Ngày thực hiện**: 01/10/2026  
> **Môi trường thử nghiệm**: Microsoft Edge Chromium (v140+), Viewport 390 × 844 px (Mobile Portrait)  
> **Nhánh Git**: `codex/v07-idle-qc-fixes`  
> **Kết quả Gate tự động**: **PASS 100% (7/7 Ngày)**  
> **Tệp kết quả gốc**: [`docs/mobile_gate_evidence/mobile_gate_7day.json`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/mobile_gate_7day.json)

---

## 1. DỮ LIỆU GATE 7 NGÀY CHI TIẾT

```json
{
  "status": "PASS",
  "viewport": { "width": 390, "height": 844 },
  "started": "2026-10-01T10:47:09.359760",
  "days": [
    { "day": 1, "seconds": 53.03, "served": 6, "missed": 2, "cash": 127000, "rating": 3.0, "touchChecks": 37 },
    { "day": 2, "seconds": 51.24, "served": 6, "missed": 1, "cash": 164000, "rating": 3.5, "touchChecks": 40 },
    { "day": 3, "seconds": 63.19, "served": 10, "missed": 2, "cash": 278000, "rating": 4.0, "touchChecks": 40 },
    { "day": 4, "seconds": 65.12, "served": 10, "missed": 3, "cash": 393000, "rating": 4.0, "touchChecks": 40 },
    { "day": 5, "seconds": 69.35, "served": 10, "missed": 5, "cash": 505000, "rating": 4.0, "touchChecks": 41 },
    { "day": 6, "seconds": 69.16, "served": 10, "missed": 5, "cash": 611000, "rating": 4.0, "touchChecks": 43 },
    { "day": 7, "seconds": 74.78, "served": 10, "missed": 8, "cash": 720000, "rating": 4.0, "touchChecks": 41 }
  ],
  "errors": [],
  "imageFailures": []
}
```

- **Lỗi JS Runtime Console**: 0 error.
- **Lỗi Tải Ảnh**: 0 broken asset / 404 (bao gồm toàn bộ asset nhân vật, món ăn, bối cảnh và lớp quầy mới).
- **Tổng số ảnh chụp màn hình bằng chứng**: **31 ảnh PNG** chuẩn trong thư mục gốc `docs/mobile_gate_evidence/`.
- **Video playtest 7 ngày liên tục**: [`docs/mobile_gate_evidence/mobile_gate_7day_playtest.webm`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/mobile_gate_7day_playtest.webm) (~42 MB).

---

## 2. PHÂN TÍCH CHUYÊN SÂU: HIỆN TƯỢNG DAY 7 PHỤC VỤ 10/18 KHÁCH

Trong kết quả Day 7, quán phục vụ thành công 10 khách nhưng bỏ lỡ 8 khách (`missed: 8`), tuy nhiên sao quán vẫn đạt mức cao **4.0 sao**:

### Nguyên nhân gốc: Nút thắt công suất vật lý (Physical Capacity Bottleneck)
1. **Sức chứa của giỏ xe**: Quán đã nâng cấp giỏ xe đạp cấp 1 (`bike_basket = 1`), đưa giới hạn sức chở lên tối đa **30 đơn vị nguyên liệu** (`vehicleCapacity = 30`).
2. **Tiêu hao nguyên liệu theo định lượng**:
   - 1 ổ Bánh mì chả = 1 bánh + 1 chả + 1 dưa = **3 đơn vị**.
   - 1 ly Trà tắc = 1 đá + 1 đường + 1 tắc = **3 đơn vị**.
   - 1 ly Sữa đậu = 1 đá + 1 đường + 1 sữa đậu = **3 đơn vị**.
3. **Giới hạn số phần ăn tối đa**: Với 30 đơn vị nhập được vào buổi sáng, quán chỉ có thể chế biến tối đa:
   $$\text{Số món tối đa} = \frac{30 \text{ đơn vị}}{3 \text{ đơn vị/món}} = 10 \text{ phần ăn}$$
4. Sau khi phục vụ hết 10 khách đầu tiên, toàn bộ kho hàng sạch bóng (hết hàng hoàn toàn). 8 lượt khách sau ghé quán vào buổi trưa/chiều đều không mua được do quán hết sạch đồ ăn.

### Nhận định trải nghiệm:
- **Không phải thất bại phục vụ**: 10 khách mua được hàng đều được phục vụ nhanh chóng, đúng giá, tạo doanh thu kỷ lục và giữ sao quán ở mức 4.0.
- **Tín hiệu thiết kế**: Đây là nút thắt kinh điển để thúc đẩy người chơi tích lũy vốn mở khóa **Thùng Hàng Xe Máy** hoặc **Xe Ba Gác** trong giai đoạn tiếp theo (Day 8–15).

---

## 3. KIỂM TOÁN VÙNG CHẠM MOBILE (TOUCH TARGETS & REACHABILITY)

- Tổng số lượt kiểm tra qua 7 ngày: **282 lượt kiểm tra nút tương tác**.
- Tỷ lệ đạt chuẩn kích thước $\ge 44 \times 44$ px: **100% (282/282)**.
- **Lưu ý đối soát chuyên môn**: Phép đo tự động sử dụng `document.elementFromPoint` kiểm tra tính hợp lệ hình học và không bị che khuất trong cây DOM. Mặc dù đây là bảo chứng kỹ thuật vững chắc không có nút nào bị co cụm hay nằm ngoài màn hình, việc cảm nhận độ nảy và độ với của ngón tay cái người dùng (ergonomic reachability) vẫn sẽ tiếp tục được thử nghiệm trên thiết bị Android/iOS vật lý trước khi phát hành.

---

## 4. BỘ ẢNH SHOWCASE PILOT THỰC TẾ TRÊN MÀN HÌNH QUÁN 390×844

Toàn bộ ảnh chụp thực tế và video ca bán tự nhiên của đợt Pilot đã được lưu trữ tại thư mục [`docs/mobile_gate_evidence/pilot/`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot):

1. **Em Nam (Học sinh)**: [`pilot_01_walkin_student.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_01_walkin_student.png) — Chuẩn 2 cánh tay, đứng sau gờ quầy, chân che tự nhiên, bóng thoại dạt phải.
2. **Chị Mai (Văn phòng)**: [`pilot_02_walkin_office.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_02_walkin_office.png) — Dáng công sở thanh lịch, đứng sau quầy.
3. **Chú Bảy (Tài xế xe ôm)**: [`pilot_03_walkin_driver.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_03_walkin_driver.png) — Áo gió xanh, nón bảo hiểm, vắt khăn lau mồ hôi.
4. **Bác Năm (Tập thể dục)**: [`pilot_04_walkin_elder.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_04_walkin_elder.png) — Quạt nan, quần đũi, nét mặt đôn hậu.
5. **Trao Bánh Mì**: [`pilot_05_staff_handoff_banhmi.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_05_staff_handoff_banhmi.png) — Đôi tay trao ổ bánh mì bọc giấy buộc thun đỏ.
6. **Trao Thức Uống**: [`pilot_05_staff_handoff_drink.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_05_staff_handoff_drink.png) — Đôi tay trao ly trà tắc quai xách chữ T mát lạnh.
7. **Video Ca Bán Tự Nhiên**: [`pilot_natural_shift.webm`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_natural_shift.webm) — Ca bán tự động với cả đơn bánh mì và trà tắc/sữa đậu, animation trao món xuất hiện chính xác theo từng loại món.
