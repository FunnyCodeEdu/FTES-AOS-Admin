import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Divider,
  Empty,
  List,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import "@uiw/react-md-editor/markdown-editor.css";

import { ApiError } from "../../../../shared/api/client";
import { adminErrorMessage } from "../../../../shared/api/errors";
import { ChallengeDescriptionEditor } from "../../exercises/components/ChallengeDescriptionEditor";
import {
  useChallengePaperPages,
  useDeleteChallengePaperPages,
  useSaveChallengePaperPages,
} from "../api/challengeBankConsole.api";
import {
  insertPageAfter,
  isPaperPagesDirty,
  movePaperPage,
  normalizePagesForSave,
  pageSummary,
  removePageAt,
  toDraftPages,
  validateDraftPages,
} from "../paperPages";
import { paperServerMessage } from "../paperFile";

interface ChallengePaperTextEditorProps {
  /** UUID thử thách; `undefined` khi modal chưa có mục tiêu. */
  challengeId: string | undefined;
  /** Tab đang mở — chỉ khi mở mới gọi API (modal giữ cả hai tab trong DOM). */
  active: boolean;
  /** Không đủ quyền sửa ⇒ chỉ đọc (modal truyền `!canManage`). */
  disabled?: boolean;
}

/** 404/405 = endpoint chưa deploy, KHÁC hẳn "nội dung của bạn sai" — phải nói cho đúng. */
function isEndpointMissing(error: unknown): boolean {
  return error instanceof ApiError && (error.code === 404 || error.code === 405);
}

/**
 * Soạn ĐỀ DẠNG CHỮ cho một thử thách — nội dung đề gõ thẳng thành markdown từng trang
 * (BE change `challenge-paper-text`, V388).
 *
 * **Vì sao có màn này**: 163 đề PE trong kho đang là PDF, và học viên đọc chúng qua một `<iframe>` —
 * không bôi đen được chữ, mở trên điện thoại thì trình duyệt tải cả tệp rồi thu nhỏ vừa khung, không
 * tìm được câu nào trong đề, và bot/AI cũng không đọc nổi nội dung. Bản chữ giữ CÙNG đề đó dưới dạng
 * markdown, và học viên đọc nó bằng đúng trình xem trang chữ mà album đề FE đã chạy từ V346.
 *
 * **Chữ + ảnh, không phải chữ thuần**: nhiều đề PE có sơ đồ, bảng, ảnh chụp màn hình. Ảnh minh hoạ
 * chèn NGAY TRONG markdown bằng `![](url)` — nút "Tải ảnh" trên thanh công cụ upload qua
 * `POST /api/v1/challenges/media` rồi chèn tại con trỏ. Vị trí hình so với chữ là do người soạn
 * quyết định; một danh sách "ảnh của trang" riêng thì không nói được "hình này đứng giữa câu 4 và
 * câu 5".
 *
 * **Bản chữ KHÔNG thay bộ tệp đề**: hai thứ chạy song song. Có bản chữ thì học viên đọc chữ và PDF
 * gốc tụt xuống khu "Tệp đính kèm" thành link tải (để đối chiếu khi nghi bản chữ gõ sai); template
 * .zip/.docx giữ nguyên vai cũ. Xoá bản chữ thì đề quay về hiển thị PDF y như trước — đó là đường
 * lùi, luôn có sẵn một cú bấm.
 *
 * **Lưu là REPLACE-SET**: bấm "Lưu" gửi TOÀN BỘ mảng trang lên; server bỏ trang trắng rồi đánh số
 * lại từ 1. Không có lưu-từng-trang, và cố ý: trình soạn cho chèn/xoá/đổi chỗ trang, nên sau một lần
 * chèn ở giữa thì "trang số 5" của màn hình và "trang số 5" của server đã là hai trang khác nhau.
 *
 * ĐƯỜNG LÙI: endpoint chưa deploy (404/405) ⇒ tab nói thẳng là máy chủ chưa mở, thay vì hiện một
 * trình soạn bấm Lưu là lỗi.
 */
