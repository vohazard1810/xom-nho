# GAME_FOUR_ACK.md — Biên Nhận Thực Thi 4 Task Trong Game

| Mục | Chi tiết |
|---|---|
| **Mã Nonce** | `GAME-FOUR-20261024` |
| **Nguồn chỉ thị** | Chủ dự án sửa phạm vi: 4 task trong game; Office Hub xử lý riêng |
| **Nhánh Git** | `codex/core-loop-completion` |
| **Task IDs** | `C-G1`, `C-G2`, `A-G1`, `A-G2` |
| **Thời điểm hoàn tất** | 2026-10-24T10:33:00Z |
| **Trạng thái** | `READY_FOR_CODEX` (UI & Tích hợp hoàn tất, đã cập nhật bằng chứng Playwright đúng vị trí bảng và zero-sales tự nhiên) |
| **Files đã chỉnh sửa** | `game/main.mjs`, `game/style.css` |
| **Files bảo toàn tuyệt đối** | Scenery/Environment art (A6), Engine core, Assets, Actor anchors |

---

## 1. Mã Băm File Nguồn (Exact SHA-256 Hashes)

> [!IMPORTANT]
> Toàn bộ mã nguồn game được bảo đảm đóng băng tại các mã băm sau đây để Codex supervisor nghiệm thu:

| File | SHA-256 Checksum |
|---|---|
| `game/main.mjs` | `30e3b5f46c07eeee49f7748901780b8269b109c692d21e21063f1205f8c32e36` |
| `game/style.css` | `ce43365664b0a8411fc9a342a6fcc0294ccd88a450c153bfdf81fa5203a74264` |

---

## 2. Chi Tiết Thực Thi & Tích Hợp (A-G1 & A-G2)

### A-G1: Gợi ý chuẩn bị nguyên liệu trên màn Chợ & Thực đơn
- **Hàm hỗ trợ**: `renderReadinessHelper(state, { includeBasket, sourceLabel })` gọi thuần selector `menuReadiness(state, { includeBasket })` từ `./shop-insights.mjs`.
- **Màn hình Chợ (MARKET)**:
  - `includeBasket: true`, nhãn nguồn `Kho + Giỏ hàng`.
  - Hiển thị ước tính công suất món theo số lượng đang chọn trong giỏ hàng và kho sẵn có.
  - Khi tăng/giảm số lượng ở stepper, công suất và số món sẵn sàng tự động cập nhật trực quan (`0/3` -> `3/3 món sẵn sàng`).
  - Chú thích rõ ràng: công suất tính độc lập từng món (nguyên liệu dùng chung không cộng dồn đồng thời); giỏ hàng xem trước gồm hàng chưa thanh toán; giá vốn ước tính theo giá chợ hôm nay.
- **Màn hình Thực đơn (MENU)**:
  - `includeBasket: false`, nhãn nguồn `Kho sẵn có`.
  - Hiển thị công suất thực tế chỉ dựa trên kho đã nhập.
  - Chú thích rõ ràng giá vốn thực tế được tính theo FIFO khi bán.
- **Trạng thái đóng/mở & Persistence**:
  - Dùng thẻ chuẩn `<details id="readiness-panel-details">`.
  - Thuộc tính `state.readinessOpen` được lưu trữ và đồng bộ qua cả click summary lẫn sự kiện toggle `$.addEventListener('toggle')`, giữ nguyên trạng thái mở/đóng qua các lần render và chuyển màn hình.
  - Hoàn toàn không tự động mua hay đột biến trạng thái state.

### A-G2: Hiển thị món bán chạy và bảng doanh số cuối ca (DAY_RESULT & EMPIRE)
- **Hàm hỗ trợ**: `renderRecipeSalesBreakdown(shopState, { shopName })` gọi thuần selector `recipeSalesSummary(shopState)` từ `./shop-insights.mjs`.
- **Ruy băng Món bán chạy (`.best-seller-ribbon`)**:
  - Tự động hiển thị nổi bật trên thẻ kết quả ca: `⭐ Món bán chạy: [Tên món] ([x] đơn · [y]đ)`.
  - Trạng thái rỗng trung thực (`.ribbon-empty`): Khi chưa có đơn bán trong ca (0 đơn), hiển thị nhãn nhẹ nhàng: `Chưa có món nào được phục vụ hôm nay.` Không bịa đặt số liệu doanh thu.
- **Bảng chi tiết doanh số từng món (`.recipe-sales-table`)**:
  - Đặt an toàn bên trong `#day-ledger-details` (được tích hợp cho cả luồng `renderDayResult` đơn lẻ và luồng thực tế `renderEmpireResult` cho từng quán).
  - **Component-scoped CSS override**: Thêm override `.compact-ledger > .recipe-sales-breakdown { display: block !important; width: 100% !important; min-width: 0 !important; border-bottom: none !important; }` để triệt tiêu tính chất `display: flex` kế thừa từ `.compact-ledger > div`. Đảm bảo các khối con (`h3`, `.best-seller-ribbon`, `.recipe-sales-table-wrap`, `.sales-disclaimer-notes`) trải đều 100% chiều rộng khung nhìn thay vì bị co ép thành 4 cột ngang.
  - Tối ưu kích thước ô bảng (`padding: 6px 4px`, font `11px`, `tabular-nums`): Chiều rộng bảng thực tế đo được 336px trên viewport 390x844 và 327px trên viewport 360x640, hiển thị trọn vẹn cả 6 cột số liệu mà không bị cắt khuất hay ép dòng.
  - Khi người chơi mở `#day-ledger-details`, biến `resultDetailsOpen` lập tức kích hoạt, tạm dừng đếm ngược tự chuyển ngày (`result-countdown`).
  - Đầy đủ 6 cột chuẩn: **Món**, **Đơn**, **Doanh thu**, **Giá vốn (COGS)**, **Lãi gộp**, **Đóng góp**.
  - Dòng tổng cộng (`.totals-row`) đối soát khớp 100% tổng các món.
  - Phụ thu Tip và Phí giao online được hiển thị riêng biệt bên dưới bảng.
  - Chú thích tài chính rõ ràng:
    - *Lãi gộp = Doanh thu - Giá vốn hàng bán (COGS tính theo giá FIFO lúc nhập hàng thực tế).*
    - *Đóng góp = Lãi gộp + Tip - Phí online (chưa tính lương nhân viên, hàng hỏng và chi phí vận hành chung).*
