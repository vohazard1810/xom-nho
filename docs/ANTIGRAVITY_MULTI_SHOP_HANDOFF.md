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

## 9. Bổ sung review UI mobile — phiếu gọi món và khả năng đọc

Đây là yêu cầu cần triển khai tiếp, chưa phải UI đã hoàn tất trên bản chơi thử. Review từ 5 ảnh điện thoại Owner gửi ngày 03/10/2026: tên món hiện nằm ở dòng nhỏ dưới hàng chờ; thoại như “phần quen thuộc” hoặc “phần ăn sáng” không cho biết chính xác món. Thẻ nhân sự ép tên/lương/điều kiện vào cùng hàng khiến chữ vỡ thành nhiều mảnh. Menu nhiều khoảng trống và thiếu ảnh thành phẩm.

### 9.1 Phiếu gọi món — ưu tiên P0

- Khách chính có phiếu cố định cạnh nhân vật: ảnh món thành phẩm + tên rõ ràng + số lượng thực tế, ví dụ “Sữa đậu đá ×1”. Phiếu giữ đến khi giao/đơn bị hủy; không tự biến mất theo bóng thoại.
- Yêu cầu đặc biệt chỉ hiển thị khi được engine hỗ trợ và quyết định xác nhận: ví dụ Bé Tí đồng ý thêm chả → “Thêm chả”. Không tự thêm ít đá/không đường vào UI khi engine chưa có các biến thể đó.
- Khách trong hàng chờ dùng thẻ gọn: tên, thumbnail món, tính cách/kiên nhẫn; chạm mở chi tiết đơn và hành động ưu tiên đang có. Không chỉ hiện tên khách + chữ “Vội”.
- Bàn chế biến nhắc món đang làm và tiến độ nguyên liệu đã chọn/còn thiếu. Dữ liệu phải lấy từ đơn/recipe thực tế, kể cả thay đổi sau quyết định thêm chả; không suy món từ thoại, archetype hoặc ảnh nhân vật.
- Phiếu dùng ảnh món cuối (bánh mì chả, trà tắc, sữa đậu đá, ốp la khi mở). Không dùng emoji, ảnh nguyên liệu hoặc cùng một ly cho mọi thức uống. Art thiếu phải ghi rõ placeholder trong báo cáo, không claim đã hoàn thiện.
- Thoại vẫn đời thường, nhưng không là nguồn duy nhất để biết đơn. Tên món chính tối thiểu 16 CSS px; mục tiêu đọc được ngay trên màn 360px, không cần phóng to.
- Chỉ khách chính có phiếu đầy đủ; khách chờ dùng thẻ nhỏ để tránh che cảnh. Phiếu không đè mặt, tay nhận món, món trên khay hoặc vùng chọn nguyên liệu/nấu/giao. Nếu cạnh khách không đủ chỗ, phương án thay thế là một dải phiếu đơn cố định ngay dưới cảnh quán; đề xuất pilot trước khi nhân rộng.

### 9.2 Menu, nhân sự và bố cục bán — P1

- Menu thêm thumbnail thành phẩm, thu gọn padding nhưng giữ nút giá/checkbox dễ chạm. Tên món, giá vốn ước tính và lời dự kiến phải đọc rõ, không đổi số liệu/công thức để khớp art. Món khóa có điều kiện mở riêng, không dồn vào cùng dòng với giá vốn.
- Nhân sự tách từng dòng: tên vai trò → lương/ca → tác dụng ngắn → điều kiện mở. Dùng thẻ dọc trong lưới hoặc một cột trên màn nhỏ; không ép bốn thông tin vào hàng ngang. Mục khóa vẫn đọc được, không giảm opacity cả thẻ đến mức mất tương phản.
- Màn bán ưu tiên thứ tự nhìn: khách gọi gì → chọn nguyên liệu → làm món → giao. Giảm hướng dẫn lặp; hàng chờ rỗng dùng một dòng gọn, không chiếm khối lớn. Giữ gameplay nấu tay và các nút tiếp cận được trên viewport nhỏ.

### 9.3 Nghiệm thu theo phạm vi

1. Chụp một đơn bánh mì có thêm chả, một đơn trà tắc, một đơn sữa đậu và một cảnh ít nhất 3 khách với món khác nhau. Kiểm tra phiếu đúng khách/đơn và cập nhật sau ưu tiên, thêm chả, giao, bỏ đi.
2. Kiểm tra tên món đọc rõ, ảnh thành phẩm phân biệt được; mặt khách, khay và nút thao tác không bị che tại 360×640 và 390×844. Vùng tương tác tối thiểu 44×44 CSS px.
3. Chụp menu và nhân sự trước/sau; kiểm tra text không tràn hoặc bị ép thành từng chữ. Test console/ảnh vỡ tại các màn sửa.
4. Không quay video hoặc chạy lại gate 7 ngày cho thay đổi art/CSS này. Nếu sửa dữ liệu đơn/logic đặc biệt thì chạy test đơn tương ứng, không gán PASS chỉ từ screenshot.
5. Báo cáo rõ đây là UI vừa triển khai hay chỉ concept; gửi commit, ảnh gameplay thật và phần chưa verify. Owner duyệt pilot rồi mới làm hàng loạt.

## 10. Nghiệm thu Section 10: Thu gọn phiếu, tách thoại, không che khuất 360×640, phép đo touch-target thật và test điều phối bằng engine nấu tay thật

Đã hoàn thành toàn bộ các yêu cầu của Section 10 theo đúng phạm vi hẹp:

1. **Khắc phục che khuất ở màn nhỏ 360×640**:
   - Tách lời thoại khách thành component độc lập `.customer-speech-bubble` đặt cạnh khách ở góc trái/giữa cảnh (`left: 20%; top: 8px`).
   - Thu gọn phiếu gọi món `.customer-order-callout` chỉ gồm: ảnh món thành phẩm, tên món (16px bold), số lượng `×1`, tên khách & tag `⚡ Vội` / `⭐ Thêm chả`. Chiều cao phiếu giảm từ ~90px xuống **40.0px**.
   - Khoảng cách an toàn đo được bằng DOM thực tế giữa đáy phiếu gọi món và đỉnh đầu Bé Tí trong hẻm là **30.8px** (không còn bất kỳ sự chồng lấn/che khuất nào). Bé Tí và khách chờ trong hẻm có tầm nhìn thông suốt 100%.

2. **Hiển thị đầy đủ tên món hàng chờ (không bị cắt dấu ba chấm)**:
   - Tách thẻ hàng chờ thành 2 dòng riêng biệt:
     - Dòng 1 (`.queue-cust-line`): Tên khách (`Bé Tí`, `Cô Chín`, `Anh Tùng`) và trạng thái cảm xúc / tính cách (`Bình tĩnh`, `⚡ Vội`).
     - Dòng 2 (`.queue-dish-line`): Tên món đầy đủ (`.queue-dish-name`) với `font-weight: 800; overflow: visible; text-overflow: clip;`.
   - Kết quả: Không còn tình trạng "Bánh mì c..." mà hiển thị đầy đủ 100% "Bánh mì chả", "Trà tắc", "Sữa đậu đá".

3. **Ghi nhãn ảnh hiện tại thành Fixture bố cục**:
   - Toàn bộ 8 ảnh `shot_01` đến `shot_08` đã được đánh nhãn chính thức là `Fixture bố cục (Layout Fixtures)` trong `section9_report.json` và tài liệu để phân biệt rõ ràng với ảnh chụp từ gameplay liên tục 7 ngày.

4. **Đo đạc Touch-Target từ phép đo thật trên DOM**:
   - Sử dụng `getBoundingClientRect()` và `document.elementFromPoint()` đo trực tiếp toàn bộ 14 nút tương tác (Khay nguyên liệu, Thao tác bếp, Điều khiển ca, Thẻ hàng chờ).
   - Kết quả: 14/14 nút đều đạt kích thước $\ge 44\times 44$ CSS px (từ 44.0px đến 89.8px) và 100% reachable (không bị che chắn bởi phần tử khác). Tính `touch_target_pass = True` từ mảng số liệu thật được lưu trong `section9_report.json`.

5. **Kiểm thử 3 chế độ điều phối dùng Engine nấu tay thực tế**:
   - Viết lại toàn bộ `tools/playtest/test_three_coordination_modes.py`: loại bỏ hoàn toàn `_prepProgress` và `SERVE_AUTO`.
   - Sử dụng trực tiếp `cookingAction(s, 'ADD_INGREDIENT')`, `cookingAction(s, 'COOK')`, `cookingAction(s, 'SERVE')`, `cookingAction(s, 'PRIORITIZE')`, `cookingAction(s, 'FOCUS_BOOST')` và `advanceShift(s, ms)`.
   - Kết quả đối soát và assertions:
     - **Mode 1 (Không can thiệp - FIFO)**: Bác Ba phục vụ (5.4m), Chị Mai phục vụ (9.0m), Anh Tùng bỏ lỡ do sốt ruột `WAIT_TOO_LONG` (9.4m). Phục vụ: 2/3, Bỏ lỡ: 1/3, Doanh thu: 40.000đ.
     - **Mode 2 (Ưu tiên khách vội - PRIORITIZE)**: Bác Ba phục vụ (5.4m), Anh Tùng được đôn lên phục vụ kịp thời (8.0m, SERVED), Chị Mai kiên nhẫn chờ và được phục vụ (14.6m, SERVED). Phục vụ: 3/3, Bỏ lỡ: 0/3, Doanh thu: 57.000đ.
     - **Mode 3 (Dùng Focus Boost - Chế biến x2)**: Chế biến x2 giúp Bác Ba (4.6m) và Chị Mai (6.8m) hoàn tất nhanh chóng, giải phóng quầy kịp trước khi Anh Tùng hết kiên nhẫn (10.0m, SERVED). Phục vụ: 3/3, Bỏ lỡ: 0/3, Doanh thu: 57.000đ.

6. **Bàn giao một đơn thao tác thật từ chọn nguyên liệu đến giao khách**:
   - `shot_order_step1_select.png`: Người chơi chạm khay chọn Bánh mì, Chả lụa, Dưa ngò. Bàn thớt hiện nguyên liệu rơi xuống, checklist hiện 3 tick xanh `✓`.
   - `shot_order_step2_ready.png`: Bấm "Làm món", hoàn tất chế biến hiển thị bánh mì chả hoàn chỉnh "Xong rồi! Giao khách nào", nút chính chuyển xanh "Giao khách →".
   - `shot_order_step3_served.png`: Bấm "Giao khách →", món xuất hiện trên khay gờ quầy, Bé Tí giơ tay nhận món với lời cảm ơn, tiền két tăng `+25.000đ` (từ 120.000đ lên 145.000đ).
   - Cam kết: Không quay video, không chạy lại gate 7 ngày.
