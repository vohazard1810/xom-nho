# Báo Cáo Hoàn Thiện Giao Diện Vận Hành & Bàn Giao UI (Codex Handoff)

> Nguồn: bản sao báo cáo bàn giao UI của Antigravity, chuyển vào repo ngày 2026-10-24. Đường dẫn ảnh đã đổi sang tương đối.


**Nhánh**: `codex/core-loop-completion`  
**Commit cơ sở**: [`c035ccf`](https://github.com/vohazard1810/xom-nho/commit/c035ccf80a5bb081886aaf4ed8155aec31588842)  
**Commit giao diện**: [`7e024a6`](https://github.com/vohazard1810/xom-nho/commit/7e024a62c2dfc6eca50d59e66dfe1e48a97f919f)  
**Trạng thái**: Đã đẩy lên `origin/codex/core-loop-completion` (không merge `main`, giữ nguyên engine, kinh tế và bộ art 7 nhân vật).

---

## 1. Tóm tắt các hạng mục UI đã thực hiện

### 1.1 Phân biệt 4 trạng thái quán trên bản đồ & giao diện quản lý
- **Bổ sung 4 badge trạng thái trực quan**:
  - `status-owner` (Xanh lá `#15803d`): **Bạn đang đứng bán** (kèm số nhân viên hỗ trợ nếu có).
  - `status-managed` (Xanh dương `#1d4ed8`): **Quản lý đang tự bán** — ghi nhận rõ ràng đích danh quản lý thực tế (ví dụ: *Quản lý Chị Linh đang tự bán · 1 nhân sự trực*), hoàn toàn dựa vào dữ liệu nhân sự thực tế, không bịa thêm bonus doanh thu hay năng suất ảo.
  - `status-waiting` (Cam hổ phách `#d97706`): **Chờ chủ** — quán có thể mở nhưng chưa có người đứng quầy.
  - `status-closed` (Xám chì `#64748b`): **Nghỉ hôm nay** — đóng cửa nghỉ ngơi/bảo dưỡng.
- Đồng bộ viền và bóng của các node trên bản đồ khớp với trạng thái tương ứng.

### 1.2 Chỉ báo tăng tốc khoảng vắng (Quiet Interval Cue)
- Bổ sung pill nhẹ nhàng trong thanh điều hướng trên cùng (`.top-nav`):
  `<span class="quiet-accel-pill">⚡ Vắng khách · giờ chạy nhanh</span>`
- **Điều kiện kích hoạt**: Chỉ hiển thị khi đang trong ca (`SHOP`), không bị tạm dừng (`!isPaused && !manualPaused`), và không có bất kỳ quán nào đang mở có khách tại quầy hoặc khách trong hàng chờ.
- **Vị trí an toàn**: Nằm gọn trong thanh điều hướng, tuyệt đối không che khuôn mặt nhân vật, thớt làm món, khay nguyên liệu hay các nút bấm thao tác.

### 1.3 Nhãn khách quen (`★ Khách quen`)
- Bổ sung class `.ticket-regular-badge` với `flex-shrink: 0`, căn lề và padding hợp lý.
- Giữ nguyên cỡ chữ tên món tối thiểu 16px, pill số lượng, badge xin thêm chả (`+ Chả`) và checklist thao tác mà không bị co ép hay rớt dòng bất thường trên cả hai viewport 360×640 và 390×844.

### 1.4 Màn hình tổng kết danh mục quán (`renderEmpireResult`)
- Hiển thị đầy đủ số khách phục vụ/tổng khách (`6/8 khách`, `4/4 khách`), doanh thu, giá vốn, chi phí và **kết quả sau chi phí** (lãi/lỗ ròng của từng chi nhánh).
- Bổ sung khối **Gợi ý vận hành** (`💡 Gợi ý vận hành:`) hiển thị tối đa 3 đề xuất theo nguyên nhân cụ thể (thiếu hàng, phục vụ chậm, giá bán, nhân sự kiệt sức...). Nhấn mạnh rõ ràng: *thiếu hàng do hạn mức nhập hoặc sức chở, không phải lỗi nhân viên*.
- **Sổ tiền chi tiết** (`#day-ledger-details`): Mặc định đóng (`details` collapsed), người chơi có thể bấm mở để xem đối soát tiền két và các dòng thu/chi.
- **Bảo toàn nguyên tắc quản lý**: Tuyệt đối không có nút kỷ luật hay phạt nhân viên.

---

## 2. Kết quả kiểm thử E2E trên trình duyệt (Playwright)

### Kịch bản 1: Day 1 từ Onboarding đến Tổng kết bằng tương tác chuột thật (360×640)
- **Chuỗi thao tác**: Đặt tên quán (`Quán Đầu Hẻm`) → Xem bảng tin sáng Xóm Ơi → Mua gói nguyên liệu Ngày 1 tại Chợ → Bật bán món tại Thực đơn → Vào ca bán hàng.
- **Thao tác nấu & bán**:
  - Chế biến tay hoàn chỉnh qua từng bước: chọn nguyên liệu → bấm Làm món → bấm Giao khách cho toàn bộ 6 khách đầu ca.
  - Xử lý popup quyết định `EXTRA_CHA` của Bé Tí (chọn bán phần thường để bảo toàn kho).
  - Ca kết thúc tự động lúc `clock=337.4` khi hết khách và đạt giờ đóng cửa.
- **Đối soát tài chính**:
  - Tiền két cuối ca: **127.000đ** (khớp 100% với baseline Codex: *Day 1 vẫn 127k két / 67k lãi*).
  - Vốn đầu ngày: **60.000đ**, biến động tiền mặt: **+67.000đ**.
  - Không có lỗi console (`console_errors: []`).

### Kịch bản 2: Vận hành đa chi nhánh có kiểm soát (360×640 & 390×844)
- Kiểm tra hiển thị trạng thái chuyển giao giữa ca:
  - Quán Nhà (`home`): Trạng thái `Bạn đang đứng bán` (Chủ quán).
  - Quán Trường học (`school`): Trạng thái `Quản lý Chị Linh đang tự bán` (Quản lý tự phục vụ).
  - Quán Văn phòng (`office`): Trạng thái `Nghỉ hôm nay`.
- Kiểm tra nhãn `★ Khách quen` trên phiếu đơn tại cả 360×640 và 390×844.
- Kiểm tra hiển thị màn hình tổng kết đa chi nhánh: gợi ý vận hành hiển thị đầy đủ, sổ tiền mặc định thu gọn, giao diện co giãn chuẩn xác trên cả 2 độ phân giải.

---

## 3. Danh mục ảnh bằng chứng E2E

| Nội dung kiểm tra | Viewport 360×640 | Viewport 390×844 |
| :--- | :--- | :--- |
| **Chỉ báo giờ chạy nhanh (⚡ Vắng khách)** | [shot_controlled_quiet_interval_cue_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_quiet_interval_cue_360x640.png) | [shot_controlled_quiet_interval_cue_390x844.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_quiet_interval_cue_390x844.png) |
| **Quán Nhà: Chủ đang đứng bán** | [shot_controlled_map_home_owner_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_map_home_owner_360x640.png) | [shot_controlled_map_home_owner_390x844.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_map_home_owner_390x844.png) |
| **Quán Trường học: Quản lý đang tự bán** | [shot_controlled_map_school_managed_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_map_school_managed_360x640.png) | [shot_controlled_map_school_managed_390x844.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_map_school_managed_390x844.png) |
| **Quán Văn phòng: Nghỉ hôm nay** | [shot_controlled_map_office_closed_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_map_office_closed_360x640.png) | [shot_controlled_map_office_closed_390x844.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_map_office_closed_390x844.png) |
| **Nhãn Khách quen (★ Khách quen)** | [shot_controlled_familiar_badge_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_familiar_badge_360x640.png) | [shot_controlled_familiar_badge_390x844.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_familiar_badge_390x844.png) |
| **Tổng kết danh mục đa quán (Empire Result)** | [shot_controlled_empire_result_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_empire_result_360x640.png) | [shot_controlled_empire_result_390x844.png](../../mobile_gate_evidence/operational_handoff/shot_controlled_empire_result_390x844.png) |
| **Day 1 Bếp thực tế (Fresh Playthrough)** | [shot_fresh_day1_kitchen_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_fresh_day1_kitchen_360x640.png) | — |
| **Day 1 Kết quả (127k két / 67k lãi)** | [shot_fresh_day1_result_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_fresh_day1_result_360x640.png) | — |
| **Day 1 Sổ tiền mở rộng (Expanded Ledger)** | [shot_fresh_day1_ledger_expanded_360x640.png](../../mobile_gate_evidence/operational_handoff/shot_fresh_day1_ledger_expanded_360x640.png) | — |

---

## 4. Ghi chú minh bạch về bằng chứng

- **Kịch bản 1 (Day 1 fresh):** Bằng chứng gameplay thật, `localStorage` trống, thao tác người chơi và thời gian engine.
- **Kịch bản 2 (Đa quán fixture):** Bằng chứng fixture có kiểm soát qua hook `window.__xomNho.loadFixture('two_shops_mid_prep')`.
- Đã chạy kiểm định `auto_dispatch.py` toàn bộ 14/14 tests Node (`game/test-*.mjs`) đạt PASS 100%, bảo toàn baseline Day 1 (127k két / 67k lãi).

## 5. Bảng nghiệm thu UI Tasks (A1–A5)

| Task ID | Trạng thái | Vị trí file:dòng | Kết quả nghiệm thu |
|---|---|---|---|
| A1 | Done | `game/main.mjs:708` | Node bản đồ hiển thị `Đã đóng ca` khi `shopOperationalStatus` là `done` |
| A2 | Done | `game/style.css:2738` | Bổ sung `.shop-status-badge.status-done` và `.map-node.status-done` |
| A3 | Done | `game/main.mjs:725` | Sửa mô tả `Chờ chủ` chuẩn luật C2 (yêu cầu quản lý đang trực) |
| A4 | Done | `game/main.mjs:542` | Tích hợp 3 selector engine: `isQuietInterval`, `currentMinuteRate`, `shopOperationalStatus` |
| A5 | Done | `game/fixtures.mjs:15` | Đã chụp 4 ảnh fixture `two_shops_mid_prep` trên 360×640 & 390×844 |

## Action Items for Codex (Backend/Logic)

| Task ID | Trạng thái | Vị trí file:dòng | Chỉ số / Hành động tiếp theo |
|---|---|---|---|
| C1–C6 | Done | `game/empire-engine.mjs:177` | 14/14 tests PASS, Baseline 127k/67k chuẩn, Sprint READY_FOR_DIRECTOR |