- **Độc lập dữ liệu từng quán**:
  - Trong tổng kết đa quán, bảng được render riêng cho từng quán từ `state.empire.shops[x.id].state`, không gộp số liệu giả định.

---

## 3. Bằng Chứng Kiểm Thử Trình Duyệt Tự Động (Playwright Proof)

Tất cả ảnh chụp bằng chứng đã được cập nhật chính xác vị trí hiển thị và luồng đóng ca tự nhiên:

| Viewport | Màn hình | Nội dung kiểm thử | File bằng chứng |
|---|---|---|---|
| **390x844** | `MARKET` | Panel công suất mở, badge `Kho + Giỏ hàng`, live update giỏ hàng | `docs/mobile_gate_evidence/game_four/evidence_a_g1_market_390x844.png` |
| **390x844** | `MENU` | Panel công suất mở, badge `Kho sẵn có`, lưu trạng thái `readinessOpen` | `docs/mobile_gate_evidence/game_four/evidence_a_g1_menu_390x844.png` |
| **390x844** | `DAY_RESULT` | Cuộn trực tiếp đến bảng `.recipe-sales-breakdown`: thấy rõ 6 cột (Món, Đơn, Doanh thu, COGS, Lãi gộp, Đóng góp) và dòng Tổng cộng | `docs/mobile_gate_evidence/game_four/evidence_a_g2_day_result_390x844.png` |
| **360x640** | `MARKET` | Viewport nhỏ chuẩn gọn, không che dock checkout | `docs/mobile_gate_evidence/game_four/evidence_a_g1_market_360x640.png` |
| **360x640** | `MENU` | Viewport nhỏ chuẩn gọn, không tràn lề ngang | `docs/mobile_gate_evidence/game_four/evidence_a_g1_menu_360x640.png` |
| **360x640** | `DAY_RESULT` | Cuộn trực tiếp đến bảng `.recipe-sales-breakdown` trên 360x640: các cột hiển thị gọn, có thanh cuộn ngang `overflow-x: auto` | `docs/mobile_gate_evidence/game_four/evidence_a_g2_day_result_360x640.png` |
| **390x844** | `DAY_RESULT` (0 đơn) | Tạo qua luồng tự nhiên `fresh -> START_DAY -> CLOSE` trước khi bán: cả báo cáo lẫn đơn thực tế đều bằng 0 (served=0, revenue=0, cogs=0), ruy băng rỗng trung thực và thông báo không có đơn bán | `docs/mobile_gate_evidence/game_four/evidence_a_g2_empty_sales_390x844.png` |

---

## 4. Kết Quả Kiểm Thử Toàn Bộ Test Suite (16/16 PASS)

Lệnh kiểm thử toàn diện: `python docs/office_hub/auto_dispatch.py --run-tests-only`

```text
Running all 16 engine tests with C:\Users\truonggiang.vo01\AppData\Local\OpenAI\Codex\runtimes\cua_node\2b841c3d44b123ec\bin\node.exe...
Result: 16 passed, failures: []
```

* **test-balance.mjs**: PASS
* **test-core-loop.mjs**: PASS
* **test-customer-population.mjs**: PASS
* **test-day1.mjs**: PASS
* **test-empire.mjs**: PASS
* **test-endless.mjs**: PASS
* **test-multiday.mjs**: PASS
* **test-n1-n2-n3-features.mjs**: PASS
* **test-office-hub.mjs**: PASS
* **test-operational-e2e.mjs**: PASS
* **test-progression.mjs**: PASS
* **test-shift.mjs**: PASS
* **test-shop-insights.mjs**: PASS
* **test-staff-performance.mjs**: PASS
* **test-ui-timers.mjs**: PASS
* **test-ui.mjs**: PASS

---

## 5. Trạng Thái Bàn Giao

* **Task C-G1 & C-G2**: Codex Backend pure selectors đã verify và kiểm thử độc lập.
* **Task A-G1 & A-G2**: Antigravity UI hoàn tất, styling đáp ứng 360/390, kiểm thử trình duyệt Playwright pass 100%.
* **Full Engine Suite**: 16/16 tests PASS 100%, không hồi quy bất kỳ logic game cốt lõi nào.
* **Bảo toàn**: Khung cảnh 3 quán (`scenery.mjs`), bản đồ vector và toàn bộ styling A6 được giữ nguyên vẹn 100%.
* **Đóng băng**: Mã nguồn `game/main.mjs` và `game/style.css` được đóng băng với SHA-256 ở Mục 1. Bàn giao Codex nghiệm thu và kết thúc phiên làm việc.
