import { useRef, useState } from "react";
import { Alert, Button, Card, Empty, List, Skeleton, Space, Tag, Typography, message } from "antd";
import { FileTextOutlined, PictureOutlined, ReloadOutlined, ScanOutlined } from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import { useFeAlbum, useImportFeAlbumFiles, type FeAlbumPage } from "../api/feAlbum.api";

/** Trần trang mỗi lượt chọn — chỉ để chặn nhầm tay; trần thật của album do BE phát ra. */
const MAX_PICK = 20;

/**
 * Tab "Đề FE" của một học liệu `type=FE`: xem các trang trong album và nạp thêm.
 *
 * <b>Hai nút nạp TÁCH BẠCH, không phải một công tắc</b> — chúng làm hai việc ngược nhau với cùng
 * một file ảnh:
 * - *Nạp file văn bản* (.txt/.md): AI dọn hình thức rồi lưu thành trang chữ.
 * - *Số hoá ảnh đề*: AI đọc ảnh thành chữ, **ảnh gốc không được giữ**, chỉ những vùng không diễn
 *   đạt được bằng chữ (đồ thị, hình học) mới được cắt ra lưu lại.
 *
 * Gộp thành một công tắc thì một cú bấm nhầm sẽ vứt mất bản scan.
 *
 * <p>Trang chữ hơn trang scan ở chỗ tìm kiếm được, copy được, và bot giải đề FE đọc được — nên
 * nạp ảnh qua đường số hoá là mặc định nên khuyến khích, còn *thêm ảnh* thuần vẫn nằm ở màn học
 * viên cho người chỉ muốn lưu nguyên trang.
 */
export function FeExamAlbumTab({ resourceId }: { resourceId: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useFeAlbum(resourceId);
  const importFiles = useImportFeAlbumFiles();
  const textInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const pages = data?.images ?? [];
  const remaining = Math.max(0, (data?.maxImages ?? 0) - pages.length);

  const onPick = async (fileList: FileList | null, mode: "TEXT" | "SCAN") => {
    const picked = Array.from(fileList ?? []);
    if (picked.length === 0) return;
    if (remaining === 0) {
      message.error("Album đã đầy.");
      return;
    }
    const accepted = picked.slice(0, Math.min(remaining, MAX_PICK));
    if (accepted.length < picked.length) {
      // Nói ra phần bị bỏ; im lặng cắt bớt là để người nạp tưởng đã nạp đủ.
      message.warning(`Chỉ nạp ${accepted.length}/${picked.length} file (album còn ${remaining} chỗ).`);
    }
    setProgress({ done: 0, total: accepted.length });
    try {
      const outcome = await importFiles.mutateAsync({
        resourceId,
        files: accepted,
        mode,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      if (outcome.imported > 0) {
        message.success(`Đã nạp ${outcome.imported} trang đề.`);
      }
      outcome.warnings.slice(0, 3).forEach((w) => message.warning(w));
      outcome.failed.slice(0, 3).forEach((f) => message.error(`${f.filename}: ${f.reason}`));
    } finally {
      setProgress(null);
    }
  };

  const renderPage = (page: FeAlbumPage, index: number) => {
    const isText = page.kind === "TEXT";
    return (
      <List.Item key={page.id}>
        <List.Item.Meta
          avatar={
            isText ? (
              <FileTextOutlined style={{ fontSize: 22 }} />
            ) : (
              <PictureOutlined style={{ fontSize: 22 }} />
            )
          }
          title={
            <Space>
              <span>Trang {index + 1}</span>
              <Tag color={isText ? "blue" : "default"}>{isText ? "Chữ" : "Ảnh scan"}</Tag>
              {page.sourceFilename ? (
                <Typography.Text type="secondary">{page.sourceFilename}</Typography.Text>
              ) : null}
            </Space>
          }
          description={
            isText ? (
              <Typography.Paragraph
                type="secondary"
                style={{ marginBottom: 0 }}
                ellipsis={{ rows: 2, expandable: true }}
              >
                {page.textContent ?? ""}
              </Typography.Paragraph>
            ) : (
              <Typography.Text type="secondary">
                {page.commentCount > 0 ? `${page.commentCount} bình luận` : "Chưa có bình luận"}
              </Typography.Text>
            )
          }
        />
      </List.Item>
    );
  };

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      {isError ? (
        <Alert type="error" showIcon message="Không tải được album đề" description={error?.message} />
      ) : null}

      <input
        ref={textInputRef}
        type="file"
        accept=".txt,.md,.markdown,text/plain,text/markdown"
        multiple
        hidden
        onChange={(e) => {
          void onPick(e.target.files, "TEXT");
          e.target.value = "";
        }}
      />
      {/* accept liệt kê CẢ đuôi LẪN MIME: trình duyệt khai `.md` là application/octet-stream ở
          nhiều máy, chỉ lọc MIME là làm mờ đúng loại file người soạn đề hay có nhất. */}
      <input
        ref={scanInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => {
          void onPick(e.target.files, "SCAN");
          e.target.value = "";
        }}
      />

      <Card size="small">
        <Space wrap>
          <Can permissions={["resource.fe.contribute"]}>
            <Button
              icon={<FileTextOutlined />}
              disabled={importFiles.isPending || remaining === 0}
              onClick={() => textInputRef.current?.click()}
            >
              Nạp file văn bản (.txt/.md)
            </Button>
          </Can>
          <Can permissions={["resource.fe.contribute"]}>
            <Button
              icon={<ScanOutlined />}
              disabled={importFiles.isPending || remaining === 0}
              onClick={() => scanInputRef.current?.click()}
            >
              Số hoá ảnh đề thành chữ
            </Button>
          </Can>
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
            Làm mới
          </Button>
          <Typography.Text type="secondary">
            {pages.length}/{data?.maxImages ?? 0} trang
          </Typography.Text>
          {progress ? (
            <Tag color="processing">
              Đang xử lý {progress.done}/{progress.total}…
            </Tag>
          ) : null}
        </Space>
      </Card>

      <Alert
        type="info"
        showIcon
        message="Số hoá ảnh KHÔNG giữ lại ảnh gốc"
        description={
          "Ảnh trang đề được đọc thành chữ (bảng thành bảng, công thức thành LaTeX); chỉ những "
          + "phần không diễn đạt được bằng chữ — đồ thị, hình học, sơ đồ — mới được cắt ra và lưu "
          + "lại thành ảnh. Muốn giữ nguyên cả trang scan thì dùng nút thêm ảnh ở màn học viên."
        }
      />

      {pages.length === 0 ? (
        <Empty description="Album chưa có trang nào." />
      ) : (
        <List itemLayout="horizontal" dataSource={pages} renderItem={renderPage} />
      )}
    </Space>
  );
}
