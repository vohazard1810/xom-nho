# Bàn giao Antigravity — Xóm Nhỏ: bản đồ, nhiều quán và nhân sự

Nhánh nguồn: `codex/playable-active-idle`. Bản này nối tiếp gameplay nấu bằng tay tại commit `5c65f226`. Không tự merge vào main hoặc PR #1. Đọc file này và code hiện tại trước khi làm; tài liệu auto-only v0.7 cũ không còn là hợp đồng gameplay chính.

## 1. Mục tiêu đã triển khai

Người chơi khởi đầu tự bán một quán, sau đó tuyển quản lý, mở địa điểm mới, trực tiếp làm ở quán được chọn và để quản lý vận hành các quán khác. Các quán cùng một đồng hồ, vốn chung; menu, kho, công thức đã học, nâng cấp, khách và sổ giao dịch riêng. Hiệu quả tốt hơn khi chủ có mặt đến từ tốc độ chế biến và điều phối đơn, không phải cộng doanh thu miễn phí.

Vòng chơi: chọn nguyên liệu → làm món → giao khách. Không trả về auto-only ở quán người chơi đang đứng. Khi vắng chủ, quản lý tự chọn nguyên liệu/làm/giao qua cùng engine và cùng giao dịch thật. Kho thiếu thì mất khách; không sinh tiền theo phần trăm hoặc ghi doanh thu gán cứng.

## 2. Bản đồ và mở quán

| Địa điểm | Mốc sớm nhất | Đầu tư | Vốn phải giữ sau đầu tư | Khác biệt hiện thực |
|---|---:|---:|---:|---|
| Đầu hẻm | Ngày 1 | 0 | 0 | Khách xóm và NPC ngày đầu, menu linh hoạt |
| Cổng trường | Ngày 8 | 120.000đ | 80.000đ | Khách học sinh, nhu cầu bánh mì/trà tắc, bắt đầu tắt sữa đậu |
| Văn phòng | Ngày 15 | 250.000đ | 120.000đ | Khách công sở, nhiều khách vội, đồ ăn sáng/sữa đậu |

Ngoài ngày và tiền: mọi quán đang sở hữu phải đạt ít nhất 4 sao và có quản lý đi làm. Quán mới có sức chở 30, rổ cấp 1, chỗ ngồi cấp 1. Đầu tư ghi riêng dòng tiền, không trừ vào lãi gộp bán món. Các mốc/chi phí là thông số prototype, chưa chốt cân bằng thương mại.

Map đã là các điểm bấm trên sơ đồ đường xóm; chạm một điểm mới mở thẻ chi tiết. Hiện sơ đồ là UI tạm, cần art bản đồ Việt Nam. Quán cổng trường/văn phòng hiện dùng chung nền quán và bộ món đang có, chưa có cảnh/công thức độc quyền mới.

## 3. Chuẩn bị và chuyển quán

- Chuẩn bị kho/menu từng quán, bấm xác nhận; chỉ bắt đầu khi các quán mở hôm đó đều sẵn sàng.
- Quán người chơi không đứng bán phải có quản lý. Thiếu quản lý thì báo nguyên nhân và chặn mở ca; không âm thầm cho quán tự bán.
- Cho quán nghỉ hôm nay trên map: bỏ yêu cầu chuẩn bị/quản lý, không trả lương ca đó; nhân viên hồi sức. Không ghi khách vắng do ngày nghỉ thành lỗi nhân viên.
- Map mở trong ca sẽ tạm dừng cả hệ thống. Chỉ chuyển khi quán hiện tại không còn khách tại quầy/hàng chờ. Món đang làm không bị bỏ hoặc chuyển sang quán khác.
- Rời quán đang mở cần quản lý. Chọn quán mới giữ nguyên đồng hồ, kho, tiền và đơn của mọi địa điểm. Quán mới chọn trở về chế độ làm tay; quán vừa rời giao quản lý.
- Đây là chuyển ở khoảng nghỉ. Chưa cho đi lại tự do giữa món đang làm, chưa có cơ chế vận chuyển nguyên liệu giữa kho.
- Tạm dừng thủ công, quyết định bắt buộc và tab ẩn dừng mọi quán. Các quán không chạy bán/hao hụt khi người chơi thoát game.

## 4. Nhân sự đã có hành động thật

