import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useMe } from "../../auth/api";
import { useTransitionWorkflowItem, useWorkflowItems } from "../api/moderation.api";
import type { WorkflowItem, WorkflowStage } from "../../community/shared/types";

const STAGES: WorkflowStage[] = ["draft", "ai_review", "mod_review", "approved", "published", "archived"];

const STAGE_LABELS: Record<WorkflowStage, string> = {
  draft: "Draft",
  ai_review: "AI Review",
  mod_review: "Mod Review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

function stagePermission(stage: WorkflowStage): string {
  return stage === "published" ? "workflow.publish" : "workflow.review";
}

function isValidTransition(from: WorkflowStage, to: WorkflowStage): boolean {
  const idxFrom = STAGES.indexOf(from);
  const idxTo = STAGES.indexOf(to);
  if (idxTo === idxFrom - 1 && (from === "ai_review" || from === "mod_review")) return true; // reject back to previous
  if (idxTo === idxFrom + 1) return true;
  return false;
}

export default function WorkflowBoardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [draggingItem, setDraggingItem] = useState<WorkflowItem | null>(null);
  const [dragOverStage, setDragOverStage] = useState<WorkflowStage | null>(null);
  const { data, isLoading, isError, error, refetch } = useWorkflowItems({
    search: searchParams.get("search") ?? undefined,
  });
  const transition = useTransitionWorkflowItem();
  const { data: me } = useMe();
  const perms = new Set(me?.permissions ?? []);

  function updateParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params);
  }

  function canDrop(targetStage: WorkflowStage, item: WorkflowItem): boolean {
    if (!perms.has(stagePermission(targetStage))) return false;
    return isValidTransition(item.stage, targetStage);
  }

  function handleDrop(item: WorkflowItem, targetStage: WorkflowStage) {
    setDragOverStage(null);
    if (!canDrop(targetStage, item)) {
      message.error("Transition không hợp lệ hoặc thiếu quyền");
      return;
    }
    transition.mutate(
      { id: item.id, toStage: targetStage },
      {
        onError: (err) => message.error(err.message),
      }
    );
  }

  if (isLoading) return <Spin size="large" style={{ display: "block", marginTop: 40 }} />;

  if (isError) {
    return (
      <Alert
        type="error"
        message="Không thể tải workflow board"
        description={error?.message}
        action={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Thử lại</Button>}
      />
    );
  }

  const items = data?.items ?? [];

  return (
    <div>
      <Typography.Title level={3}>Content Workflow</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Tìm nội dung"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => updateParams({ search: search || undefined })}
            style={{ width: 240 }}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Làm mới</Button>
        </Space>
      </Card>

      <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
        {STAGES.map((stage) => {
          const stageItems = items.filter((i) => i.stage === stage);
          const dropAllowed = draggingItem ? canDrop(stage, draggingItem) : false;
          const droppable = dragOverStage === stage && dropAllowed;
          return (
            <div
              key={stage}
              style={{
                minWidth: 240,
                background: droppable ? "#e6f7ff" : draggingItem ? (dropAllowed ? "#f6ffed" : "#fff1f0") : "#f5f5f5",
                borderRadius: 8,
                padding: 12,
                minHeight: 300,
                border: draggingItem ? (dropAllowed ? "1px solid #b7eb8f" : "1px solid #ffccc7") : undefined,
                transition: "background 0.15s ease",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggingItem && canDrop(stage, draggingItem)) {
                  setDragOverStage(stage);
                } else {
                  setDragOverStage(null);
                }
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                const item = items.find((i) => i.id === id);
                if (item) handleDrop(item, stage);
              }}
            >
              <Typography.Title level={5} style={{ marginTop: 0 }}>
                {STAGE_LABELS[stage]} <Tag>{stageItems.length}</Tag>
              </Typography.Title>
              {stageItems.map((item) => (
                <Card
                  key={item.id}
                  size="small"
                  draggable
                  onDragStart={(e) => {
                    setDraggingItem(item);
                    e.dataTransfer.setData("text/plain", item.id);
                  }}
                  onDragEnd={() => {
                    setDraggingItem(null);
                    setDragOverStage(null);
                  }}
                  style={{
                    marginBottom: 8,
                    cursor: "move",
                    opacity: draggingItem?.id === item.id ? 0.5 : 1,
                    borderColor: dragOverStage && draggingItem?.id === item.id ? "#1890ff" : undefined,
                  }}
                >
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {item.contentType} — {item.authorName}
                    </Typography.Text>
                  </div>
                </Card>
              ))}
              {stageItems.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Trống" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
