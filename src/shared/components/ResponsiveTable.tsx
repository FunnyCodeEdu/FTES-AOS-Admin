import { type ReactNode } from "react";
import { Empty, Pagination, Skeleton, Table, type TablePaginationConfig, type TableProps } from "antd";
import { useIsMobile } from "../hooks/useIsMobile";

export interface ResponsiveTableProps<T> extends TableProps<T> {
  /**
   * Cách vẽ MỘT bản ghi thành thẻ trên điện thoại. Không truyền thì component này y hệt `Table`
   * — nhờ vậy các trang chuyển dần sang được, không phải sửa hết trong một lần.
   */
  renderMobileCard?: (record: T, index: number) => ReactNode;
}

function resolveKey<T>(record: T, index: number, rowKey: TableProps<T>["rowKey"]): string {
  if (typeof rowKey === "function") return String(rowKey(record, index));
  if (typeof rowKey === "string") {
    const value = (record as Record<string, unknown>)[rowKey];
    if (value != null) return String(value);
  }
  return String(index);
}

/**
 * Bảng dữ liệu biết đổi hình: `Table` đầy đủ trên laptop, danh sách thẻ dọc trên điện thoại.
 *
 * <p>Lý do không dùng `scroll={{x}}` cho mọi thứ: cuộn ngang đọc được nhưng thao tác thì không —
 * muốn bấm nút ở cột cuối phải vuốt qua 4 cột, mỗi hàng vuốt lại một lần. Thẻ đưa hành động chính
 * lên trước mặt. Bảng vẫn là dạng đúng trên laptop nên nhánh desktop giữ nguyên `Table` gốc, không
 * bọc thêm gì.
 */
export function ResponsiveTable<T extends object>({
  renderMobileCard,
  ...tableProps
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (!isMobile || !renderMobileCard) {
    return <Table<T> {...tableProps} />;
  }

  const { dataSource, loading, rowKey, pagination, locale } = tableProps;
  const rows = (dataSource ?? []) as readonly T[];
  const pager = pagination === false ? undefined : (pagination as TablePaginationConfig | undefined);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} active paragraph={{ rows: 2 }} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    const emptyText = typeof locale?.emptyText === "function" ? locale.emptyText() : locale?.emptyText;
    return <Empty description={emptyText ?? "Không có dữ liệu"} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((record, index) => (
        <div key={resolveKey(record, index, rowKey)}>{renderMobileCard(record, index)}</div>
      ))}

      {pager && (pager.total ?? 0) > (pager.pageSize ?? 10) && (
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
          <Pagination
            simple
            current={pager.current}
            pageSize={pager.pageSize}
            total={pager.total}
            // `Table` gom mọi thay đổi vào onChange(pagination, filters, sorter); ở đây không có
            // filter/sorter nên truyền đối tượng rỗng để trang gọi xử lý y như khi bấm trên bảng.
            onChange={(page, pageSize) =>
              tableProps.onChange?.(
                { ...pager, current: page, pageSize },
                {},
                [],
                { currentDataSource: [...rows], action: "paginate" }
              )
            }
          />
        </div>
      )}
    </div>
  );
}
