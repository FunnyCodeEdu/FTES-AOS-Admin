import { useState } from "react";
import { Tabs } from "antd";
import { PageHeader } from "../../../../shared/components/PageHeader";
import { CreateClipPanel } from "../components/CreateClipPanel";
import { ClipStudioPanel } from "../components/ClipStudioPanel";

/**
 * Studio video ngắn (`/content/shortvideo`).
 *
 * <p>Hai phần của hợp đồng nằm ở hai tab chứ không xếp chồng trên một trang dài: trên điện thoại
 * "Tạo clip" đã chiếm trọn một màn (chọn khoá → chọn bài → danh sách đề xuất, mỗi đề xuất một
 * thẻ), nên bảng Studio ở dưới sẽ không ai cuộn tới. Tab cũng giữ được thói quen dùng thật: cắt
 * xong là chuyển sang Studio để tải/đăng.
 */
export default function ShortVideoStudioPage() {
  const [tab, setTab] = useState("create");

  return (
    <div>
      <PageHeader
        title="Studio video ngắn"
        description="Cắt điểm nhấn từ video bài giảng thành clip ngắn, tải về hoặc đăng lên mục Tin của cộng đồng."
      />

      <Tabs
        activeKey={tab}
        onChange={setTab}
        // Rời tab là bỏ hẳn state của nó. Cố ý — giữ lại danh sách đề xuất cũ sau khi đã cắt xong
        // dễ khiến người dùng cắt lặp cùng một đoạn.
        destroyOnHidden
        items={[
          { key: "create", label: "Tạo clip", children: <CreateClipPanel /> },
          { key: "studio", label: "Studio", children: <ClipStudioPanel /> },
        ]}
      />
    </div>
  );
}
