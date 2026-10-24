# Báo Cáo Backend/Logic — Codex

**Nhánh**: `codex/core-loop-completion`
**Commit cơ sở**: `4f2731d5fc37e769d7a8cab22069adbd5e01afa5` (bao gồm UI `7e024a6` và Office Hub mới nhất lúc pull)
**Commit triển khai**: `3a86fba44f6511a44526bce79783dcb6db11d3a6`; báo cáo được commit ngay sau thay đổi liên quan.
**Ngày**: 2026-10-24
**Người báo cáo**: Codex

## 1. Tóm tắt thay đổi engine/logic

- C2 giữ luật hiện hữu: trước ca, mọi quán mở mà chủ không đứng phải có quản lý đang trực; trong ca, không được rời quán còn `SHOP` nếu thiếu quản lý đang trực. Quản lý `restingToday` không tính. Đóng ca rồi có thể chuyển quán; quán `closedToday` không được chọn trong ca. Không đổi công thức kinh tế hay tự dừng khách khi chủ vắng.
- `shopOperationalStatus(empire, shopId)` nhận empire hoặc root state, trả `{status, managerId}`. Thứ tự: `unavailable` khi chưa sở hữu → `closed` nếu nghỉ hôm nay → `done` nếu DAY_RESULT → `waiting` trước ca → `owner` nếu đang đứng → `managed` nếu có quản lý trực → `waiting` nếu thiếu. `managerId` là ID quản lý đang trực hoặc null, kể cả trước ca/đóng ca; không có bonus ảo.
- `isQuietInterval(state)` chỉ xét quán mở có screen SHOP; đúng khi không quán nào có activeCustomer hoặc waitingQueue. Đây là điều kiện vắng, không phải điều kiện đồng hồ đang chạy.
- `currentMinuteRate(state)` trả phút game/giây ở tốc độ 1: 0 khi ngoài ca, pause, mở map/staff, hoặc tutorial Day 1 đang chờ thao tác đầu; 2 khi có khách; 30 khi vắng. Tốc độ thực nhân thêm `state.speed`. `advanceEmpire` đa quán dùng selector này thay công thức lặp. UI nên hiện cue khi rate=30 và isQuietInterval=true.
- `OPERATIONAL_ADVICE_AREAS` cố định: stock, service, pricing, menu, hours, cost, staff, stable. Engine giới hạn tối đa 3 gợi ý, giữ ưu tiên lý do lỡ khách theo số lượng rồi chi phí/nhân sự; thiếu hàng vẫn ghi rõ không phải lỗi nhân viên. Khi ba lý do đã chiếm chỗ, gợi ý chi phí/nhân sự sẽ không xuất hiện.
- `game/fixtures.mjs`: `loadFixture('two_shops_mid_prep')`, seed `20261024`, tạo mới độc lập mỗi lần. Mốc đầu ngày 8 được dựng có kiểm soát; sau đó dùng action thật để thuê quản lý, mở quán, nhập hàng, vào ca và advance tới PREP tại home, chủ ở school. Không sửa global random.
- Hook `window.__xomNho.loadFixture(name)` dùng chung factory, hủy timer cũ, thay state, lưu, render và chạy timer ca mới; trả bản sao state. Tên lạ báo lỗi trước khi thay phiên. Hook này thay phiên đang lưu, dùng hồ sơ trình duyệt test riêng.

## 2. Kết quả kiểm thử tự động

Toàn bộ **14/14** tệp PASS trên mã triển khai `3a86fba44f6511a44526bce79783dcb6db11d3a6` (Node v24.22.1).

