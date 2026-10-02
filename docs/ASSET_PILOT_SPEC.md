# XÓM NHỎ — TÀI LIỆU QUY CÁCH VÀ STORYBOARD ASSET PILOT (V2)

> **Phiên bản**: v0.7.4-pilot  
> **Ngày cập nhật**: 01/10/2026  
> **Trạng thái**: Đã sửa triệt để lỗi phối cảnh gờ quầy, lỗi 3 tay Em Nam, lỗi phân nhóm archetype và phân loại handoff theo món ăn/thức uống.

---

## 1. GIẢI TRÌNH CÁC ĐIỂM SỬA CHỮA QUAN TRỌNG THEO PHẢN HỒI

### 1.1. Khắc phục lỗi phối cảnh: Ghép lớp gờ quầy che chân tự nhiên (Counter Depth & Occlusion)
- **Vấn đề cũ**: Asset khách là toàn thân đứng ở `bottom: 16px`, chân đặt ngay trên gờ quầy gỗ khiến nhân vật trông như đứng lên mặt bàn thay vì đứng ngoài hẻm gọi món.
- **Giải pháp triệt để**:
  1. Trích xuất lớp gờ quầy gỗ phía trước ([`counter_shelf_foreground.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/assets/environment/counter_shelf_foreground.png)) có cùng kích thước $1200 \times 896$ px khớp chuẩn từng pixel với ảnh nền con hẻm [`alley_counter_clean.jpg`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/assets/environment/alley_counter_clean.jpg).
  2. Phân lớp hiển thị theo chiều sâu phối cảnh:
     - **Lớp 1 (Z-index 1)**: Nền con hẻm, lòng đường đá, giàn hoa giấy.
     - **Lớp 2 (Z-index 10)**: Khách hàng đứng trên lòng đường hẻm phía sau quầy.
     - **Lớp 3 (Z-index 18)**: Mái hiên di động sọc xanh trắng che mát phía trên.
     - **Lớp 4 (Z-index 22)**: Mặt bàn quầy gỗ tiền cảnh ([`counter-shelf-foreground`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/assets/environment/counter_shelf_foreground.png)) tự nhiên che khuất phần chân và đùi của khách hàng.
     - **Lớp 5 (Z-index 26)**: Đôi tay nhân viên trao món vươn từ trong quán ra ngoài gờ quầy.
  3. Bỏ bóng đổ tiếp đất trên mặt bàn quầy; khách đứng vững vàng phía sau quầy với phần ngực, mặt, tay và trang phục hiển thị rõ nét, biểu cảm.

### 1.2. Khắc phục lỗi 3 cánh tay và tỉ lệ của Em Nam (`walkin_student`)
- **Lỗi cũ**: Bản vẽ AI trước đó sinh ra một cánh tay buông xuôi và một cánh tay cầm quai balo cùng một phía (tổng cộng 3 cánh tay). Dáng người cũng hơi lớn so với học sinh cấp 3.
- **Bản sửa mới ([`walkin_student.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/assets/pilot/walkin_student.png))**:
  - Giải phẫu chuẩn xác: **chính xác 2 cánh tay** (tay trái giữ quai balo trước ngực, tay phải buông xuôi tự nhiên).
  - Vóc dáng thiếu niên (teenager ~15–16 tuổi), gương mặt trẻ trung, nụ cười rạng rỡ, áo sơ mi đồng phục trắng tinh và quần tây gọn gàng.

### 1.3. Khắc phục logic sinh khách: Phân nhóm Archetype trước, gán tên và hình sau
- **Lỗi cũ**: Mã nguồn cũ dùng `index % 4` gán cơ học từ một danh sách tên chung, dẫn đến trường hợp tên người lớn (Cô Bảy, Chú Mười) bị ghép vào hình học sinh.
- **Cấu trúc mới trong [`game/day-content.mjs`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/game/day-content.mjs)**:
  - Định nghĩa 4 nhóm Archetype cụ thể: `teen`, `office`, `driver`, `elder`.
  - Mỗi Archetype quản lý một nhóm tên, danh xưng, câu thoại và variant hình ảnh riêng biệt:
    - **`teen`**: Em Nam, Em Bình, Bạn Thảo, Em Tuấn, Bé Vy $\to$ `walkin_student.png` (Thoại: giờ vào lớp, giờ học).
    - **`office`**: Chị Mai, Anh Khoa, Chị Ngọc, Anh Bảo, Chị Lành $\to$ `walkin_office.png` (Thoại: văn phòng, giờ họp).
    - **`driver`**: Chú Bảy, Chú Mười, Chú Bình, Anh Lâm, Bác Tư $\to$ `walkin_driver.png` (Thoại: chạy xe, cuốc xe).
    - **`elder`**: Bác Năm, Cô Vân, Dì Hạnh, Bác Phúc, Bác Tám $\to$ `walkin_elder.png` (Thoại: tập thể dục, xóm giềng).

### 1.4. Phân loại Handoff theo Món ăn vs. Thức uống
- **Lỗi cũ**: Luôn hiển thị đôi tay cầm ổ bánh mì kể cả khi khách gọi Trà tắc hay Sữa đậu nành.
- **Cải tiến trong [`game/main.mjs`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/game/main.mjs)**:
  - Khi món ăn (bánh mì): Hiển thị [`staff_handoff_banhmi.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/assets/pilot/staff_handoff_banhmi.png) (Ổ bánh mì bọc giấy kraft buộc thun đỏ).
  - Khi thức uống (`TRA_TAC`, `SUA_DAU_DA`): Hiển thị [`staff_handoff_drink.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/assets/pilot/staff_handoff_drink.png) (Ly trà tắc/sữa đậu nắp cầu mát lạnh kèm quai xách chữ T tiện lợi).

---

## 2. DANH MỤC HÌNH ẢNH SHOWCASE PILOT THỰC TẾ (390×844)

Tất cả ảnh được chụp từ gameplay thực tế tại [`docs/mobile_gate_evidence/pilot/`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot):

1. **[`pilot_01_walkin_student.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_01_walkin_student.png)**: Em Nam (học sinh chuẩn 2 tay, đứng sau gờ quầy, chân được che tự nhiên).
2. **[`pilot_02_walkin_office.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_02_walkin_office.png)**: Chị Mai (văn phòng thanh lịch, đứng sau quầy).
3. **[`pilot_03_walkin_driver.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_03_walkin_driver.png)**: Chú Bảy (tài xế xe ôm, đứng sau quầy).
4. **[`pilot_04_walkin_elder.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_04_walkin_elder.png)**: Bác Năm (tập thể dục, quạt nan, đứng sau quầy).
5. **[`pilot_05_staff_handoff_banhmi.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_05_staff_handoff_banhmi.png)**: Trao ổ bánh mì chả nóng giòn qua quầy.
6. **[`pilot_05_staff_handoff_drink.png`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_05_staff_handoff_drink.png)**: Trao ly trà tắc quai chữ T mát lạnh qua quầy.
7. **[`pilot_natural_shift.webm`](file:///C:/Users/truonggiang.vo01/.gemini/antigravity/scratch/xom-nho/docs/mobile_gate_evidence/pilot/pilot_natural_shift.webm)**: Video ghi hình một ca bán tự nhiên có cả món ăn và thức uống, thể hiện chuyển động và trao món mượt mà.
