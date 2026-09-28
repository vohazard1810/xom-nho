# Bé Tí ORDER — kế hoạch chuyển canvas và đo anchor

Ngày: 2026-09-28 (Asia/Bangkok). Phạm vi: bốn PNG `ORDER` đã duyệt visual trên nhánh `docs/be-ti-static-production`.

**Cập nhật duyệt:** Chủ dự án đã trực tiếp xem `order_canvas_anchor_detail.png` tại commit `7a8188c` và xác nhận `feet`, `head`, `hand_right` đều PASS về vị trí ngữ nghĩa trên cả bốn frame. Bằng chứng phiên bản/giá trị tọa độ nằm trong `canvas_960x1704/order_anchor_human_review.json`. PASS này ràng buộc với SHA-256 của overlay, mapping và từng frame; nếu sinh lại bất kỳ file nào, phải đối chiếu hash trước khi chuyển kết quả duyệt. Ở thời điểm duyệt anchor, cách đóng gói chưa được chọn; manifest tiếp tục đóng băng.

**Cập nhật đóng gói:** Chủ dự án đã chọn Actor Crop + offset cho bản thử. `prepare_order_actor_crop.py` lấy union alpha bbox chung `(577,954,707,1230)`, xuất bốn PNG 130×276 và `actor_crop/order_actor_crop_metadata.json`. Ghép mỗi crop tại offset `(577,954)` tái dựng đúng **0 pixel khác** so với bản sân khấu; đổi tọa độ crop-local sang sân khấu cho cả ba anchor có sai số **0 px**. `tools/animation-harness/?orderCandidate=1` đọc bộ crop ở chế độ candidate và chạy ORDER one-shot rồi dừng tại frame 04. Đây là phép kiểm tự động và tích hợp thử; vẫn cần người dùng xem playback render thực tế trước khi nối vào manifest. Nhật ký kiểm tra: `actor_crop/actor_crop_integration_qc.json`.

## 1. Bằng chứng và ranh giới

- Chủ dự án xác nhận đã mở `tools/animation-harness/order-candidate.html`, bấm qua bốn frame ở hộp CSS 120×124, quan sát cả hai đế giày bám vạch sàn và hành động giơ tay tự nhiên. Đây là **PASS kiểm tra thủ công trên web viewer**, không phải ghi hình điện thoại vật lý hoặc state production PASS.
- Bốn PNG nguồn nằm dưới `assets/characters/named/be_ti/candidates/alternate_model_v1/order_four_frame_pilot/`. Không chỉnh sửa hoặc ghi đè chúng.
- `manifest.json` dùng canvas sân khấu 960×1704 và actor Bé Tí trong harness nằm gần `left: 68%`, `top: 72%`, `width: 25%`. Canvas 960×1704 không có nghĩa sprite phải chiếm toàn bộ màn hình.

## 2. Phép fit chung

Script `tools/animation-qc/prepare_order_canvas.py` tạo bốn **bản ghép thử lên toàn sân khấu** 960×1704. Mỗi bản giữ alpha và cùng phép chiếu; không được nạp bản sân khấu này như ảnh `<img>` bên trong hộp actor hiện tại vì sẽ bị scale hai lần.

| Thuộc tính | Giá trị / quy tắc |
| --- | --- |
| Canvas nguồn | 1128×1394, RGBA PNG rời |
| Canvas đầu ra | 960×1704, nền alpha trong suốt |
| Chiều rộng để fit | 240 px = 25% sân khấu, theo hộp Bé Tí hiện tại |
| Chiều cao sau fit | `round(1394 × 240/1128) = 297` px |
| Điểm x actor, vạch sàn | `round(960×0.68)=653`, `round(1704×0.72)=1227` |
| Nguồn feet tham chiếu | trung điểm x hai mép đế `(507+732)/2=619.5`; y của đế thấp nhất `1339` |
| Phép chiếu | `x' = 521 + x×240/1128`; `y' = 942 + y×297/1394` |

Sai khác tỷ lệ X/Y do làm tròn kích thước ảnh ra pixel nguyên là khoảng 0,14%. Lấy **cùng một** phép chiếu từ frame đầu và áp dụng cho cả bốn frame; không căn giữa từng alpha bbox riêng lẻ. Kết quả feet trên sân khấu là `(652.81, 1227.28)` cho cả bốn frame.

## 3. Anchor nguồn và nghĩa sử dụng

| Anchor | Cách đo từ PNG nguồn | Mục đích | Trạng thái |
| --- | --- | --- | --- |
| `feet` | Đáy alpha >127 ở hai vùng giày: trái `(507,1339)`, phải `(732,1328)`; x trung điểm, y đế thấp hơn | Actor đặt trên mặt đất | Đo pixel và chủ dự án xác nhận tiếp xúc chân ở viewer; vị trí pivot giữa hai giày trên sân khấu cần xem overlay |
| `head` | Y trên cùng của silhouette tóc alpha >127 trong ROI đầu; x giữa bề rộng ROI có pixel | Điểm tham chiếu speech bubble trên tóc | Điểm đề xuất, chờ xác nhận ngữ nghĩa |
| `hand_right` | Trung vị pixel màu da alpha >220 trong ROI lòng bàn tay theo từng frame | Vị trí cử chỉ tay giơ | Điểm đề xuất, chờ xác nhận ngữ nghĩa |
| `receive_point` | Không đo trong ORDER | Dành cho RECEIVE/HANDOFF | `null` |

Các ROI và ngưỡng được ghi trong script và log `order_canvas_mapping.json`. Ảnh `order_canvas_anchor_detail.png` đánh dấu chính xác vị trí đề xuất trên từng PNG đã fit. Nếu vị trí `head`/`hand_right` cần dịch để dùng trong game, ghi tọa độ đo lại cùng hình overlay; không sửa ngầm metadata để khớp bằng mắt.

## 4. Chạy lại và cổng tiếp theo

```bash
python tools/animation-qc/prepare_order_canvas.py \
  --input-dir assets/characters/named/be_ti/candidates/alternate_model_v1/order_four_frame_pilot \
  --output-dir assets/characters/named/be_ti/candidates/alternate_model_v1/order_four_frame_pilot/canvas_960x1704
```

Script từ chối ảnh nguồn sai SHA-256 so với QC, sai canvas/alpha hoặc chân không giống nhau từ `Y=1025`; đầu ra có SHA-256, anchor nguồn/sân khấu, transform và ảnh overlay. `order_manifest_candidate.json` là dữ liệu đề xuất có `source_file`, `stage_preview_file` và `anchors_proposed`, **không có khóa `file`** để tránh bị dùng nhầm như frame production. Cần đối chiếu thêm trên sân khấu/hộp actor thật để quyết định dùng bản actor-crop hay metadata origin/trim; không thêm bốn PNG sân khấu vào manifest như drop-in sprite. Timing one-shot, test trên thiết bị thật và tích hợp Day 1 là các gate riêng. Manifest và animation runtime giữ nguyên trong bước chuẩn bị này.
