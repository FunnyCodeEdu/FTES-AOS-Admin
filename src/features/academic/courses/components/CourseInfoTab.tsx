import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Form,
  Input,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { ApiError } from "../../../../shared/api/client";
import type { CourseDetail, CourseFormValues, CourseType } from "../../types";
import {
  useCourseCategories,
  usePublishCourse,
  useUnpublishCourse,
  useUpdateCourse,
  type CourseCategory,
} from "../api/courses.api";
import { COURSE_LEVEL_OPTIONS } from "./CourseFormModal";
import { CourseThumbnailUpload } from "./CourseThumbnailUpload";
import { SubjectSelect } from "../../components/SubjectSelect";

interface CourseInfoTabProps {
  course: CourseDetail;
  readOnly?: boolean;
  /**
   * Cho phép ĐỔI môn học của khoá. Mặc định false.
   *
   * Việc đổi môn đi qua `PATCH /admin/courses/{id}`, route đòi `admin.course.manage`. Giảng viên
   * mở khoá của mình (trang instructor workspace) KHÔNG có quyền đó, nên bật ô này cho họ chỉ để
   * đổi xong ăn 403 — mở đúng ở màn quản trị.
   */
  canEditSubject?: boolean;
  /** Quyền publish (ownership hoặc course.publish). Card "Trạng thái xuất bản" cho hành động khi có. */
  canPublish?: boolean;
}

