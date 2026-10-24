# Office Hub — duyệt và phản hồi có hành động thật

## Các thao tác của Giám đốc

| Thao tác | Kết quả |
|---|---|
| Phê duyệt đợt nộp | Lưu biên bản cho đúng snapshot; không tự chạy đề xuất hoặc mở Sprint mới |
| Ghi góp ý → Yêu cầu chỉnh sửa | Lưu yêu cầu, gửi trực tiếp Antigravity, chờ ACK và RESULT |
| Duyệt một đề xuất | Chỉ giao đúng đề xuất đó, không tự duyệt các đề xuất khác |
| Thử lại kiểm chứng | Kiểm thử và review lại kết quả đã có; không bắt agent làm lại UI |

Luồng sửa: **Góp ý → Đã gửi → ACK → Đang làm → RESULT → Test thật → Codex review → Chờ Giám đốc**.
Kết quả test/review PASS không thay thế quyết định Approve của Giám đốc.
Các số liệu lịch sử Sprint không chứng minh có worker đang chạy tại thời điểm hiện tại.

## Bằng chứng và trạng thái

- `workflow_state.json`: trạng thái điều phối; không chứa token.
- `reports/workflow/<request-id>/`: quyết định, ACK, STARTED, heartbeat, RESULT, test/review receipts.
- `reports/workflow/events.jsonl`: lịch sử append-only; ghi trước khi cập nhật state.
- `working` của Antigravity cần ACK/STARTED đúng nonce và heartbeat mới; hết 120 giây không có bằng chứng thì hiển thị chưa xác minh.
- Codex đang kiểm chứng/review khi có tiến trình thật, ghi PID và exit code.
- Lỗi hạn mức, đăng nhập hoặc CLI không phải verdict FAIL của sản phẩm. Không tự sửa thành Done.
- Retry có biên bản riêng, chốt snapshot hiện tại và kiểm thử lại nếu bản đã đổi. Không dùng PASS cũ cho mã mới.
- Tối đa 3 vòng review có verdict; không tự chạy vòng 4. Có giới hạn 6 lời gọi/giờ cho dịch vụ.

## Chạy dịch vụ

`python -m http.server` chỉ đọc file và không xử lý được quyết định. Dùng:

```powershell
python docs/office_hub/workflow_server.py --port 8990
```

Dịch vụ chỉ bind `127.0.0.1`, giữ nguyên URL static và thêm API `/api/office/state`, `/api/office/decision`.
POST yêu cầu đúng Origin/Host, JSON và action token của phiên. Không bật CORS công khai.
Để gửi Antigravity, tiến trình phải được khởi chạy từ môi trường phiên local đã được chủ sở hữu cho phép,
với `ANTIGRAVITY_LS_ADDRESS` và `ANTIGRAVITY_CSRF_TOKEN` trong bộ nhớ; không chép token vào file cấu hình.
Nếu Antigravity khởi động lại, cần xác minh lại kết nối. Không tự bỏ qua quyền của CLI.

`workflow_config.json` cấu hình Node, model và giới hạn. Codex review dùng Light/read-only;
dịch vụ không tự triển khai việc backend mới bằng Medium. Antigravity nhận tin trong phiên GUI hiện có và dùng model của phiên đó.
Luồng hiện tại giao UI cho Antigravity rồi Codex kiểm chứng; không giả vờ hỗ trợ mọi tuyến backend/gameplay.

`STOP` tại gốc repo hoặc `handoff/STOP` chặn giao việc mới và dừng tiến trình con local.
Tin đã gửi vào GUI không thể bị thu hồi; agent được yêu cầu kiểm tra STOP trước mỗi bước.

## Kiểm thử

```powershell
python -m unittest discover -s docs/office_hub -p test_workflow_server.py -v
```

Đây là kiểm thử backend trong thư mục và HTTP server tạm; không phải chứng cứ chạy game/browser production.
Test Approve bằng trình duyệt phải dùng fixture `--no-workers` ở cổng khác, không bấm duyệt bản thật thay Giám đốc.

## Khôi phục pending bị chặn

Sau khi xử lý nguyên nhân, POST `retry_review` với `requestId` và `expectedRevision` mới nhất.
Không sửa tay JSON thành PASS/Done, không xóa receipt lỗi trước và không tự chạy đề xuất chưa duyệt.
Nếu mã khác snapshot đã test, cần kiểm chứng bản hiện tại. Hệ thống lưu cả snapshot trước và sau retry.

## Duyệt theo ủy quyền

POST decision với actingAs=CodexDelegated ghi actor=Codex và hash biên bản DELEGATED_DIRECTOR.md.
Đây là attribution của quyết định trong phiên local đã xác thực, không phải tài khoản hay quyền truy cập mới.
Không tự phê duyệt khi chưa có verdict đạt. Mã đổi sau bàn giao sẽ Blocked, kể cả bấm lại.
Sau gói bốn việc, ghi báo cáo rồi bật STOP; không tự chạy đề xuất mới hoặc hẹn giờ ngày mai.

