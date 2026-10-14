# Thầy Nam Nè – Web app sửa câu văn cho học sinh tiểu học

Web app (PWA) chạy trên trình duyệt điện thoại, thêm được vào màn hình chính, không cần cửa hàng ứng dụng, miễn phí.

## Tính năng
- Gõ bài trực tiếp hoặc **chụp/chọn ảnh** bài viết → đọc chữ (AI đa phương thức; dự phòng Tesseract.js tiếng Việt trong trình duyệt) → bé **sửa lại chữ đọc sai** trước khi gửi.
- Chỉ sửa khi bé bấm **“✨ Sửa bài cho con”**.
- Quy tắc AI: giữ **đúng số câu**, gần đúng số chữ, dùng lại từ của bé, chỉ thêm rất ít từ, sửa dấu câu, viết hoa, chính tả, theo thể loại văn (kể, tả, cảm nghĩ, thư, tự do).
- Máy chủ tự kiểm tra: nếu số câu khác hoặc số chữ lệch quá 20% thì yêu cầu AI sửa lại 1 lần.
- Hiển thị “X câu → X câu · a chữ → b chữ”, so sánh bài gốc với bài sửa (chữ xanh là chỗ thêm/sửa, chữ đỏ gạch là chỗ bỏ), thẻ “Chỗ con cần chú ý” và lời khen.
- Mục Hướng dẫn có video minh họa (`public/guide.mp4`) và 4 bước.
- Báo ngay khi mất mạng.
- Khóa API chỉ nằm ở máy chủ, không có trong trang web.
- **Chưa có khóa API → “Chế độ thử”**: chỉ sửa viết hoa đầu câu, dấu cuối câu, khoảng trắng bằng luật (KHÔNG phải AI), trên giao diện có ghi rõ.

## 1. Lấy khóa Gemini miễn phí
1. Vào https://aistudio.google.com/apikey và đăng nhập bằng tài khoản Google.
2. Bấm **Create API key** rồi sao chép khóa.
3. Không đưa khóa vào mã nguồn hay gửi cho người khác. Gói miễn phí có giới hạn số lượt mỗi phút/ngày, đủ dùng cho một lớp.

## 2. Chạy trên máy (cần Node.js 18 trở lên)
```bash
cd thay-nam-ne-web
GEMINI_API_KEY=khoa_cua_thay node server.js     # hoặc: node server.js (Chế độ thử)
```
Sau đó mở http://localhost:8787. Để điện thoại cùng mạng Wi-Fi mở được, dùng http://<IP máy tính>:8787.
(Không cần `npm install` để chạy; `playwright` chỉ dùng để chụp ảnh màn hình với `npm run shots`.)

## 3. Đưa lên hosting miễn phí lâu dài
**Render (khuyên dùng, chạy đúng server.js):**
1. Đưa thư mục lên một kho GitHub.
2. Vào render.com → New → **Web Service** → chọn kho.
3. Build command: `echo ok`. Start command: `node server.js`. Gói: Free.
4. Ở mục Environment, thêm `GEMINI_API_KEY`.
5. Bấm Deploy để nhận link `https://...onrender.com`. Gói Free tự “ngủ” khi không dùng, lần mở đầu tiên chờ khoảng 30–50 giây.

**Vercel:** trang trong `public/` phục vụ được dạng tĩnh, nhưng phần `/api/fix` và `/api/ocr` phải chuyển thành Serverless Functions (`api/fix.js`, `api/ocr.js`) dùng lại hàm `fix()`/`ocr()` trong `server.js`. Vì vậy Render đơn giản hơn.

Trang phải chạy trên **https** thì mới “Thêm vào màn hình chính” dạng app và dùng camera được.

## Cấu trúc
- `server.js` – máy chủ Node không cần thư viện ngoài: API `/api/fix`, `/api/ocr`, `/api/health` và phục vụ trang.
- `public/` – giao diện (`index.html`), linh vật SVG tự vẽ, manifest PWA, `sw.js`, video hướng dẫn.
- `shots.js` – chụp ảnh màn hình mobile và làm khung hình video.

## Giới hạn để bảo vệ hạn mức khóa
- Mỗi địa chỉ IP được tối đa 10 lượt gọi AI mỗi phút (vượt quá sẽ báo “Con bấm nhanh quá!”).
- Mỗi bài dài tối đa 1500 ký tự; ảnh gửi lên tối đa khoảng 6 MB.
- Model mặc định là `gemini-flash-latest` (có gói miễn phí); muốn đổi thì đặt biến `GEMINI_MODEL`.