export function CourseInfoTab({ course, readOnly, canPublish, canEditSubject }: CourseInfoTabProps) {
  const [form] = Form.useForm<CourseFormValues>();
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const update = useUpdateCourse(course.id);
  const { data: categories = [], isLoading: loadingCategories } = useCourseCategories();

  useEffect(() => {
    form.setFieldsValue({
      subjectId: course.subjectId,
      slugName: course.slugName,
      name: course.name,
      summary: course.summary,
      saleMode: course.saleMode,
      categoryId: course.categoryId,
      level: course.level,
      contentCourse: course.contentCourse,
      imageHeader: course.imageHeader ?? "",
    });
    setThumbnailFile(null);
  }, [course, form]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      // Chỉ gửi field THẬT SỰ đổi so với `course` (nguồn từ /manage — projection KHÔNG mang summary/
      // subjectId nên khởi tạo rỗng). Gửi cả form mỗi lần lưu sẽ: (1) PATCH description="" xoá trắng mô
      // tả thật của khoá, (2) PATCH subjectId="" qua route admin đòi admin.course.manage → owner 403.
      // saleMode chỉ gửi khi đổi (guard COURSE_TYPE_DOWNGRADE_FORBIDDEN không dính lần sửa tên vô tội).
      const changed: Partial<CourseFormValues> = {};
      if (values.name !== course.name) changed.name = values.name;
      if ((values.summary ?? "") !== (course.summary ?? "")) changed.summary = values.summary;
      if ((values.subjectId ?? "") !== (course.subjectId ?? "")) changed.subjectId = values.subjectId;
      if (values.saleMode && values.saleMode !== course.saleMode) changed.saleMode = values.saleMode;
      if ((values.categoryId ?? "") !== (course.categoryId ?? "")) changed.categoryId = values.categoryId;
      if ((values.level ?? "") !== (course.level ?? "")) changed.level = values.level;
      if ((values.contentCourse ?? "") !== (course.contentCourse ?? "")) {
        changed.contentCourse = values.contentCourse;
      }
      if ((values.imageHeader ?? "") !== (course.imageHeader ?? "")) {
        changed.imageHeader = values.imageHeader;
      }
      if ((values.slugName ?? "") !== (course.slugName ?? "")) changed.slugName = values.slugName;
      if (thumbnailFile) changed.thumbnailFile = thumbnailFile;
      if (Object.keys(changed).length === 0) {
        message.info("Không có thay đổi để lưu");
        return;
      }
      update.mutate(changed, {
        onSuccess: (updated) => {
          if (updated.imageHeader !== undefined) {
            form.setFieldValue("imageHeader", updated.imageHeader);
          }
          setThumbnailFile(null);
          message.success("Đã cập nhật khoá học");
        },
        onError: (err: Error) => message.error(err.message || "Lưu thất bại"),
      });
    });
  };

  /**
   * LEGACY → PACKAGE là thao tác MỘT CHIỀU (BE cấm hạ về LEGACY) nên phải xác nhận ngay lúc chọn,
   * trước khi có cơ hội bấm Lưu. Huỷ thì trả select về LEGACY và không gửi request nào.
   */
  const handleSaleModeChange = (value: CourseType) => {
    if (course.saleMode !== "LEGACY" || value !== "PACKAGE") return;
    Modal.confirm({
      title: "Chuyển khoá học sang bán theo gói?",
      content:
        "Thao tác này KHÔNG hoàn tác được — hệ thống không cho hạ khoá về LEGACY. Khoá sẽ chuyển sang bán theo gói, hệ thống tự tạo gói \"Trọn khoá\" và học viên đang học vẫn giữ nguyên quyền học.",
      okText: "Chuyển sang PACKAGE",
      cancelText: "Huỷ",
      onCancel: () => form.setFieldValue("saleMode", "LEGACY"),
    });
  };

  return (
    <div>
      <Typography.Title level={5}>Tổng quan</Typography.Title>
      <Form form={form} layout="vertical">
        {/* Trước đây là một ô Input KHOÁ CỨNG buộc vào `subjectId` — mà `subjectId` lại luôn rỗng
            vì projection admin không trả môn về, nên ô này chưa bao giờ hiện gì. Kể cả có dữ liệu
            thì nó cũng chỉ in ra một UUID trần, thứ không ai đọc được.
            Giờ là bộ chọn tìm-ở-server, và hiện `mã - tên` của môn đang gắn. */}
        <Form.Item name="subjectId" label="Môn học">
          <SubjectSelect
            disabled={readOnly || !canEditSubject}
            placeholder={canEditSubject ? "Bỏ trống nếu khoá không thuộc môn nào" : "Chưa gắn môn"}
            initialLabel={course.subjectName || undefined}
          />
        </Form.Item>
        <Form.Item name="name" label="Tên khoá học" rules={[{ required: true }]}>
          <Input disabled={readOnly} />
        </Form.Item>
        {/* Đường dẫn công khai. Cảnh báo đặt ngay dưới ô chứ không phải trong tooltip: đổi slug
            làm mọi liên kết cũ đã chia sẻ 404, và người sửa cần đọc điều đó TRƯỚC khi gõ.
            Bỏ trống = giữ nguyên (BE coi rỗng là không đổi), nên không có rule required. */}
        <Form.Item
          name="slugName"
          label="Đường dẫn (slug)"
          extra="Đổi slug sẽ làm MỌI liên kết cũ tới khoá này không còn dùng được. Bỏ trống để giữ nguyên."
        >
          <Input disabled={readOnly} addonBefore="/courses/" placeholder="vd: prn232-web-api" />
        </Form.Item>
        <Form.Item name="summary" label="Tóm tắt">
          <Input.TextArea rows={4} disabled={readOnly} />
        </Form.Item>
        {/* Danh mục: BE nhận categoryId ở CatalogService.update từ lâu, chỉ màn admin là chưa
            bao giờ có ô này nên không ai sửa được danh mục khoá. */}
        <Form.Item name="categoryId" label="Danh mục">
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            disabled={readOnly}
            loading={loadingCategories}
            placeholder="Chọn danh mục khoá học"
            options={categories.map((c: CourseCategory) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item
          name="contentCourse"
          label="Bạn sẽ học được gì"
          extra="Mỗi ý cách nhau bằng dấu phẩy — hiển thị thành danh sách ở trang khoá học."
        >
          <Input.TextArea rows={3} disabled={readOnly} placeholder="VD: Ngữ pháp cơ bản, Kanji cơ bản" />
        </Form.Item>
        <Form.Item name="level" label="Cấp độ">
          <Select
            allowClear
            disabled={readOnly}
            placeholder="Chọn cấp độ khoá học"
            options={COURSE_LEVEL_OPTIONS}
          />
        </Form.Item>
        <Form.Item name="imageHeader" label="Thumbnail khoá học">
          <CourseThumbnailUpload
            file={thumbnailFile}
            onFileChange={setThumbnailFile}
            disabled={readOnly}
          />
        </Form.Item>
        <Form.Item name="saleMode" label="Loại khoá học">
          <Select
            disabled={readOnly}
            placeholder="Chọn loại khoá học"
            onChange={handleSaleModeChange}
            options={[
              { value: "LEGACY", label: "LEGACY", disabled: course.saleMode === "PACKAGE" },
              { value: "PACKAGE", label: "PACKAGE" },
            ]}
          />
        </Form.Item>
        {/* Save hiển thị theo prop readOnly (owner-authz), KHÔNG gate <Can course.manage> — owner
            thuần (instructor_id) không có quyền GLOBAL/scoped nhưng vẫn được sửa khoá của mình. */}
        {!readOnly && (
          <Button type="primary" onClick={handleSave} loading={update.isPending}>
            Lưu
          </Button>
        )}
      </Form>

      {/* #2 gọn course: gấp tab "Publish" vào Tổng quan thành 1 Card. */}
      <CoursePublishCard course={course} readOnly={readOnly || !canPublish} />
    </div>
  );
}

/**
 * "Trạng thái xuất bản" — gộp từ PublishTab cũ (change course-editor-slimming): badge workflow +
 * checklist + Publish/Unpublish. Gate hành động theo `readOnly` (trang truyền readOnly || !canPublish).
 */
function CoursePublishCard({ course, readOnly }: { course: CourseDetail; readOnly?: boolean }) {
  const publish = usePublishCourse(course.id);
  const unpublish = useUnpublishCourse(course.id);
  const [checklist, setChecklist] = useState<CourseDetail["publishChecklist"]>(
    course.publishChecklist ?? []
  );
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [unpublishForm] = Form.useForm<{ reason: string }>();
  const unpublishReason = Form.useWatch("reason", unpublishForm);

  const handlePublish = () => {
    Modal.confirm({
      title: "Publish khoá học",
      content: (
        <>
          Sau khi publish, khoá học <strong>{course.name}</strong> sẽ hiển thị với học viên và giá có hiệu lực.
          Hành động này được ghi audit.
        </>
      ),
      okText: "Publish",
      onOk: () => {
        publish.mutate(
          { note: "" },
          {
            onSuccess: () => message.success("Đã publish khoá học"),
            onError: (err: Error) => {
              const code = err instanceof ApiError ? err.code : undefined;
              if (code === 422) {
                // BE expected to return checklist in message or data; data already unwrapped by interceptor
                setChecklist(course.publishChecklist ?? []);
              }
              message.error(err.message || "Publish thất bại");
            },
          }
        );
      },
    });
  };

  const handleUnpublishOk = () => {
    unpublishForm.validateFields().then(({ reason }) => {
      unpublish.mutate(
        { reason },
        {
          onSuccess: () => {
            message.success("Đã unpublish khoá học");
            unpublishForm.resetFields();
            setUnpublishOpen(false);
          },
          onError: (err: Error) => message.error(err.message || "Unpublish thất bại"),
        }
      );
    });
  };

  return (
    <Card title="Trạng thái xuất bản" style={{ marginTop: 24 }}>
      <Space style={{ marginBottom: 16 }}>
        <Badge
          status={course.workflowStatus === "published" ? "success" : "default"}
          text={
            course.workflowStatus === "published"
              ? "Đã publish"
              : course.workflowStatus === "review"
                ? "Chờ duyệt"
                : "Bản nháp"
          }
        />
      </Space>

      <Card size="small" title="Checklist" style={{ marginBottom: 16 }}>
        <List
          dataSource={checklist}
          renderItem={(item) => (
            <List.Item>
              <Space>
                {item.passed ? (
                  <CheckCircleOutlined style={{ color: "green" }} />
                ) : (
                  <CloseCircleOutlined style={{ color: "red" }} />
                )}
                <Typography.Text delete={item.passed}>{item.label}</Typography.Text>
                {!item.passed && <Tag color="error">Chưa đạt</Tag>}
              </Space>
            </List.Item>
          )}
        />
      </Card>

      {/* Gate theo prop readOnly (trang truyền readOnly || !canPublish — canPublish suy từ ownership
          hoặc course.publish GLOBAL). KHÔNG <Can course.publish>: owner thuần không có quyền GLOBAL/
          scoped nhưng BE cho publish khoá của mình (requireManage / course.publish@COURSE). */}
      {!readOnly && (
        <Space>
          {course.workflowStatus !== "published" && (
            <Button type="primary" onClick={handlePublish} loading={publish.isPending}>
              Publish
            </Button>
          )}
          {course.workflowStatus === "published" && (
            <Button danger onClick={() => setUnpublishOpen(true)} loading={unpublish.isPending}>
              Unpublish
            </Button>
          )}
        </Space>
      )}

      <Modal
        title="Unpublish khoá học"
        open={unpublishOpen}
        onCancel={() => {
          setUnpublishOpen(false);
          unpublishForm.resetFields();
        }}
        onOk={handleUnpublishOk}
        confirmLoading={unpublish.isPending}
        okText="Unpublish"
        okButtonProps={{ danger: true, disabled: !unpublishReason?.trim() }}
      >
        <Typography.Paragraph type="danger">
          Khoá học <strong>{course.name}</strong> sẽ ẩn khỏi học viên. Hành động được ghi audit.
        </Typography.Paragraph>
        <Form form={unpublishForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do unpublish"
            rules={[
              { required: true, message: "Vui lòng nhập lý do" },
              { min: 5, message: "Lý do phải có ít nhất 5 ký tự" },
            ]}
          >
            <Input.TextArea
              rows={3}
              autoFocus
              placeholder="Khoá học sẽ ẩn khỏi học viên. Vui lòng nhập lý do."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
