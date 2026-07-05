import { useNavigate } from "react-router-dom";
import { Alert, Card, Col, Row, Skeleton, Typography } from "antd";
import { useCtvKpi, useCtvScopes, useCtvTodo } from "../api/ctvMe.api";
import { ScopeCard } from "../components/ScopeCard";
import { TodoList } from "../components/TodoList";

export default function WorkspaceHomePage() {
  const { scopes, isLoading: scopesLoading } = useCtvScopes();
  const { data: todos, isLoading: todosLoading, isError: todosError, error } = useCtvTodo();
  const { data: kpi } = useCtvKpi("30d");
  const navigate = useNavigate();

  if (scopesLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  if (scopes.length === 0) {
    return (
      <Alert
        type="warning"
        message="Không có scope nào"
        description="Quyền CTV của bạn đã hết hạn hoặc chưa được gán. Liên hệ admin để gia hạn."
        showIcon
      />
    );
  }

  return (
    <div>
      <Typography.Title level={3}>CTV Workspace</Typography.Title>
      <Row gutter={16}>
        <Col span={16}>
          <Card title="Scope của bạn" style={{ marginBottom: 16 }}>
            {scopes.map((scope) => (
              <ScopeCard
                key={`${scope.scopeType}:${scope.scopeId}`}
                scope={scope}
                onClick={() => {
                  if (scope.scopeType === "GROUP") navigate(`/ctv/groups/${scope.scopeId}`);
                  else navigate("/ctv/resources");
                }}
              />
            ))}
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Việc cần làm" style={{ marginBottom: 16 }}>
            {todosLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : todosError ? <Alert type="error" message={error?.message} /> : <TodoList items={todos ?? []} />}
          </Card>
          <Card title="KPI 30 ngày">
            <Typography.Text>Resources: {kpi?.resourcesProcessed ?? 0}</Typography.Text>
            <br />
            <Typography.Text>Posts: {kpi?.postsModerated ?? 0}</Typography.Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