Phí tuyển 5.000đ/người. Một người/vị trí/quán. Hợp đồng và tay nghề lưu qua ngày. Lương thu đúng một lần khi mở ca, không thu khi nhân viên hoặc quán nghỉ.

| Vai trò | Mở từ ngày | Lương/ca | Tác dụng hiện thực |
|---|---:|---:|---|
| Phụ bếp | 4 | 6.000đ | Tăng tốc chế biến theo tay nghề/mệt |
| Quản lý | 8 | 10.000đ | Cho quán tự vận hành khi chủ vắng; đào tạo tăng tốc |
| Phụ dọn bàn | 6, cần chỗ ngồi | 4.000đ | Tăng tốc phục vụ; chưa có mô phỏng từng bàn bẩn |
| Giữ xe | 10, cần chỗ ngồi | 4.000đ | Thu hút 2–4 lượt khách theo tay nghề, hiện trong dự báo trước mua hàng |
| Tiếp hàng | 10 | 5.000đ | Thêm 15–25 đơn vị sức chở theo tay nghề; không tự mua hoặc sinh nguyên liệu |
| Đóng gói | 15, cần bật online | 4.000đ | Làm đơn online nhanh hơn theo tay nghề |
| Giao hàng | 15, cần bật online | 2.500đ | Giảm phí ngoài 1.500–1.900đ/đơn thành công theo tay nghề |

Hành động: tuyển, đào tạo (8.000đ, một lần/người/ngày, tối đa cấp 3), cho nghỉ/đi làm lại, điều chuyển quán, kết thúc hợp đồng có xác nhận. Vị trí cần chỗ ngồi/online kiểm tra cả quán nhận khi điều chuyển. Tiếp hàng nghỉ/chuyển/được đào tạo sẽ đổi sức chở ngay; mua hàng kiểm tra lại giới hạn.

Đi làm tăng mệt 18/100; nghỉ giảm 30. Mệt giảm hiệu quả làm món. Tinh thần có lưu và giảm khi quá mệt, tăng khi nghỉ/đào tạo; hiện chưa có nghỉ việc tự phát hoặc mô hình sai món theo tinh thần. Giữ xe hiện chưa xử lý người gây rối/tâm linh; không được báo tính năng đó đã hoàn tất.

## 5. Tổng kết ngày

Thẻ mỗi quán: khách phục vụ/lỡ, sao, doanh thu, giá vốn đã bán, kết quả sau lương/phí/hao hụt, lý do mất khách, feedback và gợi ý hành động. Có tình trạng nhân viên cuối ca.

Gợi ý bám nguyên nhân: hết hàng → sửa nhập hàng/sức chở; đợi lâu → đào tạo/phụ việc/chủ hỗ trợ; giá cao → sửa giá; chi phí cao → xem lương/hao hụt. Không mặc định phạt nhân viên vì quán lỗ.

Sổ chung đối soát:

`tiền cuối ngày = vốn chung đầu ngày − nhập hàng − chi vận hành − đầu tư − phí giao + doanh thu thực thu + tip + việc phụ`

COGS và hàng hỏng không trừ tiền mặt lần nữa. Kết quả sau chi phí không trừ đầu tư mặt bằng. Chỉ một NEXT_DAY tăng ngày cho mọi quán. Tổng kết tự chuyển sau 12 giây nhìn thấy; mở sổ dừng countdown. Với nhiều quán, lượt đọc tổng kết dài hơn có thể cần tinh chỉnh nhịp sau human playtest.

## 6. Source contract cần giữ

- `game/empire-engine.mjs`: `ensureEmpire`, `empireAction`, `advanceEmpire`, `openingEligibility`, `LOCATIONS`, `STAFF_ROLES`.
- `game/shift-engine.mjs`: chọn/nguyên liệu/làm/giao, engine ca bán; chấp nhận minuteRate chung khi nhiều quán.
- `game/day1-core.mjs`: giao dịch, batch cost, menu, nâng cấp và ledger. Không nhân bản sổ hoặc cash vào các tổng két độc lập.
- `state.empire`: version, activeShopId, shops[id].state (snapshot không chứa empire), employees, worldClock, shiftRunning, openingCash, report/history, map/staff UI flags.
- `state.cash` là vốn chung; cash trong snapshot là giá trị tạm lúc chạy transaction, không cộng các snapshot.cash để tính tài sản.
- Revision chung tăng đơn điệu, kể cả chuyển quán/countdown, để hai slot lưu không chọn nhầm save cũ. Snapshot, phase và mọi nhân viên đều serialize JSON.
- Save cũ một quán được chuyển thành quán đầu hẻm, giữ tên/ngày/tiền/kho/đơn. Phụ việc thuê ca ở bản trước được giữ đến hết ngày đó.

