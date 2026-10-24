# AGENTS.md — Quy ước làm việc giữa các agent

Repo này có hai agent cùng làm việc. Mọi agent (Antigravity, Codex hoặc agent mới) phải đọc file này trước khi bắt đầu.

## 1. Phân vai

| Agent | Phụ trách | Không tự ý làm |
|---|---|---|
| **Antigravity** | UI, art, asset, CSS, phần trình bày trong `game/main.mjs`, kiểm tra trên trình duyệt/mobile | Cơ chế gameplay, công thức, giao dịch, cân bằng kinh tế |
| **Codex** | Engine, logic, state, giao dịch, cân bằng kinh tế, test tự động (`game/test-*.mjs`) | Thay asset/art, đổi anchor nhân vật, kích thước món |

Khi một việc cần bên kia xử lý, **không tự sửa thay**. Ghi việc đó vào mục Action Items của báo cáo, rồi tạo task trong `tasks.json`.

## 2. Office Control Center — nơi báo cáo duy nhất

Từ nay, **mọi báo cáo và tiến độ** của Antigravity và Codex đều phải cập nhật vào:

- `docs/office_hub/reports/`
  - `ANTIGRAVITY_UI_REPORT.md`: báo cáo của Antigravity.
  - `CODEX_BACKEND_REPORT.md`: báo cáo của Codex.
- `docs/office_hub/tasks.json`: danh sách task giữa hai bên.

Dashboard: mở `docs/office_hub/index.html` (xem mục 5).

### Quy tắc báo cáo

1. Mỗi đợt làm việc phải cập nhật báo cáo của mình. Ghi rõ commit, phạm vi đã sửa, cách kiểm tra và giới hạn còn lại.
2. Cuối mỗi báo cáo **bắt buộc** có mục bàn giao, đúng tiêu đề sau để dashboard tô nổi bật:
   - Antigravity: `## Action Items for Codex (Backend/Logic)`
   - Codex: `## Action Items for Antigravity (UI/Art)`
3. Bằng chứng phải ghi rõ loại: **gameplay thật** (chỉ thao tác người chơi và thời gian engine) hay **fixture có kiểm soát** (state dựng sẵn). Không trình bày fixture như bằng chứng gameplay.
4. Không ghi “đã kiểm tra” cho bước chưa chạy thực tế. Nếu thiếu công cụ (ví dụ máy không có Node.js), phải nói rõ.
5. Ảnh bằng chứng đặt trong `docs/mobile_gate_evidence/<đợt>/` và dùng đường dẫn tương đối. Không dùng `file:///C:/...`.

## 3. `tasks.json`

- `status` chỉ nhận một trong các giá trị: `Todo`, `In Progress`, `Review`, `Done`.
- `owner` chỉ nhận `Antigravity` hoặc `Codex`.
- Mỗi task có `id` duy nhất. Quy ước: `C*` cho việc của Codex, `A*` cho việc của Antigravity, `HO-*` cho mốc bàn giao.
- Dùng `blockedBy` / `blocks` khi một task phụ thuộc task bên kia.
- Khi nhận việc, chuyển sang `In Progress`. Khi đã đẩy commit và chờ bên kia kiểm tra, chuyển sang `Review` và ghi `commit`. Chỉ chuyển `Done` khi đã được xác nhận.
- Mỗi lần sửa, cập nhật `updatedAt` và `updatedBy`. Đợt bàn giao mới thì cập nhật `currentHandoff`.

## 4. Git

- Nhánh làm việc hiện tại: `codex/core-loop-completion`. **Không merge `main`** nếu chủ dự án chưa yêu cầu.
- Commit báo cáo/tasks cùng commit với thay đổi liên quan, hoặc ngay sau đó.
- Không commit file nháp trong `scratch/`.

## 5. Xem dashboard

Sau khi sửa `tasks.json`, báo cáo hoặc thêm ảnh bằng chứng, chạy lệnh sau từ thư mục gốc repo:

```sh
python docs/office_hub/build_bundle.py
```

Lệnh này cập nhật `evidence.json` và `data.bundle.js`, để `index.html` mở trực tiếp bằng `file://` vẫn có dữ liệu. Nếu chạy qua HTTP (ví dụ `python -m http.server` tại gốc repo rồi mở `/docs/office_hub/`), dashboard đọc file trực tiếp và luôn hiển thị bản mới nhất.
