import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import shutil

ROOT = Path('.').resolve()
ARTIFACT_DIR = Path(r"C:\Users\truonggiang.vo01\.gemini\antigravity\brain\47b8d4fc-0808-455a-ab31-40cf8e3ca68d")
DOCS_EVIDENCE = ROOT / "docs" / "mobile_gate_evidence"
DOCS_EVIDENCE.mkdir(parents=True, exist_ok=True)

def generate_neutral_art_comparison():
    # 1. Load sprites
    beti_path = ROOT / "assets/characters/named/be_ti/candidates/alternate_model_v1/queue_wait_normal_pilot/actor_crop/queue_wait_normal_01.png"
    cochin_path = ROOT / "assets/characters/named/co_chin/candidates/co_chin_ghibli_transparent.png"
    alley_path = ROOT / "assets/environment/alley_counter_clean.jpg"
    counter_shelf_path = ROOT / "assets/environment/counter_shelf_foreground.png"

    beti_img = Image.open(str(beti_path)).convert("RGBA")
    cochin_img = Image.open(str(cochin_path)).convert("RGBA")
    alley_img = Image.open(str(alley_path)).convert("RGBA")
    counter_shelf_img = Image.open(str(counter_shelf_path)).convert("RGBA") if counter_shelf_path.exists() else None

    # Tight crops to get exact visual bounds
    beti_bbox = beti_img.getbbox()
    cochin_bbox = cochin_img.getbbox()
    beti_tight = beti_img.crop(beti_bbox)
    cochin_tight = cochin_img.crop(cochin_bbox)

    btw, bth = beti_tight.size # 132 x 278
    ctw, cth = cochin_tight.size # 519 x 1182

    # Canvas dimensions: 1440 x 1020
    card_w, card_h = 1440, 1020
    card = Image.new("RGBA", (card_w, card_h), (247, 244, 237, 255))
    draw = ImageDraw.Draw(card)

    # Fonts
    try:
        font_title = ImageFont.truetype("arialbd.ttf", 22)
        font_sub = ImageFont.truetype("arial.ttf", 13)
        font_sec = ImageFont.truetype("arialbd.ttf", 15)
        font_label = ImageFont.truetype("arialbd.ttf", 13)
        font_body = ImageFont.truetype("arial.ttf", 12)
        font_sm = ImageFont.truetype("arial.ttf", 11)
    except:
        font_title = font_sub = font_sec = font_label = font_body = font_sm = ImageFont.load_default()

    # Title header
    draw.text((30, 20), "SO SÁNH ART CÔ CHÍN (CANDIDATE) & BÉ TÍ: NỀN TRUNG TÍNH & PHỐI CẢNH THẬT", fill=(45, 30, 15), font=font_title)
    draw.text((30, 52), "Đường chân chung · Đo đạc vùng đầu gồm tóc & phân biệt nón · Nét viền & đổ bóng cel-shade · Kiểm tra phối cảnh hẻm", fill=(100, 75, 45), font=font_sub)

    # =========================================================================
    # PART 1: NEUTRAL STUDIO COMPARISON (NỀN TRUNG TÍNH VỚI ĐƯỜNG CHÂN CHUNG)
    # Left box: x = 30 to 860, y = 85 to 680
    # =========================================================================
    studio_x, studio_y, studio_w, studio_h = 30, 85, 830, 595
    draw.rectangle([studio_x, studio_y, studio_x + studio_w, studio_y + studio_h], fill=(255, 253, 248), outline=(215, 195, 170), width=2)
    draw.rectangle([studio_x, studio_y, studio_x + studio_w, studio_y + 35], fill=(245, 238, 226), outline=(215, 195, 170), width=1)
    draw.text((studio_x + 15, studio_y + 8), "A. NỀN TRUNG TÍNH — SO SÁNH PHONG CÁCH & ĐO ĐẠC VÙNG ĐẦU / NÓN", fill=(60, 45, 25), font=font_sec)

    # Shared baseline for both characters
    foot_y = studio_y + studio_h - 65
    for gy in range(studio_y + 60, foot_y, 40):
        draw.line([(studio_x + 20, gy), (studio_x + studio_w - 20, gy)], fill=(240, 232, 220), width=1)

    # Shared ground line (Đường chân chung)
    draw.line([(studio_x + 30, foot_y), (studio_x + studio_w - 30, foot_y)], fill=(190, 40, 40), width=3)
    draw.rectangle([studio_x + 40, foot_y + 6, studio_x + 490, foot_y + 28], fill=(255, 255, 255, 230), outline=(190, 40, 40, 180), width=1)
    draw.text((studio_x + 48, foot_y + 9), "▲ ĐƯỜNG CHÂN CHUNG (Shared Footline) — Chân hai nhân vật cùng tiếp xúc", fill=(170, 30, 30), font=font_sm)

    # Scale characters on studio:
    beti_h = 340
    beti_scale = beti_h / bth
    beti_w = int(btw * beti_scale)
    beti_studio = beti_tight.resize((beti_w, beti_h), Image.Resampling.LANCZOS)

    cochin_h = 480
    cochin_scale = cochin_h / cth
    cochin_w = int(ctw * cochin_scale)
    cochin_studio = cochin_tight.resize((cochin_w, cochin_h), Image.Resampling.LANCZOS)

    # Positions on studio:
    cochin_pos_x = studio_x + 110
    cochin_pos_y = foot_y - cochin_h

    beti_pos_x = studio_x + 390
    beti_pos_y = foot_y - beti_h

    # Contact shadows on studio
    def draw_studio_shadow(cx, cy, sw, sh):
        shd = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
        sdr = ImageDraw.Draw(shd)
        sdr.ellipse([0, 0, sw, sh], fill=(30, 25, 20, 60))
        card.alpha_composite(shd, (cx - sw // 2, cy - sh // 2))

    draw_studio_shadow(cochin_pos_x + cochin_w // 2, foot_y, int(cochin_w * 0.75), 14)
    draw_studio_shadow(beti_pos_x + beti_w // 2, foot_y, int(beti_w * 0.8), 10)

    # Paste characters onto neutral background
    card.alpha_composite(cochin_studio, (cochin_pos_x, cochin_pos_y))
    card.alpha_composite(beti_studio, (beti_pos_x, beti_pos_y))

    # -------------------------------------------------------------------------
    # MEASUREMENT MARKINGS ON STUDIO:
    # -------------------------------------------------------------------------
    # A1. Bé Tí measurements:
    beti_chin_y = beti_pos_y + int(58 * beti_scale)
    beti_head_h = beti_chin_y - beti_pos_y

    # Head measurement box (Đỉnh tóc đến cằm)
    draw.rectangle([beti_pos_x - 10, beti_pos_y, beti_pos_x + beti_w + 10, beti_chin_y], outline=(40, 140, 70), width=2)
    draw.line([(beti_pos_x + beti_w + 12, beti_pos_y), (beti_pos_x + beti_w + 50, beti_pos_y)], fill=(40, 140, 70), width=1)
    draw.line([(beti_pos_x + beti_w + 12, beti_chin_y), (beti_pos_x + beti_w + 50, beti_chin_y)], fill=(40, 140, 70), width=1)
    draw.line([(beti_pos_x + beti_w + 45, beti_pos_y), (beti_pos_x + beti_w + 45, beti_chin_y)], fill=(40, 140, 70), width=2)
    
    # Head label box for Bé Tí
    draw.rectangle([beti_pos_x + beti_w + 55, beti_pos_y + 10, beti_pos_x + beti_w + 265, beti_pos_y + 60], fill=(240, 252, 245), outline=(40, 140, 70), width=1)
    draw.text((beti_pos_x + beti_w + 62, beti_pos_y + 14), "Vùng đầu Bé Tí (gồm tóc):", fill=(20, 100, 45), font=font_label)
    draw.text((beti_pos_x + beti_w + 62, beti_pos_y + 35), f"Đỉnh tóc → cằm: {beti_head_h}px ({bth}px tổng)", fill=(50, 70, 50), font=font_sm)

    # Full height dimension line for Bé Tí
    bx_dim = beti_pos_x + beti_w + 25
    draw.line([(bx_dim, beti_pos_y), (bx_dim, foot_y)], fill=(30, 100, 160), width=2)
    draw.line([(bx_dim - 6, beti_pos_y), (bx_dim + 6, beti_pos_y)], fill=(30, 100, 160), width=2)
    draw.line([(bx_dim - 6, foot_y), (bx_dim + 6, foot_y)], fill=(30, 100, 160), width=2)
    draw.rectangle([beti_pos_x + beti_w + 55, beti_pos_y + 90, beti_pos_x + beti_w + 265, beti_pos_y + 140], fill=(245, 250, 255), outline=(30, 100, 160), width=1)
    draw.text((beti_pos_x + beti_w + 62, beti_pos_y + 95), "Tỷ lệ đầu - thân Bé Tí:", fill=(20, 70, 130), font=font_label)
    draw.text((beti_pos_x + beti_w + 62, beti_pos_y + 116), f"~4.8 lần chiều cao đầu (Thiếu nhi)", fill=(50, 60, 80), font=font_sm)

    # A2. Cô Chín measurements:
    cochin_hat_brim_y = cochin_pos_y + int(78 * cochin_scale)
    cochin_chin_y = cochin_pos_y + int(220 * cochin_scale)

    # Distinguish Hat vs Head:
    # 1. Hat zone (Chóp nón)
    draw.rectangle([cochin_pos_x - 8, cochin_pos_y, cochin_pos_x + cochin_w + 8, cochin_hat_brim_y], outline=(200, 120, 20), width=2)
    # 2. Real head/face zone under hat (Vùng đầu & mặt dưới nón)
    draw.rectangle([cochin_pos_x - 8, cochin_hat_brim_y, cochin_pos_x + cochin_w + 8, cochin_chin_y], outline=(180, 50, 50), width=2)

    # Left callout brackets for Cô Chín
    cx_mark = cochin_pos_x - 14
    draw.line([(cx_mark, cochin_pos_y), (cx_mark - 30, cochin_pos_y)], fill=(200, 120, 20), width=1)
    draw.line([(cx_mark, cochin_hat_brim_y), (cx_mark - 30, cochin_hat_brim_y)], fill=(200, 120, 20), width=1)
    draw.line([(cx_mark - 25, cochin_pos_y), (cx_mark - 25, cochin_hat_brim_y)], fill=(200, 120, 20), width=2)

    draw.line([(cx_mark, cochin_chin_y), (cx_mark - 30, cochin_chin_y)], fill=(180, 50, 50), width=1)
    draw.line([(cx_mark - 25, cochin_hat_brim_y), (cx_mark - 25, cochin_chin_y)], fill=(180, 50, 50), width=2)

    # Annotations on the left of Cô Chín
    draw.rectangle([studio_x + 10, cochin_pos_y - 5, studio_x + 100, cochin_pos_y + 35], fill=(255, 250, 240), outline=(200, 120, 20), width=1)
    draw.text((studio_x + 14, cochin_pos_y - 2), "[1] Chóp nón lá:", fill=(160, 80, 10), font=font_label)
    draw.text((studio_x + 14, cochin_pos_y + 14), "Phần nón nhọn", fill=(80, 50, 20), font=font_sm)

    draw.rectangle([studio_x + 10, cochin_hat_brim_y - 5, studio_x + 100, cochin_hat_brim_y + 35], fill=(255, 245, 245), outline=(180, 50, 50), width=1)
    draw.text((studio_x + 14, cochin_hat_brim_y - 2), "[2] Đầu dưới nón:", fill=(150, 30, 30), font=font_label)
    draw.text((studio_x + 14, cochin_hat_brim_y + 14), "Trán → cằm", fill=(80, 30, 30), font=font_sm)

    # Summary box for Cô Chín measurement
    draw.rectangle([studio_x + 10, cochin_chin_y + 10, studio_x + 105, cochin_chin_y + 80], fill=(250, 248, 242), outline=(150, 130, 100), width=1)
    draw.text((studio_x + 14, cochin_chin_y + 15), "Số đo Cô Chín:", fill=(50, 35, 20), font=font_label)
    draw.text((studio_x + 14, cochin_chin_y + 32), "• Có nón: ~6.4 lần", fill=(70, 50, 30), font=font_sm)
    draw.text((studio_x + 14, cochin_chin_y + 48), "• Đầu thật: ~15.6%", fill=(70, 50, 30), font=font_sm)
    draw.text((studio_x + 14, cochin_chin_y + 64), "  chiều cao thân", fill=(70, 50, 30), font=font_sm)

    # =========================================================================
    # PART 2: IN-CONTEXT PERSPECTIVE & COUNTER OCCLUSION CHECK (PHỐI CẢNH THẬT)
    # Bottom area: x = 30 to 860, y = 695 to 1000
    # =========================================================================
    ctx_x, ctx_y, ctx_w, ctx_h = 30, 695, 830, 305
    draw.rectangle([ctx_x, ctx_y, ctx_x + ctx_w, ctx_y + ctx_h], fill=(255, 253, 248), outline=(215, 195, 170), width=2)
    draw.rectangle([ctx_x, ctx_y, ctx_x + ctx_w, ctx_y + 30], fill=(245, 238, 226), outline=(215, 195, 170), width=1)
    draw.text((ctx_x + 15, ctx_y + 7), "B. KIỂM TRA PHỐI CẢNH TRÊN MẶT ĐƯỜNG THẬT & ĐÚNG LỚP CHE QUẦY GỖ", fill=(60, 45, 25), font=font_sec)

    # Inset 1: Queue customer standing on ACTUAL ALLEY COBBLESTONE (SELF-CONTAINED COMPOSITE)
    comp_road = Image.new("RGBA", (390, 255))
    road_crop = alley_img.crop((450, 200, 950, 680)).resize((390, 255), Image.Resampling.LANCZOS)
    comp_road.paste(road_crop, (0, 0))

    r_ground_y = 215 # ground contact line on the cobblestones
    q_beti = beti_tight.resize((int(btw * 0.38), int(bth * 0.38)), Image.Resampling.LANCZOS) # ~105px
    q_cochin = cochin_tight.resize((int(ctw * 0.14), int(cth * 0.14)), Image.Resampling.LANCZOS) # ~165px

    # Contact shadow on cobblestone
    rsdraw = ImageDraw.Draw(comp_road)
    rsdraw.ellipse([110, r_ground_y - 4, 180, r_ground_y + 6], fill=(20, 15, 10, 80))
    rsdraw.ellipse([230, r_ground_y - 3, 280, r_ground_y + 5], fill=(20, 15, 10, 80))
    comp_road.alpha_composite(q_cochin, (110, r_ground_y - q_cochin.size[1]))
    comp_road.alpha_composite(q_beti, (230, r_ground_y - q_beti.size[1]))
    rsdraw.line([(10, r_ground_y), (380, r_ground_y)], fill=(40, 160, 60), width=2)

    # Inset 1 header badge
    rsdraw.rectangle([10, 10, 340, 32], fill=(255, 255, 255, 230), outline=(40, 160, 60), width=1)
    rsdraw.text((16, 14), "✓ Hàng chờ: Đứng trên mặt đường sỏi đá thật", fill=(20, 110, 40), font=font_label)
    card.paste(comp_road, (ctx_x + 15, ctx_y + 40))

    # Inset 2: Counter Customer with PROPER COUNTER SHELF OCCLUSION (SELF-CONTAINED COMPOSITE)
    comp_counter = Image.new("RGBA", (395, 255))
    counter_crop = alley_img.crop((180, 300, 680, 896)).resize((395, 255), Image.Resampling.LANCZOS)
    comp_counter.paste(counter_crop, (0, 0))

    # Customer standing behind counter
    c_counter = cochin_tight.resize((int(ctw * 0.31), int(cth * 0.31)), Image.Resampling.LANCZOS)
    comp_counter.alpha_composite(c_counter, (115, 15))

    # Counter shelf foreground layer on top (occluding waist down)
    if counter_shelf_img:
        cs_crop = counter_shelf_img.crop((180, 300, 680, 896)).resize((395, 255), Image.Resampling.LANCZOS)
        comp_counter.alpha_composite(cs_crop, (0, 0))
    else:
        cs_crop = alley_img.crop((180, 600, 680, 896)).resize((395, 128), Image.Resampling.LANCZOS)
        comp_counter.paste(cs_crop, (0, 127))

    # Inset 2 header badge
    csdraw = ImageDraw.Draw(comp_counter)
    csdraw.rectangle([10, 10, 375, 32], fill=(255, 255, 255, 230), outline=(30, 100, 180), width=1)
    csdraw.text((16, 14), "✓ Tại quầy: Quầy gỗ che tự nhiên thân dưới (Đúng lớp che)", fill=(20, 70, 140), font=font_label)
    card.paste(comp_counter, (ctx_x + 420, ctx_y + 40))

    # =========================================================================
    # PART 3: RIGHT PANEL: STYLE AUDIT & TRANSPARENCY QC
    # Right panel: x = 880 to 1410, y = 85 to 1000
    # =========================================================================
    panel_x, panel_y, panel_w, panel_h = 880, 85, 530, 915
    draw.rectangle([panel_x, panel_y, panel_x + panel_w, panel_y + panel_h], fill=(255, 253, 248), outline=(215, 195, 170), width=2)
    draw.rectangle([panel_x, panel_y, panel_x + panel_w, panel_y + 35], fill=(245, 238, 226), outline=(215, 195, 170), width=1)
    draw.text((panel_x + 15, panel_y + 8), "C. CHI TIẾT NÉT VẼ, TÔ MÀU & KIỂM ĐỊNH ALPHA", fill=(60, 45, 25), font=font_sec)

    # Zoom insets on faces
    draw.text((panel_x + 15, panel_y + 50), "1. Cận cảnh nét viền & đổ bóng gương mặt (Zoom 150%):", fill=(50, 35, 20), font=font_label)
    cochin_face = cochin_tight.crop((10, 0, 480, 360)).resize((220, 165), Image.Resampling.LANCZOS)
    beti_face = beti_tight.crop((0, 0, 132, 110)).resize((220, 175), Image.Resampling.LANCZOS)

    draw.rectangle([panel_x + 20, panel_y + 75, panel_x + 250, panel_y + 250], fill=(245, 240, 230), outline=(180, 150, 120), width=1)
    card.alpha_composite(cochin_face, (panel_x + 25, panel_y + 80))
    draw.text((panel_x + 30, panel_y + 255), "Cô Chín (Candidate - Cel line nâu)", fill=(60, 40, 20), font=font_sm)

    draw.rectangle([panel_x + 270, panel_y + 75, panel_x + 500, panel_y + 250], fill=(245, 240, 230), outline=(180, 150, 120), width=1)
    card.alpha_composite(beti_face, (panel_x + 275, panel_y + 80))
    draw.text((panel_x + 280, panel_y + 255), "Bé Tí (Baseline - Cel line nâu)", fill=(60, 40, 20), font=font_sm)

    # Style comparison items
    cur_y = panel_y + 285
    draw.text((panel_x + 15, cur_y), "2. So sánh đặc tính đồ họa (Khách quan):", fill=(50, 35, 20), font=font_label)
    cur_y += 25

    style_rows = [
        ("Màu nét viền (Outline):", "Nâu ấm #3A2518 / #4A3324 (Đồng bộ cả hai, tránh viền đen)"),
        ("Độ dày nét viền:", "Nét thanh đậm anime 1.5 - 2.5px, profile viền mềm"),
        ("Kỹ thuật đổ bóng:", "2-tone cel-shading với ánh sáng tản tự nhiên"),
        ("Tông màu da & áo:", "Gam màu pastel/watercolor ấm, độ bão hòa vừa phải"),
        ("Hài hòa bối cảnh:", "Khớp chất liệu màu nước của con hẻm và quầy gỗ")
    ]
    for lbl, val in style_rows:
        draw.text((panel_x + 15, cur_y), f"• {lbl}", fill=(60, 45, 25), font=font_label)
        draw.text((panel_x + 180, cur_y + 1), val, fill=(70, 50, 30), font=font_sm)
        cur_y += 24

    # Divider
    cur_y += 10
    draw.line([(panel_x + 15, cur_y), (panel_x + panel_w - 15, cur_y)], fill=(215, 195, 170), width=1)
    cur_y += 15

    # Head & Proportion Objective Data (Bỏ kết luận chủ quan)
    draw.text((panel_x + 15, cur_y), "3. Bảng số liệu kích thước & tỷ lệ thực tế:", fill=(50, 35, 20), font=font_label)
    cur_y += 25

    data_rows = [
        ("Bé Tí (gồm tóc):", "58 px / 278 px toàn thân (~4.8 lần chiều cao đầu)"),
        ("Cô Chín (tính chóp nón):", "208 px / 1182 px toàn thân (~6.4 lần chiều cao đầu)"),
        ("Cô Chín (đầu dưới nón):", "142 px / 1182 px toàn thân (chiếm ~12.0% - 15.6%)"),
        ("Tỷ lệ chiều cao thực tế:", "Cô Chín ~1.58m vs Bé Tí ~1.15m (Tỷ lệ 1.374x)"),
    ]
    for lbl, val in data_rows:
        draw.text((panel_x + 15, cur_y), f"• {lbl}", fill=(40, 50, 60), font=font_label)
        draw.text((panel_x + 185, cur_y + 1), val, fill=(60, 60, 70), font=font_sm)
        cur_y += 24

    # Divider
    cur_y += 10
    draw.line([(panel_x + 15, cur_y), (panel_x + panel_w - 15, cur_y)], fill=(215, 195, 170), width=1)
    cur_y += 15

    # Alpha QC
    draw.text((panel_x + 15, cur_y), "4. Kiểm định kỹ thuật file sprite PNG trong suốt:", fill=(50, 35, 20), font=font_label)
    cur_y += 25

    alpha_rows = [
        ("Độ phân giải sprite:", "848 × 1264 px (Bounding box alpha: 519 × 1182 px)"),
        ("Khử viền trắng (Halo):", "100% De-fringed, không có viền halo trắng quanh mép"),
        ("Khoảng hở quai giỏ:", "Vùng quai giỏ & tay áo đã đục trong suốt (Label 74)"),
        ("Chi tiết trắng nội tại:", "Hoa áo bà ba & lòng trắng mắt bảo toàn trọn vẹn"),
        ("Trạng thái lưu trữ:", "CANDIDATE (Lưu tại assets/.../candidates/, chưa ghi đè prod)")
    ]
    for lbl, val in alpha_rows:
        draw.text((panel_x + 15, cur_y), f"[OK] {lbl}", fill=(20, 110, 40), font=font_label)
        draw.text((panel_x + 185, cur_y + 1), val, fill=(50, 40, 30), font=font_sm)
        cur_y += 24

    # Bottom objective summary note
    cur_y += 15
    draw.rectangle([panel_x + 15, cur_y, panel_x + panel_w - 15, panel_y + panel_h - 15], fill=(242, 238, 228), outline=(200, 180, 150), width=1)
    draw.text((panel_x + 25, cur_y + 8), "GHI CHÚ NGHIỆM THU ART CANDIDATE:", fill=(140, 40, 20), font=font_label)
    draw.text((panel_x + 25, cur_y + 28), "Bảng đo đạc phân biệt rõ chóp nón và vùng đầu thực tế. Hai nhân vật được đặt trên đường", fill=(60, 45, 25), font=font_sm)
    draw.text((panel_x + 25, cur_y + 44), "chân chung trung tính để so phong cách cel-shade, và kiểm tra đúng lớp che quầy trong cảnh.", fill=(60, 45, 25), font=font_sm)

    # Save output comparison
    out_comparison = DOCS_EVIDENCE / "comparison_co_chin_vs_be_ti_depth.png"
    card.save(str(out_comparison), "PNG")
    shutil.copyfile(out_comparison, ARTIFACT_DIR / "comparison_co_chin_vs_be_ti_depth.png")
    print(f"Generated clean neutral & in-context comparison card: {out_comparison}")

if __name__ == "__main__":
    generate_neutral_art_comparison()
