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

- **Kịch bản 1 (Day 1 fresh)** là bằng chứng gameplay thật: `localStorage` trống, chỉ dùng click chuột và đồng hồ engine, không gán state.
- **Kịch bản 2 (đa quán)** là **fixture có kiểm soát**: state đa quán, quản lý và khách quen được dựng sẵn qua hook trình duyệt để chụp đủ các trạng thái UI. Đây **không phải** bằng chứng của một phiên chơi tự nhiên tới lúc mở quán thứ hai.
- Máy của Antigravity **không có Node.js**, nên chưa chạy các file `game/test-*.mjs` sau commit `7e024a6`. Commit này chỉ sửa phần trình bày (`game/main.mjs`, `game/style.css`), nhưng vẫn cần Codex chạy lại bộ test.

## Action Items for Codex (Backend/Logic)

Các đầu việc dưới đây liên quan đến state/logic mà UI trong `game/main.mjs` đang **tự suy ra**. Antigravity không tự sửa engine theo đúng phân vai.

| # | Ưu tiên | Đầu việc | Vị trí liên quan | Đề xuất |
|---|---|---|---|---|
| C1 | Cao | **Chạy lại bộ test tự động** trên `7e024a6` (máy Antigravity không có Node). | `game/test-*.mjs` (đặc biệt `test-ui.mjs`, `test-ui-timers.mjs`, `test-empire.mjs`, `test-operational-e2e.mjs`) | Chạy toàn bộ `game/test-*.mjs`, báo kết quả vào `CODEX_BACKEND_REPORT.md`. |
| C2 | Cao | **Xác nhận hành vi quán vắng chủ, không có quản lý.** UI ghi “Quán vắng chủ và chưa có quản lý nên tạm dừng đón khách”. Theo code hiện tại, quán không active vẫn chạy đồng hồ: khách vẫn đến, `assistEnabled=false` nên đơn đứng ở `SELECT` rồi hết kiên nhẫn (`WAIT_TOO_LONG`). | `empire-engine.mjs` `employeeEffects`, `advanceEmpire`; `main.mjs` `currentShopStatus` | Codex chốt luật đúng: chặn rời quán khi chưa có quản lý, tạm dừng đón khách, hay cho lỡ khách. Antigravity sẽ sửa câu chữ UI theo luật đã chốt. |
| C3 | Trung bình | **Điều kiện “giờ chạy nhanh” đang bị lặp lại ở UI.** UI loại quán `closedToday`, engine thì không; engine còn có nhánh tutorial Day 1 (rate = 0). Hai bên có thể lệch nhau. | `main.mjs` `isQuietAccelerating` (~dòng 540); `empire-engine.mjs` `advanceEmpire` (dòng ~182) | Export một selector, ví dụ `isQuietInterval(state)` / `currentMinuteRate(state)`, để UI chỉ đọc, không tự tính. |
| C4 | Trung bình | **Trạng thái quán nên là dữ liệu chuẩn từ engine.** UI đang tự suy ra `owner / managed / waiting / closed / done` từ `shiftRunning`, `activeShopId`, nhân sự và `screen`. | `main.mjs` `getMapNodeStatus`, `currentShopStatus` | Export `shopOperationalStatus(empire, shopId)` trả về `{status, managerId}`; UI chỉ ánh xạ sang nhãn và màu. |
| C5 | Thấp | **Ổn định enum `area` của gợi ý vận hành.** UI dùng class `rec-area-${area}` (`stock`, `service`, `pricing`, `menu`, `hours`, `cost`, `staff`, `stable`). | `empire-engine.mjs` `operationalAdvice` | Giữ nguyên tên `area` hoặc báo trước khi đổi; thêm test giới hạn tối đa 3 gợi ý không quy lỗi hết hàng cho nhân viên. |
| C6 | Thấp | **Hook fixture chính thức cho test trình duyệt đa quán**, để bằng chứng kịch bản 2 không phải dựng state thủ công. | `main.mjs` `window.__xomNho` | Cung cấp `loadFixture(name)` có seed cố định (ví dụ `two_shops_mid_prep`), dùng chung cho test engine và test UI. |

### Việc Antigravity tự nhận (UI, không cần Codex)

- A1: Node bản đồ (`getMapNodeStatus`) chưa xử lý quán đã `DAY_RESULT` giữa ca, trong khi panel chi tiết đã có nhánh “Đã đóng ca”.
- A2: Class `status-done` chưa có CSS riêng.
- A3: Sửa câu chữ trạng thái “Chờ chủ” sau khi Codex chốt C2.