export function ChallengePaperTextEditor({
  challengeId,
  active,
  disabled,
}: ChallengePaperTextEditorProps) {
  const pagesQuery = useChallengePaperPages(challengeId, active);
  const save = useSaveChallengePaperPages();
  const clear = useDeleteChallengePaperPages();

  /** Bản NHÁP đang gõ. Nguồn sự thật của màn hình cho tới lúc bấm Lưu. */
  const [draft, setDraft] = useState<string[]>([]);
  /** Bản ĐÃ LƯU gần nhất — mốc để biết còn thay đổi chưa lưu hay không. */
  const [saved, setSaved] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const serverPages = pagesQuery.data;

  /**
   * Nạp bản server về nháp khi mở tab / đổi thử thách / server trả bản mới sau khi lưu.
   *
   * CỐ Ý không đưa `draft` vào deps: effect chỉ chạy theo DỮ LIỆU SERVER. Đưa vào thì mỗi ký tự gõ
   * sẽ kích hoạt lại effect và ghi đè chính thứ vừa gõ.
   */
  useEffect(() => {
    if (!active || serverPages === undefined) return;
    const next = toDraftPages(serverPages);
    setDraft(next);
    setSaved(next);
    setCurrent((index) => Math.min(index, Math.max(next.length - 1, 0)));
  }, [active, serverPages, challengeId]);

  const endpointMissing = isEndpointMissing(pagesQuery.error) || isEndpointMissing(save.error);
  const dirty = useMemo(() => isPaperPagesDirty(draft, saved), [draft, saved]);
  const problem = useMemo(() => validateDraftPages(draft), [draft]);
  /** Số trang THẬT sẽ nằm trong DB sau khi lưu (đã bỏ ô trống) — con số hiện trên nút. */
  const willSave = useMemo(() => normalizePagesForSave(draft).length, [draft]);
  const busy = save.isPending || clear.isPending;

  const patchCurrent = (value: string) => {
    setDraft((prev) => prev.map((page, i) => (i === current ? value : page)));
  };

  const addPage = () => {
    setDraft((prev) => {
      const next = insertPageAfter(prev, prev.length === 0 ? -1 : current);
      setCurrent(prev.length === 0 ? 0 : current + 1);
      return next;
    });
  };

  const dropPage = (index: number) => {
    setDraft((prev) => {
      const next = removePageAt(prev, index);
      if (next === prev) return prev;
      setCurrent((c) => Math.max(0, Math.min(c, next.length - 1)));
      return next;
    });
  };

  const movePage = (index: number, direction: -1 | 1) => {
    setDraft((prev) => {
      const next = movePaperPage(prev, index, direction);
      // `movePaperPage` trả CHÍNH mảng cũ khi không đổi được ⇒ khỏi set state thừa.
      if (next === prev) return prev;
      // Con trỏ đi THEO trang vừa chuyển, không đứng yên theo chỉ số: người soạn vừa đẩy trang 3 lên
      // trên là để tiếp tục làm việc với chính nó, không phải với trang vừa bị đẩy xuống.
      setCurrent((c) => (c === index ? index + direction : c === index + direction ? index : c));
      return next;
    });
  };

  const doSave = () => {
    if (!challengeId || problem) return;
    save.mutate(
      { id: challengeId, pages: normalizePagesForSave(draft) },
      {
        onSuccess: (result) => {
          const next = toDraftPages(result);
          setDraft(next);
          setSaved(next);
          setCurrent((index) => Math.min(index, Math.max(next.length - 1, 0)));
          message.success(
            next.length > 0 ? `Đã lưu đề dạng chữ (${next.length} trang)` : "Đã xoá đề dạng chữ"
          );
        },
      }
    );
  };

  const doClear = () => {
    if (!challengeId) return;
    Modal.confirm({
      title: "Xoá đề dạng chữ",
      content:
        "Toàn bộ nội dung chữ sẽ bị xoá. Học viên sẽ quay lại đọc đề bằng tệp PDF/ảnh như trước (các tệp đề KHÔNG bị đụng tới). Bạn có thể soạn lại sau.",
      okText: "Xoá nội dung chữ",
      okButtonProps: { danger: true },
      cancelText: "Huỷ",
      onOk: () =>
        clear.mutateAsync({ id: challengeId }).then(() => {
          setDraft([]);
          setSaved([]);
          setCurrent(0);
          message.success("Đã xoá đề dạng chữ");
        }),
    });
  };

  if (endpointMissing) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Máy chủ chưa mở đề dạng chữ (đang triển khai)"
        description="Tính năng nhập nội dung đề bằng văn bản cần bản backend có V388. Hiện tại thử thách này vẫn dùng tệp đề ở tab bên cạnh."
      />
    );
  }

  if (pagesQuery.isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Đề dạng chữ hiển thị thay cho PDF"
        description="Khi thử thách có nội dung chữ, học viên sẽ ĐỌC nội dung này (bôi đen được, đọc tốt trên điện thoại, tìm kiếm được) và tệp PDF gốc tụt xuống mục “Tệp đính kèm” để tải về đối chiếu. Template .zip/.docx giữ nguyên. Chưa có nội dung chữ thì mọi thứ hiện y như hiện nay."
      />

      {pagesQuery.error && !endpointMissing && (
        <Alert
          type="error"
          showIcon
          message="Không đọc được nội dung chữ của đề"
          description={adminErrorMessage(pagesQuery.error)}
        />
      )}

      {save.error && !isEndpointMissing(save.error) && (
        <Alert
          type="error"
          showIcon
          message="Máy chủ từ chối lượt lưu này"
          // Trần/định dạng là hợp đồng của SERVER: hiện nguyên văn câu của nó, chỉ cắt tiền tố mã.
          // Nội dung đang gõ KHÔNG bị dọn đi cùng lỗi.
          description={paperServerMessage(adminErrorMessage(save.error))}
        />
      )}

      {draft.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Thử thách này chưa có đề dạng chữ."
        >
          {!disabled && (
            <Button type="primary" icon={<PlusOutlined />} onClick={addPage}>
              Soạn trang đầu tiên
            </Button>
          )}
        </Empty>
      ) : (
        <>
          <List
            size="small"
            bordered
            header={
              <Space style={{ width: "100%", justifyContent: "space-between" }}>
                <Typography.Text strong>Các trang đề ({draft.length})</Typography.Text>
                {!disabled && (
                  <Button size="small" icon={<PlusOutlined />} onClick={addPage} disabled={busy}>
                    Thêm trang
                  </Button>
                )}
              </Space>
            }
            dataSource={draft}
            style={{ maxHeight: 220, overflowY: "auto" }}
            renderItem={(page, index) => (
              <List.Item
                onClick={() => setCurrent(index)}
                style={{
                  cursor: "pointer",
                  background: index === current ? "#e6f4ff" : undefined,
                }}
                actions={
                  disabled
                    ? undefined
                    : [
                        <Button
                          key="up"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0 || busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(index, -1);
                          }}
                        />,
                        <Button
                          key="down"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={index === draft.length - 1 || busy}
                          onClick={(e) => {
                            e.stopPropagation();
                            movePage(index, 1);
                          }}
                        />,
                        <Popconfirm
                          key="del"
                          title="Bỏ trang này khỏi đề?"
                          okText="Bỏ"
                          okButtonProps={{ danger: true }}
                          cancelText="Huỷ"
                          onConfirm={() => dropPage(index)}
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            disabled={busy}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Popconfirm>,
                      ]
                }
              >
                <Space size={8} style={{ minWidth: 0 }}>
                  <Typography.Text strong>Trang {index + 1}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                    {pageSummary(page)}
                  </Typography.Text>
                </Space>
              </List.Item>
            )}
          />

          <Segmented
            value={mode}
            onChange={(value) => setMode(value as "edit" | "preview")}
            options={[
              { label: "Soạn trang " + (current + 1), value: "edit" },
              { label: "Xem trước cả đề", value: "preview" },
            ]}
          />

          {mode === "edit" ? (
            /* Dùng LẠI ô soạn mô tả đề bài: cùng editor markdown, cùng nút "Tải ảnh" chèn tại con
               trỏ qua POST /challenges/media (gác challenge.manage — đúng quyền của người soạn đề).
               Dựng một editor thứ hai chỉ để đổi chiều cao là nhân đôi chỗ phải sửa khi đổi renderer. */
            <ChallengeDescriptionEditor
              key={current}
              value={draft[current] ?? ""}
              onChange={(value) => patchCurrent(value)}
              height={420}
            />
          ) : (
            /* Xem trước TRƯỚC KHI LƯU, và xem CẢ ĐỀ chứ không từng trang: lỗi hay gặp nhất khi gõ đề
               là một trang bị cắt giữa câu hoặc một ảnh nhúng sai URL, và cả hai chỉ lộ ra khi đọc
               liền mạch. Cùng renderer với blog/bài học (MDEditor.Markdown + rehype-sanitize, XSS-safe). */
            <div
              data-color-mode="light"
              style={{
                padding: 16,
                background: "#fafafa",
                maxHeight: 480,
                overflowY: "auto",
                border: "1px solid #f0f0f0",
                borderRadius: 8,
              }}
            >
              {normalizePagesForSave(draft).length === 0 ? (
                <Typography.Text type="secondary">
                  Chưa có nội dung nào để xem trước (mọi trang đang trống).
                </Typography.Text>
              ) : (
                normalizePagesForSave(draft).map((page, index) => (
                  <div key={index}>
                    {index > 0 && <Divider orientation="center">— Trang {index + 1} —</Divider>}
                    <MDEditor.Markdown
                      source={page}
                      rehypePlugins={[[rehypeSanitize]]}
                      style={{ background: "transparent" }}
                    />
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {problem && <Alert type="error" showIcon message={problem} />}

      {!disabled && (
        <Space wrap>
          <Button
            type="primary"
            disabled={!dirty || busy || Boolean(problem)}
            loading={save.isPending}
            onClick={doSave}
          >
            {willSave > 0 ? `Lưu đề dạng chữ (${willSave} trang)` : "Lưu (xoá nội dung chữ)"}
          </Button>
          {dirty && (
            <Button
              disabled={busy}
              onClick={() => {
                setDraft(saved);
                setCurrent((index) => Math.min(index, Math.max(saved.length - 1, 0)));
              }}
            >
              Hoàn tác thay đổi
            </Button>
          )}
          {saved.length > 0 && (
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={clear.isPending}
              disabled={busy && !clear.isPending}
              onClick={doClear}
            >
              Xoá đề dạng chữ
            </Button>
          )}
        </Space>
      )}

      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Mỗi trang là một trang đề học viên lật qua. Chèn ảnh minh hoạ (sơ đồ, bảng, ảnh chụp màn
        hình) bằng nút “Tải ảnh” trên thanh công cụ — ảnh nằm ngay trong nội dung, đúng chỗ bạn đặt
        con trỏ. Công thức toán viết trong <code>$…$</code> sẽ hiện thành công thức ở màn học viên.
      </Typography.Text>
    </Space>
  );
}
