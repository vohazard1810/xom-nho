# BIÊN BẢN NGHIỆM THU: 3 TÁC VỤ GAME (GAME-THREE-20261025)
**Nonce**: `GAME-THREE-20261025`  
**Trạng thái**: `READY_FOR_CODEX`  
**Ngày hoàn tất**: 2026-10-25  
**Actor**: Antigravity (UI Implementation & Evidence Verification)  
**Ủy quyền duyệt**: Codex (theo ủy quyền của Chủ dự án)

---

## 1. TỔNG QUAN KẾT QUẢ TRIỂN KHAI

Antigravity đã hoàn tất trọn vẹn phần giao diện người dùng và kiểm chứng thực tế cho cả 3 tác vụ theo đúng hợp đồng selector API thuần từ Codex (`game/shop-insights.mjs`, commit `415ef6a`):

| Task ID | Giao diện | Selector Codex | Hiện thực UI & Quy chuẩn dữ liệu |
| :--- | :--- | :--- | :--- |
| **A-G3** | **MENU** | `menuPricePreview(state)` | Khối thông tin giá vốn (`estimatedUnitCost`), giá bán (`sellPrice`), lãi gộp (`estimatedGrossProfit`) và tỷ suất (`marginRate`). Huy hiệu cảnh báo rõ ràng khi lãi âm (`risk: 'loss'`, đỏ đậm) hoặc hòa vốn (`risk: 'break_even'`). Ghi chú disclaimer chuẩn xác: *"Ước tính theo giá chợ hôm nay, chưa trừ lương/chi phí vận hành, không cam kết lượng mua khi giá cao. Không tự ý sửa giá."* Không có nút tự động đổi giá. |
| **A-G4** | **MARKET** | `marketFreshnessPreview(state)` | Từng thẻ hàng được gắn nhãn lưu trữ rõ ràng: **`🌱 Dùng trong ngày; dư cuối ca bị bỏ`** (`same_day`) và **`📦 Giữ qua đêm`** (`overnight`). Thanh dock giỏ hàng phân rẽ chính xác: Tiền hàng tươi (`freshCost`), Tiền hàng khô (`carryoverCost`), Tổng giỏ (`totalCost`). Ghi chú disclaimer chuẩn: *"Hàng tươi dư bị dọn bỏ ngay lúc kết thúc ca (CLOSE), hàng khô giữ lại qua đêm. Giỏ hàng chưa thanh toán."* |
| **A-G5** | **DAY_RESULT** & **EMPIRE_RESULT** | `missedDemandSummary(shopState)` | Hàm helper dùng chung `renderMissedDemandBreakdown(summary)` hiển thị: danh sách món lỡ, số lượng khách bỏ đi, chi tiết nguyên nhân (`reasons`). Khi `totalMissed === 0`, hiển thị thông điệp tích cực: *"✨ Không có khách nào bị lỡ món trong ca! Toàn bộ khách ghé đều được phục vụ chu đáo."* Đảm bảo đọc chính xác `shop.state` từ `empire.shops[shopId]` độc lập cho từng quán trong chuỗi đa quán. |

---

## 2. TOÀN VẸN MÃ NGUỒN & HASH CHECK (INTEGRITY HASHES)

| Tệp nguồn | Trạng thái | SHA-256 Checksum |
| :--- | :--- | :--- |
| `game/shop-insights.mjs` | **BẢO LƯU TUYỆT ĐỐI (Codex logic)** | `72c84e74f8ebeab0d1cee2cafc09ba8241782e4d7a13bdf3058186c7a39161cf` |
| `game/main.mjs` | Chỉnh sửa UI (nhận selector & render) | `c4ae7be565dac115bfbdc6f7e2546e1daba79158012921d2303aea3d7bc5f011` |
| `game/style.css` | Thêm style UI scoped | `d4a3e3f65f1bcad827864acd86246335affecfd7bd053cf14880be56a94c3f6c` |

*Cam kết tuân thủ:*
- Không chỉnh sửa `game/day1-core.mjs`, `game/empire-engine.mjs` hay các test logic.
- Không vẽ asset hình ảnh mới (tuân thủ `handoff/ART_AND_REWORK_POLICY.md`).
- Giữ nguyên toàn bộ logic giao dịch, giá, `SAVE_KEY`, và baseline kiểm thử Day 1 (127k két / 67k lãi).
- Không commit toàn bộ live repo đang dirty; đóng băng CSS và mã nguồn sau khi nộp báo cáo.

---

## 3. CÔNG CỤ & PHƯƠNG THỨC KIỂM THỬ THỰC TẾ
- **Công cụ thực dùng**: Python 3.13 + Playwright (Headless Chromium) trực tiếp thực thi ứng dụng web trong DOM thực tế, nạp các state fixture độc lập mô phỏng chính xác chu trình gameplay Day 1 và chuỗi đa quán Empire.
- **Môi trường màn hình kiểm chứng**:
  - `360x640` (Mobile viewport tiêu chuẩn)
  - `390x844` (Mobile viewport iPhone tiêu chuẩn)