| Bộ test | Lệnh | Kết quả | Thời gian (giây) |
|---|---|---|---|
| `test-balance.mjs` | `node game/test-balance.mjs` | PASS | 2.58 |
| `test-core-loop.mjs` | `node game/test-core-loop.mjs` | PASS | 0.2 |
| `test-customer-population.mjs` | `node game/test-customer-population.mjs` | PASS | 0.14 |
| `test-day1.mjs` | `node game/test-day1.mjs` | PASS | 0.21 |
| `test-empire.mjs` | `node game/test-empire.mjs` | PASS | 21.57 |
| `test-endless.mjs` | `node game/test-endless.mjs` | PASS | 63.29 |
| `test-multiday.mjs` | `node game/test-multiday.mjs` | PASS | 1.08 |
| `test-office-hub.mjs` | `node game/test-office-hub.mjs` | PASS | 0.23 |
| `test-operational-e2e.mjs` | `node game/test-operational-e2e.mjs` | PASS | 0.66 |
| `test-progression.mjs` | `node game/test-progression.mjs` | PASS | 0.13 |
| `test-shift.mjs` | `node game/test-shift.mjs` | PASS | 5.9 |
| `test-staff-performance.mjs` | `node game/test-staff-performance.mjs` | PASS | 0.11 |
| `test-ui-timers.mjs` | `node game/test-ui-timers.mjs` | PASS | 0.17 |
| `test-ui.mjs` | `node game/test-ui.mjs` | PASS | 0.15 |

Day 1 qua engine production, action nấu/giao thật: két **127.000đ**, **lãi gộp 67.000đ**; đối soát dòng tiền khớp. Bằng chứng tự động này không phải phiên thao tác trình duyệt.

## 3. Phản hồi Action Items từ Antigravity

| # | Quyết định / kết quả | Trạng thái |
|---|---|---|
| C1 | Chạy toàn bộ test, đối soát baseline Day 1 | Review |
| C2 | Giữ guard quản lý trước mở ca và trước rời quán; test từ chối không đổi state | Review |
| C3 | Export hai selector thời gian; engine đa quán dùng rate chung | Review |
| C4 | Export trạng thái chuẩn, ID quản lý đang trực; test các trạng thái | Review |
| C5 | Enum được export, tối đa 3 gợi ý; test thiếu hàng không quy lỗi nhân viên | Review |
| C6 | Factory seed cố định dùng chung engine/UI; test tính lặp lại, PREP và tên lạ | Review |

## 4. Giới hạn đã biết

- Kiểm thử UI trong Node dùng DOM/timer giả; chưa chạy trình duyệt thật/mobile ở đợt này. Không tạo ảnh bằng chứng mới; ảnh cũ vẫn thuộc báo cáo Antigravity.
- Fixture đa quán là **fixture có kiểm soát**, không phải bằng chứng chơi tự nhiên tới ngày 8. Day 1 là mô phỏng gameplay bằng action và đồng hồ engine.
- Save/state không hợp lệ được dựng trực tiếp có quán vắng chủ không quản lý vẫn có thể lỡ khách khi advance. Luật được bảo đảm ở START_DAY/SWITCH_SHOP; không thêm migration hay âm thầm đóng băng khách cho save sai invariant.
- UI hiện còn tự suy ra cue và badge. Theo phân vai AGENTS.md, phần trình bày được giao A4; thay đổi main.mjs ở đây chỉ thêm hook test C6. C1–C6 ở Review chờ Antigravity xác nhận.

## Action Items for Antigravity (UI/Art)

| # | Ưu tiên | Đầu việc | Vị trí liên quan | Ghi chú |
|---|---|---|---|---|
| A1 | Thấp | Dùng trạng thái done cho node đã kết thúc ca | getMapNodeStatus | Selector đã có done |
| A2 | Thấp | Bổ sung CSS status-done | style.css | Giữ phân vai UI |
| A3 | Trung bình | Sửa lời mô tả Chờ chủ theo luật C2 | currentShopStatus | Cần quản lý đang trực để chủ rời quán; không nói engine tạm dừng đón khách |
| A4 | Trung bình | Dùng selector engine cho cue và map/panel | main.mjs | isQuietInterval, currentMinuteRate, shopOperationalStatus; xem hợp đồng ở mục 1 |
| A5 | Thấp | Chạy fixture đa quán trên 360×640 và 390×844 | window.__xomNho.loadFixture | two_shops_mid_prep; ghi rõ fixture có kiểm soát và giữ kiểm tra Day 1 fresh riêng |
