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

      {/* KHÔNG `destroyOnHidden`. Bản cũ có, với lý do "giữ đề xuất cũ dễ khiến cắt lặp một đoạn" —
          nhưng thứ chặn cắt lặp là dấu `cutSignatures` trong panel, và chính nó cũng bị xoá cùng
          lúc. Nói cách khác cờ đó vứt đi đúng bản ghi sinh ra để chống cắt lặp, nên sau một lần đổi
          tab là cắt lại được y hệt. Tệ hơn: trang tự hướng dẫn "cắt xong chuyển sang Studio để
          tải/đăng", tức thao tác được khuyến khích nhất cũng là thao tác xoá sạch việc đang làm —
          gồm cả job AI vừa tốn tiền chạy. Giờ state ở lại, và còn được ghi nháp xuống localStorage
          nên tải lại trang cũng không mất (xem clipDraft.ts). */}
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: "create", label: "Tạo clip", children: <CreateClipPanel /> },
          { key: "studio", label: "Studio", children: <ClipStudioPanel /> },
        ]}
      />
    </div>
  );
}
