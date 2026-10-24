# Local Codex ↔ Antigravity orchestrator

Node 20+ và Git; không có dependency npm. Chạy từ root repo.

```powershell
node handoff/orchestrator.mjs --doctor
node handoff/orchestrator.mjs --dry-run --import-office
node --test handoff/test-orchestrator.mjs
node --test handoff/test-dashboard.mjs
```

Dry-run chỉ kiểm tra `--help`, lập kế hoạch và ghi `handoff/orchestrator.log` cùng
`handoff/dry-run.json`. Không gọi model, không sửa queue, không tạo worktree/nhánh,
không push. Bản dry-run ngày 2026-10-24: Codex có headless CLI; không tìm thấy
`agy` chính thức. `language_server.exe agentapi --help` có lệnh tạo/gửi hội thoại,
nhưng chưa xác minh được hợp đồng chạy workspace → chờ xong → exit code; adapter
này không được bật tự động. Chưa kiểm tra đăng nhập hay quyền dùng model bằng gọi thật.

## Chạy sau khi xem dry-run

Commit các file cấu hình/mã vào nhánh controller `codex/local-orchestrator` trước.
Cấu hình author Git local phải có sẵn. Sau đó:

```powershell
node handoff/orchestrator.mjs --once --import-office
node handoff/orchestrator.mjs --watch --import-office
```

`--import-office` nhập task Todo từ `docs/office_hub/tasks.json` một lần, không
nhập lại cùng ID. Queue là dữ liệu vận hành riêng; không thay các trạng thái Todo/
Review/Done trong Office Hub bằng enum tiếng Việt. Không tự đánh Done task Office Hub.
`--watch` nạp queue lại mỗi 15 giây. Mỗi bên chỉ có một task đang chờ xử lý;
task thủ công chưa xong giữ nguyên và không bị task tiếp theo ghi đè.

Thêm task khác bằng sửa `queue.json`, kiểm tra schema rồi commit trên controller.
Task mới phải bắt đầu `Đã gửi`, `review_round: 0`, `attempt: 1`, có prompt,
`kind: "read" | "edit"`, `tests` lấy tên suite trong config, và `allowedPaths`.
Worker không được tự sửa các trạng thái trong queue.

Ví dụ cấu trúc task:

```json
{
  "id": "example-ui", "recipient": "Antigravity", "status": "Đã gửi",
  "review_round": 0, "attempt": 1, "kind": "edit",
  "prompt": "Đọc báo cáo rồi dùng selector engine cho nhãn trạng thái quán.",
  "tests": ["game"], "allowedPaths": ["game/main.mjs", "game/style.css", "docs/"]
}
```

## Nhánh và bằng chứng

- Controller: `codex/local-orchestrator`. Worker: `agents/codex`, `agents/antigravity`.
- Worktree nằm trong `handoff/.runtime/worktrees/<agent>`, tách checkout của từng bên.
- Không có đường code tự push hoặc merge main. Kết quả được giữ trên nhánh worker;
  task Done nghĩa là đã qua kiểm chứng/review, **không có nghĩa đã merge**.
- `fetch: false` mặc định: hai worker cùng kho Git local. Nếu dùng clone khác,
  xuất bản hai nhánh worker trước, đặt `fetch: true`; chỉ fast-forward nhánh worker
  sạch từ origin. Lịch sử phân kỳ dừng với lỗi, không reset hay force-push.
- Không tự chuyển một phiên GUI đang chạy ở repo khác sang worktree mới.

Trạng thái chỉ được nâng từ bằng chứng:

| Trạng thái | Bằng chứng bắt buộc |
|---|---|
| Đã gửi | Task được người điều phối enqueue/commit; hoặc review FAIL đã commit |
| Đã nhận | Dòng JSON `received` trong ACK đã commit đúng actor/task/attempt/base |
| Đang làm | Dòng JSON `started` đã commit cùng received |
| Chờ duyệt | ACK completed, commit triển khai mới đúng phạm vi, test do supervisor chạy PASS trên checkout sạch; receipt đã commit |
| Done | Codex CLI trả PASS cho đúng SHA; receipt review đã commit và worker không thay đổi |
| Blocked | Receipt lỗi/mất bằng chứng/test fail/CLI lỗi hoặc review FAIL vòng 3 đã commit |

`handoff/ACK.md` hướng dẫn dạng JSON. Sự kiện ví dụ không được tính vì base/task
không khớp. Commit ACK-only không được nhận là kết quả. Mọi thay đổi sản phẩm sau
`result_commit` đều làm bằng chứng hết hiệu lực. Supervisor chạy test thật và lưu
exit code, hash transcript, output cuối vào receipt `handoff/evidence/*.json`.
ACK là lời xác nhận của agent, không phải bằng chứng test PASS.