---

## 4. DANH MỤC BẰNG CHỨNG HÌNH ẢNH (11 ẢNH KIỂM CHỨNG)

Tất cả ảnh bằng chứng đã được lưu trữ tại `docs/mobile_gate_evidence/game_three/`:

| Tên tệp ảnh | Kích thước | Dung lượng | SHA-256 Checksum | Mô tả nội dung kiểm chứng |
| :--- | :---: | :---: | :--- | :--- |
| `01_menu_price_tiers_360x640.png` | 360×640 | 37,671 B | `b44d13124dd599d6613a0755a03a3267c04666e3dbb725d5e3ff4b63cbbb80ed` | Màn MENU: Giá bán 25.000đ, vốn 11.000đ, lãi gộp 14.000đ (56.0%), nhãn Lãi xanh |
| `01_menu_price_tiers_390x844.png` | 390×844 | 54,979 B | `e43b37e2cebbe2a4fd235f34d5a31851a1c18b5bba6633a9350b0af9a30bae7a` | Màn MENU: Giá bán 25.000đ, vốn 11.000đ, lãi gộp 14.000đ (56.0%), nhãn Lãi xanh |
| `02_menu_loss_warning_360x640.png` | 360×640 | 37,471 B | `20e73818670c5f7582aa44217e45e0f4d2711d4289c3c66c0470388511b2fdd3` | Màn MENU: Chuyển tier giá 10.000đ (dưới vốn 11.000đ), lãi -1.000đ (-10.0%), nhãn Lỗ đỏ cảnh báo |
| `02_menu_loss_warning_390x844.png` | 390×844 | 52,905 B | `6e78c6eb4c232eb1429e592074f56d10729352c490ed13a47f23bf2fc48ca672` | Màn MENU: Chuyển tier giá 10.000đ (dưới vốn 11.000đ), lãi -1.000đ (-10.0%), nhãn Lỗ đỏ cảnh báo |
| `03_market_freshness_cart_360x640.png` | 360×640 | 56,716 B | `5832cebc1ab12e8efa10bf2d62ab417b8d12c88cc5c6995399ee2ca7e5e9fd3f` | Màn MARKET: Nhãn 🌱 Dùng trong ngày vs 📦 Giữ qua đêm, dock giỏ tách tiền tươi / khô / tổng |
| `03_market_freshness_cart_390x844.png` | 390×844 | 75,071 B | `27ffd626162f2b686a0e25e2070e6ff3be72a4a22536327088af1f98e51077c7` | Màn MARKET: Nhãn 🌱 Dùng trong ngày vs 📦 Giữ qua đêm, dock giỏ tách tiền tươi / khô / tổng |
| `04_result_missed_demand_360x640.png` | 360×640 | 32,482 B | `66761ac56852cc7e7a42dff78480ac22b0f8891d17acc35c048e7f1fa0cf8222` | Màn DAY_RESULT: Có 2 đơn lỡ Bánh mì chả do OUT_OF_STOCK, danh sách phân nhóm nguyên nhân |
| `04_result_missed_demand_390x844.png` | 390×844 | 36,645 B | `b4f34b399e99bc692789dd0cb9d238f297b6792efda2144631f18087ff28e1b3` | Màn DAY_RESULT: Có 2 đơn lỡ Bánh mì chả do OUT_OF_STOCK, danh sách phân nhóm nguyên nhân |
| `05_result_zero_missed_360x640.png` | 360×640 | 32,443 B | `377c805a1f689cb5979b65c90be8c1aca9c5be33b7921d1ff47577692e74f47e` | Màn DAY_RESULT: 0 khách lỡ, hiển thị thông điệp chúc mừng phục vụ chu đáo toàn bộ khách |
| `05_result_zero_missed_390x844.png` | 390×844 | 36,610 B | `359210254c21856c91a08134b8f055f6add1302452c3aec4abbe0d73411da7c9` | Màn DAY_RESULT: 0 khách lỡ, hiển thị thông điệp chúc mừng phục vụ chu đáo toàn bộ khách |
| `06_empire_result_multi_shop_390x844.png` | 390×844 | 53,178 B | `7d80387c501874f2b19afe656fd955242c3aa893e78eed423571032c8098267f` | Màn EMPIRE_RESULT: Đa quán, Quán 1 (có lỡ) và Quán 2 (0 lỡ) hiển thị chuẩn theo shopState riêng |

---

## 5. KẾT LUẬN & CHUYỂN GIAO CHO CODEX
- Gói công việc `GAME-THREE-20261025` đã sẵn sàng 100% để Codex thẩm định kỹ thuật và duyệt nghiệm thu.
- Tác vụ `A-G3`, `A-G4`, `A-G5` đã được chuyển sang trạng thái `Review` trong `tasks.json`.
- Toàn bộ mã nguồn `game/main.mjs` và `game/style.css` được đóng băng, sẵn sàng chờ quyết định phê duyệt của Codex.
