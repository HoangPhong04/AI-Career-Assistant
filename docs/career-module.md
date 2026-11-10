# Career Roadmap — Hướng dẫn sử dụng và checklist

## 1. Mục đích

Career Roadmap giúp người dùng xác định khoảng cách kỹ năng và tạo lộ trình
học tập theo vai trò, cấp bậc hiện tại và cấp bậc mong muốn.

## 2. Luồng sử dụng

1. Đăng nhập và mở **Career Roadmap**.
2. Nhập vai trò mục tiêu, ví dụ `Embedded Engineer`.
3. Chọn cấp bậc hiện tại, ví dụ `Fresher`.
4. Chọn cấp bậc mong muốn, ví dụ `Junior`.
5. Tùy chọn chọn một CV đã phân tích:
   - Có CV: hệ thống dùng skills đã chuẩn hóa từ CV.
   - Không có CV: AI suy luận một hồ sơ kỹ năng điển hình theo cấp hiện tại.
6. Chọn **Phân tích skill gap** để xem kỹ năng đã có, kỹ năng còn thiếu và điểm
   khoảng cách.
7. Chọn **Tạo lộ trình** để sinh các giai đoạn, nhiệm vụ và tài nguyên học tập.
8. Cập nhật trạng thái từng nhiệm vụ bằng cách bấm vào nút trạng thái.
9. Mở lại roadmap từ danh sách đã lưu để tiếp tục theo dõi tiến độ.

Khi không chọn CV, phần tóm tắt skill gap phải nói rõ rằng kỹ năng hiện tại
được AI suy luận, không phải lấy từ hồ sơ thực tế.

## 3. Hợp đồng dữ liệu chính

### Input

- `targetRole`: bắt buộc, không được để trống.
- `currentLevel`: `fresher`, `junior`, `mid`, `senior` hoặc `lead`.
- `targetLevel`: cấp bậc cần đạt; nếu bỏ trống sẽ dùng `currentLevel`.
- `cvId`: tùy chọn, chỉ chấp nhận CV đã phân tích và thuộc user hiện tại.

### Output

Roadmap gồm:

- `skillGap`: kỹ năng còn thiếu, kỹ năng đã có, điểm gap và phần tóm tắt.
- `roadmap.phases`: các giai đoạn, mục tiêu và tasks.
- `careerAdvice`: đề xuất hành động ngắn hạn, trung hạn và dài hạn.
- Các task được lưu thành `RoadmapStep` với `orderIndex` ổn định để cập nhật
  progress chính xác.

## 4. Checklist nghiệp vụ

- [ ] User chưa đăng nhập không truy cập được `/career`.
- [ ] Role rỗng hoặc chỉ có khoảng trắng bị từ chối.
- [ ] Có thể tạo roadmap không cần CV.
- [ ] Có CV được chọn thì skills lấy đúng từ CV của user.
- [ ] Không thể dùng `cvId` của user khác.
- [ ] `targetLevel` được dùng làm cấp bậc đích của roadmap.
- [ ] Skill gap hiển thị đúng cả trường hợp không có skills đầu vào.
- [ ] Roadmap có thể lưu và mở lại.
- [ ] Mỗi task hiển thị đúng `RoadmapStep` tương ứng.
- [ ] Bấm trạng thái cập nhật đúng task và đúng user.
- [ ] Progress tính đúng số task `COMPLETED`.
- [ ] Lỗi AI thông thường hiển thị thông báo dễ hiểu.
- [ ] Hết quota AI trả thông báo quota và không lộ payload provider.
- [ ] Lỗi cập nhật progress rollback trạng thái trên giao diện.

## 5. Checklist regression trước release

### API và dữ liệu

- [ ] Chạy unit tests Career.
- [ ] Chạy integration tests persistence Career khi có database test.
- [ ] Kiểm tra POST analyze với role + hai cấp bậc khác nhau.
- [ ] Kiểm tra POST roadmap có và không có `cvId`.
- [ ] Kiểm tra GET danh sách và GET chi tiết roadmap.
- [ ] Kiểm tra PATCH với từng trạng thái hợp lệ.
- [ ] Kiểm tra PATCH step không thuộc user hiện tại.

### Giao diện

- [ ] Kiểm tra loading, empty và error state.
- [ ] Kiểm tra roadmap nhiều phase và nhiều task.
- [ ] Reload trang chi tiết rồi cập nhật task ở phase sau; task không bị lệch
      trạng thái.
- [ ] Kiểm tra progress sau reload vẫn giữ nguyên.
- [ ] Kiểm tra giao diện desktop và mobile.

### Build

```text
npm run test
npm run test:integration
npm run lint
npm run build
```

## 6. Các giới hạn đã biết

- Quota Gemini free tier được dùng chung cho các module AI; khi hết quota,
  người dùng phải chờ thời điểm reset hoặc cấu hình billing/tăng hạn mức.
- Khi không có CV, roadmap dựa trên hồ sơ kỹ năng giả định và nên được xem là
  kế hoạch tham khảo cho tới khi người dùng bổ sung thông tin thực tế.
