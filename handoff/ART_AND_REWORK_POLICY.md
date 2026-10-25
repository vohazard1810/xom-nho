# Quy ước art và khắc phục lỗi lặp — 25/10/2026

Chỉ đạo trực tiếp của chủ dự án, áp dụng cho các đợt tiếp theo.

## Nhân vật và sản phẩm trong game

- Antigravity phụ trách tạo/chỉnh ảnh bằng skill hoặc công cụ tạo ảnh mà nó thực sự có. Báo rõ nếu công cụ không khả dụng; không tự nhận đã tạo.
- Trước khi tạo, đọc asset hiện có và chọn ảnh chuẩn: cùng nhân vật, nét vẽ, bảng màu, ánh sáng, góc nhìn, tỷ lệ và nền trong suốt khi cần.
- Ghi brief cụ thể: tên asset, đường dẫn mẫu, chi tiết phải giữ, kích thước, anchor và biến thể cần tạo. Không thay thiết kế đã duyệt ngoài phạm vi.
- Kiểm tra ảnh trong màn chơi thực tế ở 360px và 390px: không méo, không che thao tác, nhân vật và món ăn đồng bộ.
- Lưu nguồn tham chiếu, prompt, công cụ/model thực dùng, file kết quả và ảnh kiểm chứng trong báo cáo UI. Không lưu token.
- Codex kiểm tra tích hợp/logic và duyệt theo ủy quyền. Không tạo asset mới ngay chỉ vì có quy ước này.

## Khi sửa sai nhiều lần

- Mỗi lần trả bài phải ghi: lỗi quan sát được, cách tái hiện, mong đợi, ảnh/log chứng minh, tệp liên quan và tiêu chí đạt.
- Tối đa ba vòng review cho một yêu cầu. Vòng ba không đạt: Blocked; giữ lịch sử và bằng chứng, không tự đặt lại số vòng.
- Codex lập hướng dẫn khắc phục nguyên nhân: so sánh trước/sau, vị trí cụ thể, các bước sửa nhỏ theo thứ tự, điều cấm làm lại, cách kiểm tra từng bước.
- Nếu vẫn sai cùng nguyên nhân, đổi phương pháp: kiểm tra một bước nhỏ trước khi tiếp tục; không gửi lại nguyên văn yêu cầu cũ và không khẳng định chắc chắn hết lỗi.
- Công việc khắc phục tiếp theo phải liên kết yêu cầu Blocked, có phạm vi và tiêu chí mới rõ ràng, giữ nguyên lịch sử ba vòng. Không tự chạy vòng bốn bằng cách đổi id.
- Trợ lý giám đốc xử lý điều phối/duyệt thường lệ; chỉ báo chủ dự án khi cần quyết định vượt phạm vi hoặc không thể tiếp tục.
