# Hướng dẫn demo StrokeSOS — Tiếng Việt

**Mở website:** https://rmit-hack-stroke-sos.vercel.app/  
**Thời lượng:** khoảng hai phút.  
**Bản tiếng Anh:** [English demo guide](DEMO_EN.md).

## Chuẩn bị trước khi quay

1. Mở website bằng Chrome hoặc Edge trên máy tính, ưu tiên cửa sổ 1920 × 1080. Đóng hộp hướng dẫn thiết lập nếu đang mở.
2. Giữ **Demo mode** ở trạng thái bật: chờ phản hồi bệnh nhân 5 giây, quyền truy cập hết hạn sau 60 giây. Tắt chế độ này sẽ dùng 60 giây / 15 phút.
3. Tải lại trang để có nhật ký mới. Kiểm tra nhãn màu vàng **TIDE AUTHORITY SIMULATED** và chuỗi mã hóa ở cột giữa.
4. Nếu muốn dùng webcam, bấm **Enable private camera**, cấp quyền và đứng sao cho camera thấy thân người, chân. Màn hình bình thường chỉ hiện bộ khung màu xanh. Dùng nút mô phỏng, không cần thực hiện động tác ngã thật.
5. Nếu camera không hoạt động hoặc ánh sáng không phù hợp, để camera tắt và dùng **Simulate fall**. Bộ khung mẫu có nhãn mô phỏng. Hồ sơ vẫn được giải mã thật bằng AES-GCM cục bộ; ô video sẽ báo camera chưa hoạt động.
6. Chọn **Emergency paramedic** ở danh sách vai trò mô phỏng. Tránh bấm nút đặt lại ca khi đang trình diễn.

Giao diện hiện dùng tiếng Anh; hướng dẫn này cung cấp lời thuyết trình tiếng Việt và giữ nguyên tên nút để bạn dễ thao tác.

## Kịch bản hai phút và lời thuyết trình

| Thời gian | Thao tác | Lời gợi ý |
| --- | --- | --- |
| 00:00–00:15 | Giới thiệu ba cột và nhãn mô phỏng màu vàng. | “StrokeSOS minh họa theo dõi khẩn cấp với quyền riêng tư làm mặc định. Khi bình thường, hệ thống chỉ hiển thị bộ khung thay vì video thô. Bản demo công khai dùng AES-GCM thật trong trình duyệt; danh tính và cơ chế cấp quyền Tide đang được ghi rõ là mô phỏng do bước kích hoạt giấy phép thật gặp lỗi.” |
| 00:15–00:30 | Bấm **Rogue admin: override & decrypt** ở cột giữa. Có thể mở **Inspect actual result**. | “Cờ trong cơ sở dữ liệu đã đổi thành true, nhưng chính sách mô phỏng vẫn từ chối truy cập hồ sơ. Đây là cách minh họa ràng buộc tin cậy, chưa phải kết quả từ chối thật từ mạng Tide.” |
| 00:30–00:45 | Bấm **Simulate fall**, hoặc nhấn **F** khi con trỏ không ở ô nhập liệu. Chỉ vào đồng hồ 5 giây và nhịp tim mô phỏng. | “Một sự kiện ngã mô phỏng kích hoạt thời gian chờ bệnh nhân phản hồi. Chữ ký thiết bị, nhịp tim và cảm biến mmWave được mô phỏng. Nếu bật webcam, MediaPipe cũng có thể chạy phép phát hiện tư thế ngã thử nghiệm ngay trên máy.” |
| 00:45–01:00 | Bấm **Demo sign in** nếu chưa đăng nhập. Khi đồng hồ về 00:00, bấm **Co-sign & request emergency decrypt**. | “Luồng xử lý yêu cầu đủ ba điều kiện: có cờ phát hiện ngã, hết thời gian chờ và có danh tính nhân viên cấp cứu mô phỏng. Yêu cầu chờ ít nhất 1,5 giây trước khi hiển thị kết quả.” |
| 01:00–01:15 | Chỉ vào hồ sơ vừa mở và đồng hồ TTL. Nếu có webcam, trình diễn các khung hình đã giải mã. | “Tầng hai đã được giải mã: nhóm máu O dương, thuốc Warfarin và tiền sử liên quan. Với camera đang bật, các khung hình JPEG được mã hóa và giải mã AES-GCM thật. Nếu không có camera, ứng dụng báo camera chưa hoạt động thay vì tạo video giả.” |
| 01:15–01:35 | Bấm **Test access** ở Tier 3. Nhập **Can we administer tPA?** vào trợ lý rồi gửi. | “Hồ sơ tâm thần, bảo hiểm và tài chính vẫn bị từ chối. Trợ lý chỉ nhận các trường cấp cứu đã mở. Câu trả lời được ghi rõ là theo kịch bản: nhắc kiểm tra INR và tuân thủ phác đồ khi bệnh nhân dùng Warfarin, không kết luận chống chỉ định tuyệt đối.” |
| 01:35–01:48 | Bấm **Close case & revoke access** trước khi TTL 60 giây kết thúc. | “Đóng ca sẽ xóa hồ sơ, tham chiếu khóa và nội dung trò chuyện khỏi phía người cấp cứu, đồng thời dừng camera. Đây là thu hồi phiên cục bộ; không thể xóa dữ liệu người khác đã sao chép trước đó.” |
| 01:48–02:00 | Mở **Patient audit**, bấm **Verify chain**. Có thể bấm **Export JSON**. | “Sau hồi phục, bệnh nhân có thể kiểm tra ai yêu cầu tầng dữ liệu nào, kết quả và thời điểm hết hạn. Nhật ký dùng chuỗi băm SHA-256 cục bộ thật, nhưng được ghi rõ là biên nhận mô phỏng, không phải chữ ký của mạng Tide.” |