## 7. Bằng chứng và giới hạn nghiệm thu

- `node game/test-empire.mjs`: gate mở quán, hai kho, trả lương một lần, bán thật khi chủ vắng, clock chung, reload, đào tạo/nghỉ/chuyển/thay nhân sự, quán thứ ba, nghỉ quán, baseline Day 1. Campaign 15 ngày qua engine đang dùng, trong đó 8 ngày có nhiều quán; mọi sổ tiền ngày khớp. Xem `docs/empire_evidence/logic_report.json`.
- Existing Day 1, multi-day, balance, progression, 21-day manual shift, UI/timer tests pass. Các bộ cũ 21 ngày không phải một playtest mobile 21 ngày của map mới.
- `tools/playtest/empire_smoke.cjs`: browser thật với fixture khởi điểm Day 8/900k/4 sao, bấm tuyển/đào tạo/mở quán/nhập hàng/menu/nấu/giao, quán vắng bán thật, F5, chặn rời đơn, map pause, chuyển lúc nghỉ, Day 9 đồng bộ. Clock kiểm soát bằng Playwright để không chờ ca thật. Xem browser_smoke.json.
- Các nút map kiểm tra tại 360×640, 390×700, 430×932; không tràn ngang, ≥44×44 CSS px. Không thay thế kiểm tra bằng ngón tay trên máy vật lý.
- PNG: map.png, staff.png, live_map.png, result.png trong docs/empire_evidence. Screenshot là gameplay/UI thật; art map/nhân viên vẫn tạm.
- Không quay video, không chạy lại mobile gate bảy ngày theo thời gian thật. Không dùng kỹ thuật PASS để khẳng định gameplay vui/cân bằng hoàn thiện.

## 8. Yêu cầu Antigravity thực hiện tiếp

1. Đọc code/contract trên nhánh hiện tại và giữ vòng chơi nấu bằng tay.
2. Làm map xóm thuần Việt có ba địa điểm dễ nhận ra: hẻm nhà, cổng trường, văn phòng. Mỗi quán có thumbnail và nền riêng, cùng palette chibi màu nước. Đảm bảo nút và thông tin còn đọc rõ ở màn nhỏ.
3. Duyệt pilot một cảnh quán mới + một nhân viên trước khi nhân rộng. Dùng bộ Bé Tí làm mốc style; không dùng emoji thay nhân vật, không thừa tay, không chân đứng trên quầy.
4. Thể hiện người giữ xe ngoài cửa, phụ dọn ở khu ngồi, tiếp hàng mang giỏ/thùng, đóng gói ở quầy. Chỉ thể hiện động tác đúng feature đang có; không vẽ giả một cơ chế chưa chạy.
5. Hoàn thiện art nguyên liệu/bàn làm/món cuối, đặc biệt trứng và bánh mì ốp la còn placeholder. Giao món qua khay, chỉ một món xuất hiện ở một nơi; không quay lại overlay hai tay trước ngực khách.
6. UI map/staff/result ưu tiên ảnh, biểu tượng rõ nghĩa và số ngắn, hạn chế thẻ chữ dài. Không che mặt khách hoặc nút nấu/giao.
7. QA theo phạm vi: một món ăn, một thức uống, map/staff đã sửa, console/ảnh vỡ/touch target. Chỉ chạy gate nhiều ngày đầy đủ khi logic liên quán thay đổi hoặc bàn giao mốc lớn. Không quay video trừ khi owner yêu cầu.
8. Báo cáo Đã sửa / Nguyên nhân / Bằng chứng / Phần chưa xác thực. Gửi link commit và PNG; không tự merge PR. Chi phí/mốc mở và pacing chỉ đề xuất tinh chỉnh sau chơi tay, không tự đổi economy để làm đẹp screenshot.
