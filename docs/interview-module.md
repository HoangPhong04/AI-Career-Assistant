# Interview Simulator — Hướng dẫn sử dụng

## Mục đích

Interview Simulator tạo buổi phỏng vấn theo vị trí, cấp độ và dạng câu hỏi,
lưu câu trả lời, rồi tạo điểm số và phản hồi cho từng câu. Buổi phỏng vấn và
câu trả lời được lưu theo tài khoản để có thể mở lại sau.

## Trước khi sử dụng

- Đăng nhập vào ứng dụng.
- Cấu hình `GEMINI_API_KEY` trong môi trường chạy ứng dụng để tạo câu hỏi và
  phản hồi AI. Không đưa API key vào mã nguồn hoặc chia sẻ `.env`.
- Cơ sở dữ liệu PostgreSQL phải khả dụng và migration đã được áp dụng.

## Luồng sử dụng

1. Mở **Interview Simulator**.
2. Nhập vị trí mục tiêu, chọn cấp độ và dạng câu hỏi.
3. Chọn từ 3 đến 10 câu hỏi rồi bắt đầu buổi phỏng vấn.
4. Trả lời lần lượt câu hỏi đang hiển thị. Câu trả lời được lưu trước khi hệ
   thống yêu cầu AI chấm điểm.
5. Xem điểm và phản hồi cho từng câu. Sau câu cuối, báo cáo hiển thị điểm tổng
   khi tất cả câu đã có điểm hợp lệ.
6. Chọn một buổi trong **Buổi gần đây** để mở lại câu trả lời và phản hồi đã
   lưu. Lịch sử chỉ chứa dữ liệu của tài khoản hiện tại.

Điểm tổng là trung bình cộng điểm các câu, làm tròn đến hai chữ số thập phân.
Nếu còn câu chưa được đánh giá, báo cáo hiển thị số câu đã đánh giá thay cho
điểm tổng.

## Khi AI gặp lỗi

- **Hết quota (429):** ứng dụng hiển thị thông báo và thời điểm có thể thử lại
  nếu nhà cung cấp cung cấp thông tin đó. Không tự gửi lại yêu cầu trong lúc
  quota bị giới hạn.
- **AI tạm thời không khả dụng (503):** hệ thống tự thử lại một lần sau một
  khoảng chờ ngắn. Nếu lần thử lại vẫn thất bại, xem thông báo và thử lại sau.
- **Hết thời gian chờ hoặc lỗi xử lý (502):** câu trả lời vẫn được lưu. Xem
  thông báo và thử tạo phản hồi lại sau; timeout không tự retry để tránh tạo
  thêm yêu cầu tốn quota khi trạng thái yêu cầu trước chưa rõ.
- **AI trả phản hồi không đúng định dạng:** hệ thống thử tạo lại phản hồi tối
  đa một lần. Nếu vẫn không hợp lệ, yêu cầu kết thúc với thông báo lỗi.
- **Không có phản hồi sau khi đã gửi câu trả lời:** câu trả lời vẫn được lưu.
  Mở lại buổi phỏng vấn và bấm **Tạo phản hồi cho câu này** để thử lại riêng
  phần đánh giá; không cần gửi lại câu trả lời.

Lỗi được trả cho giao diện dưới dạng thông báo thân thiện; chi tiết nội bộ từ
nhà cung cấp AI không được hiển thị cho người dùng.

## Kiểm tra trước khi phát hành

- `npm test` — kiểm tra validation, scoring, phản hồi, quota và chính sách retry.
- `npm run test:integration` — kiểm tra persistence khi có database kiểm thử.
- `npm run lint` và `npm run build` — kiểm tra chất lượng và build ứng dụng.
- Trên môi trường staging, tạo session, trả lời tuần tự, mở lại session, thử
  đánh giá lại một câu lỗi và xác nhận điểm tổng chỉ xuất hiện khi mọi câu đã
  được đánh giá.
