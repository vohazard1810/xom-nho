# Xóm Nhỏ — Gameplay 7 ngày, mô phỏng ổn định 21 ngày

**Trạng thái:** prototype luật chơi để duyệt và cân bằng, không phải bảng economy cuối cùng. Art nhân vật, món mới và hoạt ảnh khách vãng lai do Antigravity thay sau. Day 1 giữ fixture v0.7: 8 khách, giỏ gợi ý 55.000đ, 6 đơn thành công, 127.000đ tiền két, 67.000đ lãi gộp.

## Vòng chơi và tên quán

Bắt đầu lần đầu → đặt tên quán (2–24 ký tự, lưu cùng save) → Tin Xóm → Nâng cấp tùy chọn từ ngày 2 → Chợ → Menu/Giá/Giờ mở → Quán tự bán → Sổ cuối ngày → Ngày kế. Không có giới hạn cứng ở ngày 7; ngày 8–21 dùng cùng engine và quy tắc dữ liệu, để thử độ bền save/ledger. Tên quán chỉ là tên hiển thị, không gắn một sprite hay NPC cụ thể.

## Những giá trị tạm để chơi thử

| Hệ thống | Luật prototype |
| --- | --- |
| Vốn | 60.000đ Day 1; tiền cuối ngày mang sang ngày sau. |
| Xe | 20 đơn vị; nâng cấp lần 1 giá 30.000đ lên 30; lần 2 giá 45.000đ lên 45. |
| Quầy | Ban đầu 3 món; 25.000đ mở slot thứ 4, bánh mì ốp la và trứng. |
| Ghế | 20.000đ/lần, tối đa 2 lần; mỗi lần thêm 2 lượt khách tiềm năng. |
| Giá chợ | Tắc 2.000đ Day 1 → 3.000đ từ Day 2. Nước đường 2.000đ → 3.000đ từ Day 5. Một số ngày trứng 4.000đ thay vì 3.000đ. Tin được báo trước khi mua. |
| Bánh mì ốp la | Bánh mì + trứng + dưa ngò; giá chọn 24k/27k/30k, chỉ bật được sau khi mở quầy. |
| Tồn qua đêm | Nước đường khô giữ theo lô FIFO; đồ tươi, đá và trứng còn lại hỏng cuối ngày. Hao hụt có dòng riêng, không cộng vào COGS hàng bán và không trừ tiền mặt lần hai. |
| Sao | Day 1 khởi tạo 3.0; mỗi ngày sau +0.5 khi phục vụ ≥80%, −0.5 khi <50%, còn lại giữ; giới hạn 1–5. Từ 4 sao có thêm 2 khách tiềm năng. |
| Khách | 8 khách Day 1. Day 2+ lịch khách theo ngày, sự kiện, số ghế và sao; tối đa 20/ngày. `personId`, `name`, `visualVariantId` tách riêng; nhiều người có thể dùng một visual variant. |
| Cảm xúc | Khách vội có thoại gấp, khách vui vẻ có thoại thân thiện và tip 1.000đ (hoặc 2.000đ trong ngày hội); giá cao làm khách nhạy giá từ chối. Không có đồng hồ patience/hold-to-serve. |
| Sự kiện | Sáu tình huống đầu: mưa giảm 2 khách, tan học thêm 2, mở sớm ngày mệt tốn 3k tiền vận hành, ngày hội thêm khách và tip, sửa đường giảm 1 khách và tăng nhóm nhạy giá, ngày lãnh lương thêm 2 khách dễ chi tiêu. Từ Day 8 sự kiện lặp theo lịch xác định bởi số ngày để F5 không đổi kết quả. Tin và giá chợ hiển thị trước khi nhập hàng. |
| Giờ mở | 6h có một khách sớm từ Day 2, có thể chịu chi phí đã báo trước; 8h bình thường; 10h bỏ lỡ các khách trước 10h. |
| Cứu vốn | Nếu sáng ngày 2+ két dưới 11k, làm việc phụ một lần trong ngày nhận 15k; ghi riêng, không tính vào doanh thu bán món. |

Các số trên là **fixture cần playtest**, nhất là ngưỡng sao, phí nâng cấp và tốc độ khách tăng. Đổi chúng trong `game/day-content.mjs`; không chỉnh các con số trực tiếp trong phần render.

## Bất biến đối soát

`Tiền cuối = Tiền đầu − tiền nâng cấp − chi vận hành − tiền nhập + tiền bán thực thu + tip + thu việc phụ`.

`Lãi gộp = doanh thu bán món − COGS theo lô FIFO hàng đã bán`.

`Kết quả sau hao hụt = lãi gộp − hỏng hàng − chi vận hành + thu việc phụ`.

Mỗi lượt khách chỉ có một kết quả trong served/missed. Đóng sớm hạch toán các lượt chưa bán. Save giữa ca giữ ngày, tên quán, lô tồn, quyết định pause và sổ. Màn quán dùng art hiện có Day 1; egg/khách vãng lai chỉ có placeholder, chưa đạt gate art.

## Kiểm chứng

- `node game/test-day1.mjs`: ca Day 1 baseline và nhánh lựa chọn.
- `node game/test-multiday.mjs`: một đường chơi 21 ngày, một đường chủ động nhập hàng lên ≥4 sao trước Day 7, chuyển ngày, nâng cấp, cứu vốn, FIFO và hao hụt.
- `node game/test-ui.mjs`: smoke render tên quán, ngày mới, tin giá, khóa món và chi nâng cấp.
- Playwright/mobile 390×844 cần chạy trên máy có browser và đầy đủ asset để xác nhận tap, F5, pacing và art; Node test không thay cho gate này.
