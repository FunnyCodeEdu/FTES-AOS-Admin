import { useQuery } from "@tanstack/react-query";
import { graphqlRequest } from "../../../shared/api/graphql";

// BE shape (schema.graphqls + AdminPlatformReadController.systemConfigurations):
//   type AdminConfiguration { key: String!, value: String, sensitive: Boolean! }
//   query systemConfigurations: [AdminConfiguration!]!   ← FLAT list, không grouped.
// `value` là chuỗi thô (thường là JSON đã stringify); KHÔNG có group/type/description/entries.
const SYSTEM_CONFIGURATIONS_QUERY = `query SystemConfigurations {
  systemConfigurations {
    key
    value
    sensitive
  }
}`;

export interface ConfigItem {
  key: string;
  value: string | null;
  sensitive: boolean;
}

/** Nhóm phẳng theo prefix (segment đầu của key, vd "platform.ai.quota" → "platform") cho UI Tabs. */
export interface ConfigGroupView {
  group: string;
  items: ConfigItem[];
}

export function groupByPrefix(items: ConfigItem[]): ConfigGroupView[] {
  const map = new Map<string, ConfigItem[]>();
  for (const item of items) {
    const group = item.key.includes(".") ? item.key.split(".")[0] : "khác";
    const bucket = map.get(group);
    if (bucket) {
      bucket.push(item);
    } else {
      map.set(group, [item]);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, groupItems]) => ({ group, items: groupItems }));
}

const queryKeys = {
  config: ["ops", "config"] as const,
};

export function useConfig() {
  return useQuery<ConfigItem[], Error>({
    queryKey: queryKeys.config,
    queryFn: () =>
      graphqlRequest<{ systemConfigurations: ConfigItem[] }>(SYSTEM_CONFIGURATIONS_QUERY).then(
        (r) => r.systemConfigurations
      ),
  });
}

// TODO(be): systemConfigurations hiện READ-ONLY. Không có GraphQL Mutation lẫn REST
// /config/{key} trên FTES-AOS-Backend để ghi cấu hình → bỏ useUpdateConfig/useConfigHistory
// (trước đây trỏ endpoint không tồn tại). Nối lại khi BE ship mutation cập nhật config.