Codex review dùng checkout riêng ở chế độ read-only, xem chính xác
`git diff BASE RESULT` / `git show RESULT:path`, đọc receipt test. Tối đa ba lần
review; FAIL lần 1/2 tạo attempt tiếp theo với feedback; lần 3 PASS thì Done,
FAIL thì Blocked. Kết quả không phải JSON hợp lệ/không đúng SHA sẽ Blocked thay
vì suy diễn thành PASS. Không retry lặng lẽ một lần gọi đã đặt chỗ mà bị crash.
Mọi task, kể cả Codex, được review bằng một lần gọi riêng; đây không phải duyệt của con người.

## Giới hạn và STOP

- Mặc định tối đa **6 lần gọi model/giờ**, gộp work + review + lỗi; giữ lịch sử trong
  log JSONL qua restart. Test và `--help` không tính là gọi model. Không cắt/xóa log
  khi worker đang chạy. Log lỗi JSON khiến bộ điều phối dừng, không reset quota.
- Timeout mỗi subprocess 1.200 giây; ghi receipt lỗi. `STOP` ở root controller hoặc
  `handoff/STOP` dừng gọi mới và hủy cây tiến trình đang chạy. Giữ STOP để không chạy lại.
- Tạo STOP: `New-Item -ItemType File STOP`. Xóa STOP khi chủ động tiếp tục.
- Lock `.runtime/orchestrator.lock` ngăn hai supervisor cùng chạy. Nếu máy/process
  chết, xác minh PID trong lock không còn chạy trước khi xóa **đúng file lock đó**.
- Khi gặp lỗi Git/dirty checkout hoặc config, dừng và giữ nguyên checkout để kiểm tra;
  không tự stash/reset. Không sửa tay trạng thái thành Done để vượt cổng bằng chứng.
- Giữ sandbox và cơ chế duyệt quyền mặc định của CLI. Lệnh Git/terminal bị từ chối
  quyền sẽ làm task thiếu bằng chứng hoặc CLI thất bại; ghi Blocked, không bỏ qua
  sandbox hay gắn cờ tự duyệt toàn cục. Đợt này chưa gọi model thật để kiểm tra quyền đó.
- Read/scan/review: Light (`gpt-6-luna`, effort low). Edit: Medium (`gpt-6.1-sol`,
  effort medium). Đây là mapping cấu hình dựa trên catalog local, không phải hai tên
  model chung. Worker đọc vẫn có quyền workspace-write để commit ACK/báo cáo;
  reviewer dùng read-only. Đổi model bằng config, commit trước khi chạy.

## Antigravity khi thiếu headless

Supervisor tự tạo outbox `handoff/outbox/<task>.md` và giữ trạng thái Đã gửi;
không gọi GUI hay giả lập đã nhận. Mở Antigravity **một lần** tại đúng worktree,
để agent đọc outbox và làm ACK protocol; supervisor theo dõi commit, tự chạy test,
gọi Codex review, rồi ghi feedback cho vòng sửa tiếp theo. Việc kích hoạt GUI
và đọc feedback vẫn cần thao tác thủ công nếu GUI không có watcher được hỗ trợ.
Không phải tự động hai chiều hoàn toàn.

Phương án đầy đủ: cài/đăng nhập CLI chính thức `agy`, xác minh `agy --help` có
`--input-format`/`--output-format` (stream-json), chọn tên model Light/Medium bằng `agy models` rồi
điền config. Doctor sẽ nhận diện native executable; wrapper `.cmd` không tự được
chạy qua shell. Nếu CLI cài dưới dạng wrapper, đặt `command` tới executable native
hoặc cung cấp adapter native đã kiểm chứng. Không tự cài, đăng nhập hoặc gửi task
thật trong đợt dry-run này. Phiên headless mới không phải cuộc hội thoại GUI đang mở.

Tài liệu được đối chiếu:
- https://learn.chatgpt.com/docs/non-interactive-mode
- https://antigravity.google/docs/cli/headless/
- https://antigravity.google/docs/cli/install/

## Dashboard

Panel Điều phối đọc queue, dry-run và 25 dòng log gần nhất từ cùng repo đang được
HTTP server phục vụ; tự tải lại mỗi 10 giây. Offline: chạy
`python docs/office_hub/build_bundle.py` để lấy snapshot mới.
Nếu cổng 8990 đang phục vụ clone khác, cần mở dashboard của clone controller hoặc
đồng bộ nhánh controller vào clone phục vụ trang; một URL giống nhau không chứng minh
cùng repo. Panel chỉ đọc dữ liệu, không có nút thực thi CLI từ trình duyệt.
