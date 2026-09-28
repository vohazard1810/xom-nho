# XÓM NHỎ — Bé Tí: kiểm kê và kế hoạch state tại chỗ v1

Date: 2026-09-28 (Asia/Ho_Chi_Minh)  
Status: DRAFT / chưa có art production được xác nhận

## 1. Nguồn và vị trí thật

Repo: `vohazard1810/xom-nho`. Đã tìm bằng `git log --all --name-only` và kiểm tra tree của bốn nhánh.

| Nhánh | Đường dẫn | Vai trò |
| --- | --- | --- |
| `chore/baseline-import` | `ASSET_SYSTEM.md`; `tools/animation-harness/manifest.json`; `tools/animation-qc/measure_frames.py`, `validate_manifest.py` | Bản baseline của hệ thống asset/QC |
| `fix/animation-qc-measurement-bridge` | Các đường dẫn trên, thêm `tools/animation-qc/scale_consistency_check.py` | Kiểm tra hash và độ ổn định kích thước |
| `art/be-ti-textured-rig-style-review` | Các đường dẫn trên; `assets/characters/named/be_ti/candidates/identity-v1.png`, `walk-01-v1.png` | Bản art/QC mới nhất được thấy trong bốn nhánh; PNG là candidate |
| `main` | Không có các đường dẫn kể trên | Không dùng riêng `main` để kết luận asset/QC không tồn tại |

Tài liệu người dùng cung cấp trong phiên: `NPC_STATE_MACHINE_v1.md` và `CHARACTER_RIG_PIPELINE_v1.md`. Phần này dùng Asset System v0.4 ở nhánh art cùng manifest hiện hữu làm chuẩn triển khai, không tự sửa tài liệu đã freeze.

## 2. Kết luận kiểm kê

- Manifest `tools/animation-harness/manifest.json` ở nhánh art có `gate_status: BLOCKED_AWAITING_PRODUCTION_FRAMES`; toàn bộ mảng frame của Bé Tí và shopkeeper còn rỗng.
- Hai PNG dưới `candidates/` không phải bộ animation production. Harness README nói rõ đang dùng placeholder và chưa thể xác nhận visual PASS.
- Bốn WebP `idle/step_a/step_b/step_c` của bản playtest là bằng chứng hiển thị trong game, không chứng minh các state tại chỗ hoặc handoff đạt gate này.
- `measure_frames.py` chỉ đo PNG thật: định dạng, alpha, hash, kích thước và alpha bbox; `semantic_anchors` vẫn `null` để người kiểm tra xác định từ frame thật.
- Chạy `validate_manifest.py` trên manifest hiện tại cho kết quả `gate_status: BLOCKED`; feet, handoff và người duyệt wait variant đều bị chặn.

Không có state tại chỗ nào có thể gọi là PASS theo manifest này. Đây là kết luận về bằng chứng hiện có, không phủ nhận việc người dùng đã duyệt tạo hình tham chiếu.

## 3. Phạm vi đúng: state lifecycle và presentation

`ASSET_SYSTEM.md` định nghĩa 12 lifecycle states gồm `SPAWN`, `WALK`, `ARRIVE`, `QUEUE_WAIT`, `ORDER`, `CONFLICT_WAIT`, `RECEIVE`, `REFUSED`, `REACT`, `PAY`, `LEAVE`, `DESPAWN`. `SPAWN` và `DESPAWN` thường không có sprite. `SPECIAL_REQUEST` là presentation/UI branch từ ORDER; 4 frame trong manifest dành cho presentation clip, không thành lifecycle state thứ 13. `AUTO_PREPARE` không phải animation NPC.

| Nhóm production Bé Tí | Manifest hiện tại | Số PNG theo manifest | Track |
| --- | --- | ---: | --- |
| `QUEUE_WAIT` normal/deprioritized/reserved_for_other/stock_pending | 4 mỗi variant | 16 | Tại chỗ |
| `ORDER` | 4 | 4 | Tại chỗ |
| `SPECIAL_REQUEST` presentation | 4 | 4 | Tại chỗ + UI branch |
| `CONFLICT_WAIT` | 4 | 4 | Tại chỗ |
| `RECEIVE` | 4 | 4 | Tại chỗ, cần shopkeeper HANDOFF để QC tiếp xúc |
| `REFUSED` | 3 | 3 | Tại chỗ |
| `REACT` positive/neutral/negative | 4 mỗi variant | 12 | Tại chỗ |
| `PAY` | 4 | 4 | Tại chỗ |
| **Tổng nhóm tại chỗ** | | **51** | Các slot dự kiến, chưa phải 51 frame đã sản xuất |
| `ARRIVE` | 4 | 4 | One-shot có phần di chuyển; track rig B1, chưa xếp vào 51 frame tại chỗ |
| `WALK` và `LEAVE` | 6 + 6 | 12 | Track rig B1 |

Số 51 là phép cộng từ manifest hiện hữu, không phải định nghĩa mới hoặc yêu cầu tạo tất cả trong một đợt. `idle.webp` của demo chưa có mục `IDLE` riêng trong manifest lifecycle; có thể là presentation của `QUEUE_WAIT.normal`, nhưng phải đối chiếu ngữ nghĩa trước khi tái sử dụng, không tự thêm state.

## 4. Thứ tự sản xuất và gate

