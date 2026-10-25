# BIÊN BẢN NGHIỆM THU: COMPACT OFFICE ROOMS & STAGE LAYOUT (R1 UPDATE)
**Nonce**: `OFFICE-COMPACT-20261025`  
**Trạng thái**: `READY_FOR_CODEX`  
**Cập nhật lần**: R1 (Khắc phục tràn chiều ngang & khớp kích thước lưới Desktop)  
**Ngày thực hiện**: 2026-10-25  
**Actor**: Antigravity (CSS Only — Targeted Office Hub Layout Fix)

---

## 1. TỔNG QUAN PHẢN HỒI R1 & KHẮC PHỤC TRIỆT ĐỂ
- **Phát hiện từ Review R1**:
  - Khắc phục chiều cao (`stageHeight <= ~650px`) đã đạt chuẩn (`520.03px`).
  - Tuy nhiên, sau khi Codex triển khai gắn mã hash phiên bản (`style.css?v=...`) chống cache trình duyệt, phát hiện lỗi tràn ngang trên Desktop 1280: `stage.clientWidth = 926px` nhưng `stage.scrollWidth = 1092px`. Phòng 1 bị kéo giãn tới ~376px khiến phòng 3 (Codex) bị đẩy tràn lề phải và khuôn mặt Codex bị che khuất.
- **Nguyên nhân gốc**:
  - Thuộc tính `white-space: nowrap` của liên kết hành động `.card-action-link` (ví dụ: `📄 Báo cáo UI (ANTIGRAVITY_UI_REPORT.md) →` và `⚙️ Báo cáo Engine (CODEX_BACKEND_REPORT.md) →`) cộng hưởng với `min-width: auto` mặc định của flex item, làm phòng 1 và phòng 3 tự tính độ rộng tối thiểu theo nội dung chữ dài nhất.
- **Biện pháp xử lý tập trung vào cùng một khối CSS compact (SAME section)**:
  1. Cấu hình lưới 5 track cho Desktop (`> 960px`): `grid-template-columns: minmax(0, 1fr) 12px minmax(0, 1fr) 12px minmax(0, 1fr) !important;`.
  2. Bổ sung `min-width: 0 !important; max-width: 100% !important; overflow: hidden !important;` cho `.dept-room`, `.room-unified-card`, `.card-line`.
  3. Khóa liên kết thành phần `.card-action-link`: `display: block !important; min-width: 0 !important; max-width: 100% !important; overflow: hidden !important; text-overflow: ellipsis !important;` triệt tiêu hoàn toàn lực đẩy của `white-space: nowrap`.
  4. Hai vách ngăn kính `.room-dividing-wall` tự động khớp hoàn hảo vào track 2 và track 4 (12px) không gây lệch lề.
  5. Chạy lệnh `build_bundle.py` sinh mã băm phiên bản mới và xác thực trực tiếp trên trình duyệt thật.

---

## 2. BẢNG ĐO LƯỜNG METRICS (R1 DESKTOP & MOBILE)

### Đo lường trực tiếp trên Desktop 1280×800 (Live Browser):

| Chỉ số kiểm thử | Trước khi sửa (R0/Cache cũ) | Sau khi sửa (R1 Fresh CSS) | Tiêu chuẩn nghiệm thu | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **`stage.clientWidth` vs `scrollWidth`** | `926px` vs `1092px` *(Tràn 166px)* | **`940px` vs `940px`** | `scrollWidth <= clientWidth` | ✅ **ĐẠT (Khớp 100%)** |
| **Chiều cao `.dept-stage`** | `1222.88px` *(Vỡ khung cũ)* | **`520.03px`** | Bền vững `<= ~650px` | ✅ **ĐẠT** |
| **Độ rộng 3 phòng (AG / CEO / CX)** | `374.5px` / `292px` / `401.8px` | **`305.33px` / `305.33px` / `305.34px`** | Phân bổ đều bằng `minmax(0,1fr)` | ✅ **ĐẠT** |
| **Vị trí lề phải phòng Codex (`ws-codex.right`)** | `1382.42px` *(vượt ngoài stage 1231px)* | **`1230.00px`** *(nằm trong stage 1231px)* | Không tràn lề phải stage | ✅ **ĐẠT** |
| **Khuôn mặt Codex (`cxFace`) trong khung nhìn** | `visibleInsideStage: false` *(bị cắt)* | **`insideStage: true`** *(1051.6px → 1185.4px)* | Trọn vẹn trong stage | ✅ **ĐẠT** |
| **Khuôn mặt Antigravity** | `insideStage: true` | **`insideStage: true`** *(329.6px → 463.4px)* | Trọn vẹn trong stage | ✅ **ĐẠT** |
| **Khuôn mặt Trợ Lý Giám Đốc** | `y = 1240px` *(ngoài màn hình)* | **`insideStage: true`** *(639.4px → 748.5px)* | Trọn vẹn trong stage | ✅ **ĐẠT** |
| **Khuôn mặt Giám Đốc** | `y = 1230px` *(ngoài màn hình)* | **`insideStage: true`** *(763.3px → 880.7px)* | Trọn vẹn trong stage | ✅ **ĐẠT** |
| **Bảo toàn chiều cao nội thất `.room-interior`** | `265px` | **`265.00px`** (cả 3 phòng) | Giữ nguyên 265px chuẩn | ✅ **ĐẠT** |

