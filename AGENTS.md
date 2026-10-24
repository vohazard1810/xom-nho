# AGENTS.md — Quy ước làm việc giữa các agent

> ### ⚡ KỶ LUẬT GIAO TIẾP & GIỚI HẠN VÒNG LẶP (ANTI-BLOAT PROTOCOL)
> 1. **Cấm trao đổi lan man (No Prose Bloat):** Mọi bàn giao giữa 2 bên trong `reports/*.md` và `tasks.json` chỉ được viết dạng bảng hoặc 1 dòng công thức: `[Task ID] | [Status] | [File:Line] | [Metric/Next Action]`. Tối đa 20 từ/dòng. Cấm viết văn xuôi giải thích dài dòng.
> 2. **Cấm tự đẻ thêm việc (No Scope Creep):** Chỉ xử lý gói gọn trong các task của Sprint hiện tại (A1–A5 và C1–C6). Không tự ý sinh thêm task mới khi chưa có lệnh Giám đốc.
> 3. **Giới hạn vòng lặp (`MAX_HANDOFF_ROUNDS = 2`):** Hai bên chỉ được tự chuyền bóng qua lại tối đa 2 vòng. Nếu có bất kỳ test nào fail lặp lại 2 lần hoặc lệch Baseline Day 1 (127k két / 67k lãi), bắt buộc **DỪNG NGAY (HARD STOP)**, gắn cờ `BLOCKER` và báo Giám đốc.
> 4. **Quản Đốc Tự Động (`auto_dispatch.py`):** Chạy `python docs/office_hub/auto_dispatch.py` để tự động kiểm tra lượt (`active_turn`), kích hoạt kiểm định, và phát chuông duyệt bài (`READY_FOR_DIRECTOR`) khi 14/14 tests PASS.

Repo này có hai agent cùng làm việc. Mọi agent (Antigravity, Codex hoặc agent mới) phải đọc file này trước khi bắt đầu.

## 1. Phân vai

| Agent | Phụ trách | Không tự ý làm |
|---|---|---|
| **Antigravity** | UI, art, asset, CSS, phần trình bày trong `game/main.mjs`, kiểm tra trên trình duyệt/mobile | Cơ chế gameplay, công thức, giao dịch, cân bằng kinh tế |
| **Codex** | Engine, logic, state, giao dịch, cân bằng kinh tế, test tự động (`game/test-*.mjs`) | Thay asset/art, đổi anchor nhân vật, kích thước món |

Khi một việc cần bên kia xử lý, **không tự sửa thay**. Ghi việc đó vào mục Action Items của báo cáo theo công thức 1 dòng, rồi cập nhật task trong `tasks.json`.

### 1.1. Cơ chế Tự Bàn Giao & Kích Hoạt Lẫn Nhau (Auto-Handoff)

- **Khi Antigravity hoàn thành các task UI (A*):** Tự động cập nhật `docs/office_hub/tasks.json` sang `Done`, ghi Action Items ngắn gọn (tối đa 20 từ/dòng), và chạy kiểm định `node game/test-*.mjs` ngay trong terminal.
- **Khi Codex hoàn thành các task Engine (C*):** Tự động cập nhật `tasks.json`, mở khóa các task A* tương ứng cho Antigravity, và chuyển cờ `active_turn: "Antigravity"`.
- **Khi Todo == 0 và 14/14 test PASS:** Chuyển trạng thái Sprint sang `READY_FOR_DIRECTOR` để Giám đốc bấm chuông duyệt bài.

## 2. Office Control Center — nơi báo cáo duy nhất

Từ nay, **mọi báo cáo và tiến độ** của Antigravity và Codex đều phải cập nhật vào:

- `docs/office_hub/reports/`
  - `ANTIGRAVITY_UI_REPORT.md`: báo cáo của Antigravity.
  - `CODEX_BACKEND_REPORT.md`: báo cáo của Codex.
- `docs/office_hub/tasks.json`: danh sách task giữa hai bên.

Dashboard: mở `docs/office_hub/index.html` (xem mục 5).

### Quy tắc báo cáo

1. Mỗi đợt làm việc phải cập nhật báo cáo của mình. Bàn giao chỉ dùng định dạng 1 dòng: `[Task ID] | [Status] | [File:Line] | [Metric/Next Action]`.
2. Cuối mỗi báo cáo **bắt buộc** có mục bàn giao, đúng tiêu đề sau để dashboard tô nổi bật:
   - Antigravity: `## Action Items for Codex (Backend/Logic)`
   - Codex: `## Action Items for Antigravity (UI/Art)`
3. Bằng chứng phải ghi rõ loại: **gameplay thật** (chỉ thao tác người chơi và thời gian engine) hay **fixture có kiểm soát** (state dựng sẵn). Không trình bày fixture như bằng chứng gameplay.
4. Không ghi “đã kiểm tra” cho bước chưa chạy thực tế.
5. Ảnh bằng chứng đặt trong `docs/mobile_gate_evidence/<đợt>/` và dùng đường dẫn tương đối. Không dùng `file:///C:/...`.

## 3. `tasks.json`

- `status` chỉ nhận một trong các giá trị: `Todo`, `In Progress`, `Review`, `Done`.
- `owner` chỉ nhận `Antigravity` hoặc `Codex`.
- `active_turn` chỉ nhận `Antigravity`, `Codex` hoặc `Director`.
- `handoffRound` đếm số vòng bàn giao (giới hạn tối đa 2 vòng).
- Mỗi task có `id` duy nhất. Quy ước: `C*` cho việc của Codex, `A*` cho việc của Antigravity, `HO-*` cho mốc bàn giao.
- Dùng `blockedBy` / `blocks` khi một task phụ thuộc task bên kia.
- Khi nhận việc, chuyển sang `In Progress`. Khi đã xong và chờ xác nhận, chuyển `Review`. Khi hoàn tất và test qua, chuyển `Done`.
- Mỗi lần sửa, cập nhật `updatedAt` và `updatedBy`.

## 4. Git

- Nhánh làm việc hiện tại: `codex/core-loop-completion`. **Không merge `main`** nếu chủ dự án chưa yêu cầu.
- Commit báo cáo/tasks cùng commit với thay đổi liên quan, hoặc ngay sau đó.
- Không commit file nháp trong `scratch/`.

## 5. Xem dashboard

Sau khi sửa `tasks.json`, báo cáo hoặc thêm ảnh bằng chứng, chạy lệnh:

```sh
python docs/office_hub/build_bundle.py
```