1. **Identity baseline:** chọn một ảnh Bé Tí được người dùng chấp nhận làm tham chiếu về mặt/tóc/khăn/ba lô/tỷ lệ ở kích thước game; ghi rõ phiên bản và nguồn. Duyệt hình không đồng nghĩa frame production PASS.
2. **Mẫu tại chỗ:** bắt đầu `QUEUE_WAIT.normal`; xuất từng PNG độc lập có alpha gốc, frame_count và timing đúng manifest. Đặt file trong `assets/characters/named/be_ti/queue_wait/normal/` và khai báo mỗi file đúng đường dẫn trong manifest. Không crop composite rồi đổi nhãn thành production.
3. **Đo pixel:** chạy `measure_frames.py` trên chính danh sách PNG, lưu hash/dimensions/alpha bbox. Ghi semantic feet/head/hand/receive anchors bằng tọa độ đo trên PNG; nếu chưa đo, giữ `null`/`NOT_MEASURED`. Per-frame trim/origin metadata xử lý sai biệt nguồn, không dời world actor để che lệch chân.
4. **Kiểm tra trong harness:** xem ở tỷ lệ game, baseline chân, độ ổn định tạo hình và sự khác biệt giữa các variant mà không dựa vào nhãn. Mở rộng từ một mẫu sang các state tại chỗ còn lại; không nhân sang NPC khác khi Bé Tí chưa đạt gate đại diện.
5. **Handoff:** `RECEIVE` chỉ có thể xác nhận đồng bộ khi có frame shopkeeper `HANDOFF` và một food + một drink product với anchor thật; đối chiếu thời điểm chuyển và sai số ở timeline chung.
6. **Báo cáo:** tách `PIXELS_MEASURED_ANCHORS_PENDING`, `MEASURED`, `BLOCKED`, `FAIL`, `PASS` theo đúng bằng chứng. Chỉ gọi state PASS khi log đo, manifest, playback/screenshot và người review thực tế cùng hỗ trợ kết luận đó. Gate full lifecycle vẫn BLOCKED trong khi WALK/ARRIVE/LEAVE chưa qua track rig.

## 5. Điểm chưa đồng bộ trong nguồn, chưa tự sửa kiến trúc

1. `NPC_STATE_MACHINE_v1.md` mô tả `ORDER → AUTO_PREPARE`; Asset System v0.4 §4A xác định luồng runtime hiện tại phải là `ORDER → [SPECIAL_REQUEST?] → RECIPE_ASSEMBLY → VALID_COMMIT → PREPARE_FOOD/DRINK → HANDOFF ↔ RECEIVE`. Cần cập nhật chú giải runtime ở tài liệu freeze theo quy trình thay đổi riêng; không dùng bản cũ để bỏ qua thao tác assembly trong game.
2. Khi tài liệu này được soạn lần đầu, `validate_manifest.py` chưa duyệt bốn `QUEUE_WAIT` và `REFUSED`. Nhánh QC tiếp theo đã bổ sung các mục này, kiểm tra số frame và từ chối anchor không hữu hạn; `scale_consistency_check.py` đã bao gồm `QUEUE_WAIT` trong phép so chiều cao. Script riêng lẻ vẫn không thể xác nhận người thật đã duyệt art hoặc frame đã qua full lifecycle gate.
3. Script handoff hiện lấy frame cuối của HANDOFF/RECEIVE để tính khoảng cách; Asset System §17C yêu cầu transfer frame được chỉ định và timeline trước/sau tiếp xúc. Cần marker và kiểm tra theo timeline; không xem phép đo frame cuối là đủ.
4. Rig document gọi `ankle_pivot` là feet anchor. Pivot khớp cổ chân và điểm đế giày chạm đất cần lưu tách để thử chân trụ; góc xoay một mình không khóa world contact. Đây là việc của track locomotion B1, không sửa frame tại chỗ để che lỗi.

## 6. Ranh giới

- Không đổi 12 lifecycle states, không thêm nhánh chơi hoặc đổi tốc độ animation trong đợt tài liệu này.
- Không gọi `ARRIVE` toàn bộ là pose tại chỗ; phần di chuyển giữ ở B1.
- Không dùng concept sheet, preview composite hoặc bốn WebP playtest để tự ghi PASS.
- Chỉ nhân sang Cô Chín/Anh Tùng/Chú Năm sau khi representative Bé Tí qua gate trong harness như Asset System §17B–18 quy định.

## 7. Bằng chứng kiểm tra tài liệu này

Lệnh tìm file: `git log --all --name-only --pretty=format: | rg -i 'asset|measure_frames'`.  
Lệnh xác minh gate: `python tools/animation-qc/validate_manifest.py tools/animation-harness/manifest.json -o /tmp/xom_be_ti_validation_report.json`.

Output tại thời điểm soạn bản đầu, trước khi mở rộng validator (nguyên văn):

```json
{
  "feet_anchor_consistency": {
    "status": "BLOCKED",
    "result": null,
    "missing": [
      "ORDER:no_frames",
      "SPECIAL_REQUEST:no_frames",
      "CONFLICT_WAIT:no_frames",
      "RECEIVE:no_frames",
      "REACT.positive:no_frames",
      "REACT.neutral:no_frames",
      "REACT.negative:no_frames",
      "PAY:no_frames"
    ]
  },
  "handoff_sync": {
    "status": "BLOCKED",
    "result": null
  },
  "wait_readability_human": {
    "status": "BLOCKED"
  },
  "gate_status": "BLOCKED"
}
```

Đây là tài liệu triển khai và kiểm kê, không phải biên bản duyệt art.
