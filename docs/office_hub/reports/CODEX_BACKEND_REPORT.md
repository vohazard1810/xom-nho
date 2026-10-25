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

## 5. Local orchestrator — 2026-10-24

**Commit triển khai**: `7a34dc939bcfeaf078aa16c89e937ce3c61ce06e`, nhánh `codex/local-orchestrator`.

Theo yêu cầu mới, thêm Node orchestrator `handoff/orchestrator.mjs`, queue sáu trạng thái tiếng Việt, ACK JSONL có commit, nhánh/worktree riêng, test supervisor trên SHA cụ thể, Codex review tối đa ba vòng. Có STOP, timeout 1.200s, lock, tối đa 6 lần gọi model/giờ qua restart, dry-run, log JSONL và panel chỉ đọc trên Dashboard. Không tự push/merge main, không tự ghép kết quả worker vào nhánh sản phẩm. Nhánh worker được tạo ở lần dispatch thật; dry-run không tạo chúng.

### Bằng chứng đã chạy

| Kiểm tra | Kết quả | Giới hạn |
|---|---|---|
| `node --test handoff/test-orchestrator.mjs handoff/test-dashboard.mjs` | 9/9 PASS, 86,25 giây | Git/worktree/ACK/test subprocess/STOP thật trong repo tạm; model review được mô phỏng |
| `node --test --test-name-pattern 'CLI contracts' handoff/test-orchestrator.mjs` | 1/1 PASS | Kiểm tra bổ sung routing Light/Medium và JSON stdin cho adapter agy; không gọi model |
| `node handoff/orchestrator.mjs --dry-run --import-office` | PASS, 0 lần gọi model; preview A1–A5 | Queue vẫn rỗng; không tạo worktree, không đổi trạng thái task thật |
| CLI local `codex exec --help` và catalog bundled | Có headless; mapping Light=gpt-6-luna/low, Medium=gpt-6.1-sol/medium | Chưa thử đăng nhập, quyền Git hoặc truy cập model bằng lời gọi thật |
| Tìm CLI Antigravity và đọc `agentapi --help` | Không tìm thấy agy native; agentapi có tạo/gửi hội thoại | Chưa chứng minh hợp đồng đồng bộ workspace + completion; adapter nội bộ không được bật |
| GET Dashboard cổng 8990 | HTTP 200 | Không chứng minh cùng checkout với controller hoặc hai agent đang kết nối |

Không chạy lại bộ game ở ca này vì không sửa logic game. Bảng 14/14 ở mục 2 là kết quả ca backend trước; không trình bày lại thành lượt chạy mới.

### Quyết định vận hành

- Antigravity ở **manual**: outbox tự tạo khi dispatch, nhưng việc mở GUI tại đúng worktree và kích hoạt agent vẫn cần thao tác. Không tuyên bố đã kết nối hai chiều hoặc đã gửi task thật. Chưa chạy watch hay gọi AI production.
- Đề xuất để tự động đầy đủ: cài/đăng nhập CLI chính thức `agy`, xác minh stream-json, chạy `agy models` rồi cấu hình hai mức model thực tế. Headless mới là phiên riêng, không tự tiếp quản cuộc hội thoại GUI đang mở. Giữ cơ chế quyền mặc định; quyền chưa đủ sẽ Blocked thay vì vượt sandbox.
- Kiểm duyệt tự động đã từ chối đề xuất gắn `--approve-for-me` cho lần gọi tương lai. Cờ đó **không có trong mã**; giữ sandbox/default approval. Chưa kiểm tra được vòng chạy model thực tế, đây là giới hạn đã công bố.
- Cổng 8990 không tự chuyển sang nhánh mới. Dashboard phải được phục vụ từ checkout controller (hoặc đồng bộ nhánh mới) để có panel Điều phối. Chạy build_bundle.py lấy snapshot offline; dữ liệu live được tải lại mỗi 10 giây.
- Hướng dẫn: `handoff/README.md`; bằng chứng dry-run: `handoff/dry-run.json`, `handoff/orchestrator.log`. Không có cuộc trao đổi trực tiếp nào với Antigravity trong đợt dry-run.