### Đo lường trực tiếp trên Mobile 390×844 (Cả 3 tab phòng):
- **Tab 1 (Phòng UI - Antigravity)**: `clientWidth = 354px`, `scrollWidth = 354px` (`stageScrollOk: True`)
- **Tab 2 (Bàn Duyệt - Giám Đốc)**: `clientWidth = 354px`, `scrollWidth = 354px` (`stageScrollOk: True`)
- **Tab 3 (Kỹ Thuật - Codex)**: `clientWidth = 354px`, `scrollWidth = 354px` (`stageScrollOk: True`)

---

## 3. CHỨNG TỪ BẰNG CHỨNG HÌNH ẢNH (REAL BROWSER ARTIFACTS)
Thư mục: `docs/mobile_gate_evidence/office_compact_20261025/`

| Tên tệp ảnh | Kích thước | SHA-256 Checksum | Mô tả xác thực |
| :--- | :--- | :--- | :--- |
| `01_desktop_1280_compact_stage.png` | 1280×800 | `3218c27f677271a92f57dbe30cd5ba32f78547baf2a2bd1955fd622fc1bfa099` | Desktop 1280: Stage khớp tuyệt đối 940/940px không tràn ngang, cả 3 phòng đều 305px, 4/4 khuôn mặt nhân vật hiển thị rõ nét trong khung nhìn. |
| `02_desktop_1280_blocker_resolution.png` | 1280×800 | `aad954ecc44f108a79cbe0e913c3165d4f881fa4ddd3d81630a9430e58b9c296` | Desktop 1280: Khung Blocker Resolution hiển thị trọn vẹn thông điệp lỗi gốc, vòng review 3/3, nút Thử lại kiểm chứng sẵn sàng. |
| `03_mobile_390_antigravity.png` | 390×844 | `575b3077afe493c0c4d220533d386b6032cab20c2c44107a2ccdbbc219508ceb` | Mobile 390: Tab Phòng Thiết Kế UI, nội thất 265px bảo toàn, thẻ trạng thái gọn gàng (không tràn ngang). |
| `04_mobile_390_management.png` | 390×844 | `bee196cb35a5f5d08dbc6e556a6c346dc1a05ac621b09ab6919bfbd0936a1513` | Mobile 390: Tab Bàn Duyệt Giám Đốc, cả Trợ Lý và Giám Đốc song hành trên cùng sàn làm việc, không tràn lề. |
| `05_mobile_390_codex.png` | 390×844 | `c8713424c49e1d837158ac3e53fd739e06ba59e0de9e84f714aa87ca560fda9e` | Mobile 390: Tab Phòng Kỹ Thuật Engine, tủ Server Rack LED và nhân vật Codex hiển thị trọn vẹn. |

---

## 4. MÃ BĂM TỆP NGUỒN ĐÓNG BĂNG (SOURCE INTEGRITY HASHES)

| Tệp nguồn | SHA-256 Checksum | Trạng thái bảo vệ |
| :--- | :--- | :--- |
| `docs/office_hub/style.css` | `c8b49f76e441565fd0b13be42934df4226dd3bffc6a52a375ff81bd521431210` | Đã cập nhật lưới 5 track & `min-width:0`, **ĐÓNG BĂNG** |
| `docs/office_hub/app.js` | `1dd426ef95dedd18538e0384143f59bc2a4e0177103d2126be577900737df531` | Bảo toàn bản sửa của Codex, không ghi đè |
| `docs/office_hub/index.html` | `5d2e9e459743af229dff822abefab12e8d115d60ac81f260c0f5e08ddf5348ad` | Cập nhật tự động query version bởi `build_bundle.py` |
| `game/main.mjs` | `30e3b5f46c07eeee49f7748901780b8269b109c692d21e21063f1205f8c32e36` | **ĐÓNG BĂNG TUYỆT ĐỐI** (Gói Game FOUR đã nghiệm thu) |
| `game/style.css` | `ce43365664b0a8411fc9a342a6fcc0294ccd88a450c153bfdf81fa5203a74264` | **ĐÓNG BĂNG TUYỆT ĐỐI** (Gói Game FOUR đã nghiệm thu) |

---
**Kết luận**: Toàn bộ yêu cầu R1 của `OFFICE-COMPACT-20261025` đã được giải quyết dứt điểm. Tỷ lệ vừa vặn ngang dọc hoàn hảo trên cả Desktop 1280 và Mobile 390. CSS đã được đóng băng. Sẵn sàng cho Codex nghiệm thu chính thức (**`READY_FOR_CODEX`**).