TTL 60 giây bắt đầu tính khi giải mã thành công. Nếu nói quá lâu và quyền tự hết hạn, hãy chuyển sang nhật ký, chỉ vào sự kiện **REVOKE / TTL expired automatically** để minh họa cơ chế tự khóa.

## Thứ tự bấm nhanh

**Rogue admin** → **Simulate fall** → chờ 5 giây → **Demo sign in** → **Co-sign** → **Test access** → hỏi về tPA → **Close case** → **Patient audit** → **Verify chain**.

Muốn quay lại: mở **Live operations**, bấm biểu tượng đặt lại **Start a new case**, rồi bật lại camera nếu cần. Tải lại trang cũng tạo phiên mới và xóa nhật ký đang giữ trong bộ nhớ.

## Xử lý tình huống khi demo

- **Nút Co-sign bị mờ:** kiểm tra ba chỉ báo điều kiện. Phải hết thời gian chờ, chọn Emergency paramedic và đăng nhập. Nếu ca đã đóng, cần tạo ca mới.
- **Lỡ bấm “I'm okay”:** bấm mô phỏng ngã lại và chờ đồng hồ.
- **Hết TTL:** trình diễn sự kiện tự thu hồi trong nhật ký, sau đó đặt lại ca.
- **Camera lỗi / không thấy tư thế:** dùng mô phỏng ngã và hồ sơ được giải mã. Không gọi bộ khung mẫu hoặc ô video chưa hoạt động là hình ảnh trực tiếp.
- **Trợ lý báo access denied:** hồ sơ Tier 2 chưa được mở. Hoàn tất Co-sign trước; việc từ chối này là hành vi đúng.
- **Tier 3 bị từ chối:** đây là kết quả mong đợi. Trên website hiện tại, cơ chế cấp quyền vẫn là mô phỏng.

## Nếu được hỏi “Đã tích hợp TideCloak thật chưa?”

“Mã nguồn đã tích hợp SDK chính thức qua các API đăng nhập, kiểm tra vai trò, doEncrypt và doDecrypt có trong tài liệu. Docker và máy chủ TideCloak cục bộ đã được cài, nhưng bước hoàn tất giấy phép thật của Tide trả về HTTP 500 nên website công khai vẫn ghi rõ cấp quyền Tide là mô phỏng. Mã hóa AES-GCM cục bộ, suy luận MediaPipe khi có webcam và chuỗi băm nhật ký là thật. Chưa khẳng định có chứng thực phần cứng, đồng ký nhiều bên, giải mã khẩn cấp giữa nhiều người dùng hoặc thu hồi quyền do mạng Tide thực thi.”

Xem [trạng thái thiết lập](SETUP_STATUS.md) và [README](../README.md) để biết lỗi thật và các bước tiếp tục. Chỉ bỏ nhãn mô phỏng khi đã hoàn tất đăng ký tài khoản và kiểm thử cấp quyền trên mạng thật. TideCloak chạy ở localhost chưa phải máy chủ HTTPS công khai cho người truy cập website Vercel.
