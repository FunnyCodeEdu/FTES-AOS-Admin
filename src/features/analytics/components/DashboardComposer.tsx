import { useMemo } from "react";
import { Card, Col, Empty, Row, Typography } from "antd";
import { useMe } from "../../../features/auth/api";
import { useAnalyticsDateRange } from "./DateRangePicker";
import { OverviewWidget } from "./OverviewWidget";
import { DomainWidget } from "./DomainWidget";
import { ModerationWidget } from "./ModerationWidget";
import { ContributionWidget } from "./ContributionWidget";
import { DOMAIN_NAV_ITEMS, type AnalyticsDomain } from "../shared/types";

const DOMAIN_ORDER: AnalyticsDomain[] = ["learning", "subject", "community", "ai", "gamification", "business"];

export function DashboardComposer() {
  const { data: me } = useMe();
  const { range } = useAnalyticsDateRange();
  const permissions = me?.permissions ?? [];
  const permSet = useMemo(() => new Set(permissions), [permissions]);

  const hasOverview = permSet.has("analytics.view.overview");
  const permittedDomains = useMemo(
    () => DOMAIN_NAV_ITEMS.filter((d) => permSet.has(d.permission)).sort(
      (a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain)
    ),
    [permSet]
  );
  const hasModeration = permSet.has("analytics.view.moderation");
  const hasContribution = permSet.has("analytics.view.contribution");

  const hasAnyAnalytics = hasOverview || permittedDomains.length > 0 || hasModeration || hasContribution;

  return (
    <div>
      <Typography.Title level={3}>Tổng quan</Typography.Title>

      {!hasAnyAnalytics && (
        <Card>
          <Empty description="Chào mừng bạn đến với FTES AOS Admin" />
        </Card>
      )}

      {hasOverview && (
        <div style={{ marginBottom: 24 }}>
          <OverviewWidget range={range} />
        </div>
      )}

      {permittedDomains.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {permittedDomains.map((item) => (
            <Col xs={24} sm={12} lg={8} key={item.domain}>
              <DomainWidget domain={item.domain} label={item.label} range={range} />
            </Col>
          ))}
        </Row>
      )}

      {(hasModeration || hasContribution) && (
        <Row gutter={[16, 16]}>
          {hasModeration && (
            <Col xs={24} sm={12} lg={8}>
              <ModerationWidget />
            </Col>
          )}
          {hasContribution && (
            <Col xs={24} sm={12} lg={8}>
              <ContributionWidget range={range} />
            </Col>
          )}
        </Row>
      )}
    </div>
  );
}
