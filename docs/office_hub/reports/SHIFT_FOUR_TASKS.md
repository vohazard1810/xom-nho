# SHIFT_FOUR_TASKS.md — Kế Hoạch Đóng Ca 4 Nhiệm Vụ Trọng Tâm (Shift Close Plan)

| Thông tin ca | Chi tiết |
|---|---|
| Mã Nonce | `FOUR-TASKS-20261024` |
| Request ID | `5ae9ba69-6bcd-42f1-9b15-011332460a79` |
| Thời điểm ghi nhận | 2026-10-24T09:12:00Z |
| Cam kết | Hoàn thành đúng 4 nhiệm vụ T1–T4; không mở rộng tính năng mới; kiểm chứng fixture cô lập; đóng băng file UI và nộp RESULT.json chờ Codex review rồi dừng ca làm việc hôm nay. |

## Bảng 4 Nhiệm Vụ Trọng Tâm (T1 – T4)

| Mã Task | Hạng mục | Trạng thái hiện tại | Tiêu chuẩn nghiệm thu |
|---|---|---|---|
| **T1** | Bàn làm việc & 4 nhân vật rõ ràng (Desks & Common Floor) | **Đã hoàn thành** (HTML & CSS) | Mỗi phòng có bàn làm việc thực tế (mặt bàn + chân bàn chạm sàn); Trợ lý đứng cạnh Giám Đốc trên cùng mặt sàn, không bay, không chồng lấn; mặt cả 4 nhân vật hoàn toàn sáng rõ dưới bóng thoại; responsive trên desktop & mobile. |
| **T2** | Mobile QA Lab bố cục gọn, chuẩn tỷ lệ (QA Frames & Captions) | **Đã hoàn thành** (HTML & CSS) | Khung máy 360x640 và 390x844 giữ tỷ lệ chuẩn (không bị bóp méo thành 20px); nhãn loại badge (`kind-fresh`, `kind-fixture`) và viewport rõ ràng; chế độ so sánh (compare) và lọc hoạt động trơn tru; không tràn viền. |
| **T3** | Chỉ số Kanban phân biệt rõ ràng (Kanban Counters & Unfinished) | **Đã hoàn thành** (HTML & JS) | Pills đếm: Tổng task, Số đang lọc, Chưa xong (Pending = 1: task A6 đang Review), Đã xong (Done = 19); phân biệt rõ ghi chú lịch sử với trạng thái thật; tuyệt đối không đổi Done giả. |
| **T4** | Kiểm thử cô lập Fixture Browser (Controlled-Fixture Acceptance) | **Đã hoàn thành 100% PASS** (Playwright test) | Đã chạy kịch bản tự động `verify_browser_interactions.py` trên fixture server cổng 8991 (`--no-workers`): POST `approve` thành công (200), POST `request_changes` thành công (200), đóng dialog bằng thẻ lồng `<span>✕</span>` và phím `Esc`; ghi lại đầy đủ 48 bước tương tác vào `browser_interaction.log`, nghiệm thu `BROWSER_VERIFICATION.json` và lưu 9 ảnh bằng chứng đầy đủ trên snapshot `9b26e608`. |
