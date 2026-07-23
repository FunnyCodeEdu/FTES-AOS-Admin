import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";

import { Can } from "../../../shared/permissions";
import { useDeleteBank, useQuestionBanks } from "../api/questionBank.api";
import { formatDate } from "../format";
import type { QuestionBankView } from "../types";
import { CreateBankModal } from "../components/CreateBankModal";

export default function QuestionBankListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";

  const { data, isLoading, isError, error, refetch, isFetching } = useQuestionBanks();
  const deleteBank = useDeleteBank();

  const [createOpen, setCreateOpen] = useState(false);

  const rows = useMemo(() => data ?? [], [data]);

  const filteredRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(needle) ||
        (r.description ?? "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  const setQ = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next);
  };

  const openDetail = (bank: QuestionBankView) => navigate(`/question-banks/${bank.id}`);

  const confirmDelete = (bank: QuestionBankView) => {
    Modal.confirm({
      title: "Xoá kho câu hỏi?",
      content: (
        <>
          Kho <strong>{bank.title}</strong> cùng toàn bộ ảnh và câu hỏi đã giải sẽ bị xoá vĩnh
          viễn. Thao tác không thể hoàn tác.
        </>
      ),
      okText: "Xoá kho",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          deleteBank.mutate(
            { bankId: bank.id },
            {
              onSuccess: () => {
                message.success("Đã xoá kho câu hỏi");
                resolve();
              },
              onError: () => reject(),
            }
          );
        }),
    });
  };

  const columns: ColumnsType<QuestionBankView> = [
    {
      title: "STT",
      key: "index",
      width: 60,
      render: (_v, _r, index) => index + 1,
    },
    {
      title: "Tên kho",
      dataIndex: "title",
      key: "title",
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (title: string) => <strong>{title}</strong>,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (v?: string) => v || "—",
    },
    {
      title: "Số ảnh",
      dataIndex: "itemCount",
      key: "itemCount",
      align: "right",
      width: 100,
      sorter: (a, b) => a.itemCount - b.itemCount,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status?: string) => (status ? <Tag>{status}</Tag> : "—"),
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 130,
      render: (v: string) => formatDate(v),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      render: (_v, record) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            Xem
          </Button>
          <Can permissions={["question.bank.manage"]}>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete(record)}
            />
          </Can>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Kho câu hỏi</Typography.Title>

      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Space wrap style={{ justifyContent: "space-between", width: "100%" }}>
            <Input
              allowClear
              placeholder="Tìm theo tên hoặc mô tả kho"
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
                Làm mới
              </Button>
              <Can permissions={["question.bank.manage"]}>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                  Tạo kho câu hỏi
                </Button>
              </Can>
            </Space>
          </Space>

          {isError && (
            <Alert
              type="error"
              message="Không thể tải danh sách kho câu hỏi"
              description={error?.message}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Thử lại
                </Button>
              }
            />
          )}

          {isLoading && !data ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : filteredRows.length === 0 ? (
            <Empty description={q ? "Không có kho phù hợp" : "Chưa có kho câu hỏi nào"}>
              {q ? (
                <Button onClick={() => setQ("")}>Xoá tìm kiếm</Button>
              ) : (
                <Can permissions={["question.bank.manage"]}>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                    Tạo kho câu hỏi
                  </Button>
                </Can>
              )}
            </Empty>
          ) : (
            <Table
              rowKey="id"
              columns={columns}
              dataSource={filteredRows}
              loading={isFetching}
              onRow={(record) => ({ onClick: () => openDetail(record) })}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} kho`,
              }}
            />
          )}
        </Space>
      </Card>

      <CreateBankModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(bank) => navigate(`/question-banks/${bank.id}`)}
      />
    </div>
  );
}
