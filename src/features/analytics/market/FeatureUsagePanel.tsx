import { useState } from "react";
import { Button, Card, Col, Empty, Input, Row, Select, Space, Statistic, Table, Tag, Typography } from "antd";
import { actionLabel, featureLabel, numberLabel, PRODUCT_FEATURES } from "./labels";
import type { MarketFeatureDetail, MarketFeatureRow } from "./types";

const PRIMARY = ["learning","exam_practice","ai","workplace","courses","community"];
export function FeatureUsagePanel({ groups, details, compact=false, onJourney }: {
  groups: MarketFeatureRow[]; details: MarketFeatureDetail[]; compact?: boolean; onJourney: (feature: string) => void;
}) {
  const [search,setSearch]=useState("");
  const [group,setGroup]=useState("product");
  const rows=details.filter(row=>(group==="all" || (group==="product"?PRODUCT_FEATURES.has(row.feature):row.feature===group)) &&
    `${actionLabel(row.action)} ${featureLabel(row.feature)} ${row.action}`.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")));
  return <Card title="Người dùng đang dùng những tính năng nào?">
    <Space direction="vertical" size="large" style={{width:"100%"}}>
      <Row gutter={[12,12]} style={{width:"100%"}}>
        {PRIMARY.map(key=>{const row=groups.find(g=>g.feature===key);return <Col xs={24} sm={12} xl={8} key={key}>
          <Card size="small" title={featureLabel(key)}>
            {row ? <><Statistic title="Người dùng đăng nhập" value={numberLabel(row.users)} />
              <Typography.Text type="secondary">{numberLabel(row.events)} hoạt động · {numberLabel(row.paid_users)} người dùng sau thanh toán</Typography.Text></>
              : <Typography.Text type="secondary">Chưa có dữ liệu ghi nhận trong kỳ</Typography.Text>}
          </Card></Col>;})}
      </Row>
      <Typography.Paragraph type="secondary" style={{margin:0}}>
        Số liệu dưới đây là thao tác đã được ghi nhận. Từng công cụ AI được tách riêng khi hệ thống lưu loại công cụ;
        lượt bấm nút chỉ là quan sát, không tự suy ra người dùng đã hoàn thành tác vụ. Thiếu dữ liệu không đồng nghĩa chưa ai dùng tính năng.
      </Typography.Paragraph>
      {!compact && <Space wrap>
        <Input.Search aria-label="Tìm tính năng hoặc thao tác" placeholder="Tìm bài học, chấm bài, flashcard, AI…" value={search}
          onChange={e=>setSearch(e.target.value)} allowClear style={{width:320,maxWidth:"100%"}} />
        <Select aria-label="Nhóm tính năng chi tiết" value={group} onChange={setGroup} style={{width:250}} options={[
          {value:"product",label:"Tính năng học tập & sản phẩm"},{value:"all",label:"Tất cả, gồm đăng nhập và thưởng"},
          ...groups.filter(g=>PRODUCT_FEATURES.has(g.feature)).map(g=>({value:g.feature,label:featureLabel(g.feature)})),
        ]} />
      </Space>}
      <Table<MarketFeatureDetail> rowKey={r=>`${r.feature}:${r.action}:${r.source}`} dataSource={compact?rows.slice(0,8):rows}
        pagination={compact?false:{pageSize:15}} size="small" scroll={{x:950}} locale={{emptyText:<Empty description="Chưa có thao tác chi tiết được ghi nhận trong kỳ" />}}
        columns={[
          {title:"Thao tác / công cụ",dataIndex:"action",render:actionLabel},
          {title:"Nhóm tính năng",dataIndex:"feature",render:(value:string)=><Button type="link" style={{padding:0}} onClick={()=>onJourney(value)}>{featureLabel(value)}</Button>},
          {title:"Số lần",dataIndex:"events",render:numberLabel},{title:"Người dùng",dataIndex:"users",render:numberLabel},
          {title:"Người dùng sau thanh toán",dataIndex:"paid_users",render:numberLabel},
          {title:"Số lần sau thanh toán",dataIndex:"paid_events",render:numberLabel},
          {title:"Nguồn",dataIndex:"source",render:(v:string)=><Tag>{v==="server"?"Hệ thống":"Trình duyệt"}</Tag>},
        ]} />
    </Space>
  </Card>;
}
