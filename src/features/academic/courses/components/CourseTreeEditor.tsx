import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Input, Modal, Row, Space, Tree, Typography, message } from "antd";
import type { TreeDataNode, TreeProps } from "antd";
import {
  DeleteOutlined,
  EyeOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  PlayCircleOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { Can } from "../../../../shared/permissions";
import type { CourseDetail, CourseTreeNode } from "../../types";
import { useSaveCourseTree } from "../api/courses.api";
import { useCourseTreeDraftStore } from "../store/courseTreeDraftStore";
import { LessonContentDrawer } from "./LessonContentDrawer";

interface CourseTreeEditorProps {
  course: CourseDetail;
  readOnly?: boolean;
}

function toTreeData(nodes: CourseTreeNode[]): TreeDataNode[] {
  return nodes.map((n) => ({
    key: n.key,
    title: n.title,
    icon:
      n.type === "section" ? <FolderAddOutlined /> : n.type === "lesson" ? <PlayCircleOutlined /> : <FileAddOutlined />,
    children: n.children ? toTreeData(n.children) : undefined,
  }));
}

function findNodeByKey(nodes: CourseTreeNode[], key: string): CourseTreeNode | null {
  for (const n of nodes) {
    if (n.key === key) return n;
    if (n.children) {
      const found = findNodeByKey(n.children, key);
      if (found) return found;
    }
  }
  return null;
}

function countDescendants(nodes: CourseTreeNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count++;
    if (n.children) count += countDescendants(n.children);
  }
  return count;
}

export function CourseTreeEditor({ course, readOnly }: CourseTreeEditorProps) {
  const init = useCourseTreeDraftStore((s) => s.init);
  const tree = useCourseTreeDraftStore((s) => s.tree);
  const selectedKey = useCourseTreeDraftStore((s) => s.selectedKey);
  const dirty = useCourseTreeDraftStore((s) => s.dirty);
  const selectNode = useCourseTreeDraftStore((s) => s.selectNode);
  const updateNode = useCourseTreeDraftStore((s) => s.updateNode);
  const addNode = useCourseTreeDraftStore((s) => s.addNode);
  const removeNode = useCourseTreeDraftStore((s) => s.removeNode);
  const moveNode = useCourseTreeDraftStore((s) => s.moveNode);
  const saveApi = useSaveCourseTree(course.id);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [drawerLessonId, setDrawerLessonId] = useState<string | null>(null);
  const [drawerLessonTitle, setDrawerLessonTitle] = useState<string>("");

  useEffect(() => {
    init(course.tree ?? []);
  }, [course.tree, init]);

  const selectedNode = useMemo(() => {
    if (!selectedKey) return null;
    const find = (nodes: CourseTreeNode[]): CourseTreeNode | null => {
      for (const n of nodes) {
        if (n.key === selectedKey) return n;
        if (n.children) {
          const found = find(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    return find(tree);
  }, [selectedKey, tree]);

  const handleDrop: TreeProps["onDrop"] = (info) => {
    const dragKey = String(info.dragNode.key);
    const dropKey = String(info.node.key);
    const dropPos = info.node.pos.split("-");
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);
    moveNode(dragKey, dropKey, dropPosition);
  };

  const handleDelete = (key: string) => {
    const find = (nodes: CourseTreeNode[]): { node: CourseTreeNode; count: number } | null => {
      for (const n of nodes) {
        if (n.key === key) return { node: n, count: countDescendants([n]) };
        if (n.children) {
          const found = find(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const found = find(tree);
    if (!found) return;
    Modal.confirm({
      title: "Xoá node",
      content: (
        <>
          Xoá <strong>{found.node.title}</strong> sẽ xoá thêm <strong>{found.count - 1}</strong> node con.
          Nội dung chưa lưu sẽ bị mất.
        </>
      ),
      okText: "Xoá",
      okType: "danger",
      cancelText: "Huỷ",
      onOk: () => removeNode(key),
    });
  };

  const handleSave = () => {
    setErrorMsg(null);
    saveApi.mutate(
      { draft: tree, server: course.tree ?? [] },
      {
        onSuccess: () => {
          message.success("Đã lưu nội dung khoá học");
        },
        onError: (err: Error) => {
          setErrorMsg(err.message);
          message.error(err.message || "Lưu thất bại");
        },
      }
    );
  };

  return (
    <div>
      {errorMsg && (
        <Alert type="error" message="Lỗi lưu cây" description={errorMsg} style={{ marginBottom: 16 }} closable />
      )}
      <Row gutter={16}>
        <Col span={14}>
          <Can permissions={["course.manage"]} fallback={null}>
            {!readOnly && (
              <Space style={{ marginBottom: 16 }}>
                <Button icon={<FolderAddOutlined />} onClick={() => addNode(null, "section")}>
                  Thêm chương
                </Button>
                <Button
                  icon={<PlayCircleOutlined />}
                  disabled={!selectedNode || selectedNode.type === "assignment"}
                  onClick={() => addNode(selectedKey, "lesson")}
                >
                  Thêm bài học
                </Button>
                <Button
                  icon={<FileAddOutlined />}
                  disabled={!selectedNode || selectedNode.type === "assignment"}
                  onClick={() => addNode(selectedKey, "assignment")}
                >
                  Thêm bài tập
                </Button>
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  disabled={!selectedKey}
                  onClick={() => selectedKey && handleDelete(selectedKey)}
                >
                  Xoá
                </Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saveApi.isPending}>
                  Lưu nội dung
                </Button>
              </Space>
            )}
          </Can>
          {dirty && (
            <Typography.Text type="warning" style={{ marginLeft: 16 }}>
              Chưa lưu
            </Typography.Text>
          )}
          <Tree
            treeData={toTreeData(tree)}
            draggable={!readOnly}
            onSelect={(keys) => selectNode(keys[0] ? String(keys[0]) : null)}
            selectedKeys={selectedKey ? [selectedKey] : []}
            onDrop={handleDrop}
            showIcon
            defaultExpandAll
            titleRender={(nodeData) => {
              const node = findNodeByKey(tree, String(nodeData.key));
              if (!node) {
                const fallback =
                  typeof nodeData.title === "function"
                    ? nodeData.title(nodeData)
                    : nodeData.title;
                return <span>{fallback}</span>;
              }
              const isLesson = node.type === "lesson";
              return (
                <div style={{ display: "inline-block" }}>
                  <div>{node.title}</div>
                  {node.description && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {node.description}
                    </Typography.Text>
                  )}
                  {isLesson && node.id && (
                    <div>
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        style={{ marginTop: 4 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDrawerLessonId(node.id!);
                          setDrawerLessonTitle(node.title);
                        }}
                      >
                        Xem nội dung
                      </Button>
                    </div>
                  )}
                </div>
              );
            }}
          />
          <LessonContentDrawer
            lessonId={drawerLessonId}
            lessonTitle={drawerLessonTitle}
            open={drawerLessonId !== null}
            onClose={() => setDrawerLessonId(null)}
          />
        </Col>
        <Col span={10}>
          <Card title="Thông tin node">
            {selectedNode ? (
              <>
                <Typography.Text type="secondary">Loại: {selectedNode.type}</Typography.Text>
                <Input
                  value={selectedNode.title}
                  onChange={(e) => updateNode(selectedNode.key, { title: e.target.value })}
                  disabled={readOnly}
                  style={{ marginTop: 8 }}
                />
                {selectedNode.error && (
                  <Alert type="error" message={selectedNode.error} style={{ marginTop: 8 }} />
                )}
              </>
            ) : (
              <Typography.Text type="secondary">Chọn một node để chỉnh sửa</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