## 6. Kết nối trực tiếp đã xác minh — 2026-10-24

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| Commit | 3f77de9b2257308711426d3750404d91d930e90c | direct_link.py và bằng chứng |
| Repo đang phục vụ | .gemini/antigravity/scratch/xom-nho | Tiến trình http.server 8990 |
| Codex → Antigravity | send-message thành công | Hội thoại 47b8d4fc-0808-455a-ab31-40cf8e3ca68d |
| Antigravity → Codex | ACK đúng nonce | handoff/direct-evidence/ANTIGRAVITY_ACK.md |
| Vòng về | ROUNDTRIP-CONFIRMED | OFFICE-LINK-20261024-1215; HTTP và filesystem khớp |
| Báo cáo live | Hai phòng đã cập nhật | Cổng 8990, báo cáo và bundle HTTP 200 |
| Helper | 5/5 unittest PASS | Token redaction, STOP, quota, loopback, ACK |
| Bảo mật | Người dùng đã cho phép | Token chỉ trong bộ nhớ, không lưu |
| Phạm vi | Gửi trực tiếp, nhận file chung | Theo yêu cầu; chưa bật daemon hoặc nối vòng queue |
| Model | Phiên GUI quyết định | send-message không chọn được Light/Medium |

Kết quả mới thay giới hạn transport ở dry-run trước. CLI agy vẫn chưa có; agentapi đã xác minh bằng phản hồi thật.

## 7. Workflow duyệt local — 2026-10-24

| Kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| Backend workflow | 19/19 PASS | HTTP, receipt, nonce, retry, quota, trạng thái tiến trình |
| Game của yêu cầu pending | 15/15 PASS | Receipt tại repo phục vụ; không thay bằng chứng browser |
| Pending 743d08f9 | Đang làm, vòng 2/3 | Antigravity bổ sung bằng chứng giao diện |
| Kết nối phiên | Đang chạy khi kiểm tra | Metadata ứng dụng; không chứng minh task hoàn tất |
| Giám đốc Approve | Chỉ xác nhận snapshot | Không tự chạy đề xuất tiếp theo |
| Góp ý | Antigravity → test → Codex | Chỉ về chờ Giám đốc sau kiểm chứng đạt |
| Kiểm thử trình duyệt trước | Fixture cô lập | Không dùng duyệt fixture thay duyệt production |

Dịch vụ `workflow_server.py` thay static server tại cổng 8990. Token chỉ trong môi trường tiến trình.
Tài liệu vận hành: `docs/office_hub/WORKFLOW_README.md`. Pending chưa được đánh dấu Done.
Bằng chứng browser mới nhất còn chờ Antigravity; không tuyên bố hoàn tất vòng duyệt cuối.


## Kết ca bốn việc — 2026-10-24

| Kết quả | Chi tiết |
|---|---|
| Gói | Blocked vòng 3/3; không duyệt toàn bộ |
| T3/T4 | Done; xem SHIFT_CLOSE_REPORT.md |
| T1/T2 | Review; mobile và Compare cần sửa |
| Kiểm thử | Workflow22/22; game15/15; dashboard1/1 |
| Đóng ca | handoff/STOP; báo cáo SHIFT_CLOSE_REPORT.md |


## Bốn task game — 25/10/2026

| Mục | Kết quả |
|---|---|
| C-G1/C-G2/A-G1/A-G2 | Done; Codex duyệt theo ủy quyền |
| Kiểm thử | 16/16 PASS; nguồn không đổi |
| Day1 | Két127.000đ/lãi67.000đ, giữ chuẩn |
| Báo cáo | [Nghiệm thu game](GAME_FOUR_FINAL_REPORT.md) |
| Phân biệt phạm vi | Office Hub cũ chưa được duyệt bởi gói game |

## Action Items for Antigravity (UI/Art)

| # | Ưu tiên | Đầu việc | Vị trí liên quan | Ghi chú |
|---|---|---|---|---|
| A1 | Thấp | Dùng trạng thái done cho node đã kết thúc ca | getMapNodeStatus | Selector đã có done |
| A2 | Thấp | Bổ sung CSS status-done | style.css | Giữ phân vai UI |
| A3 | Trung bình | Sửa lời mô tả Chờ chủ theo luật C2 | currentShopStatus | Cần quản lý đang trực để chủ rời quán; không nói engine tạm dừng đón khách |
| A4 | Trung bình | Dùng selector engine cho cue và map/panel | main.mjs | isQuietInterval, currentMinuteRate, shopOperationalStatus; xem hợp đồng ở mục 1 |
| A5 | Thấp | Chạy fixture đa quán trên 360×640 và 390×844 | window.__xomNho.loadFixture | two_shops_mid_prep; ghi rõ fixture có kiểm soát và giữ kiểm tra Day 1 fresh riêng |
| A6 | Trung bình | Xác nhận workflow ACK/outbox trong đúng worktree, kiểm tra panel log | handoff/README.md, docs/office_hub | Manual khi chưa có agy; không coi lời báo đang làm là bằng chứng đã nhận |
