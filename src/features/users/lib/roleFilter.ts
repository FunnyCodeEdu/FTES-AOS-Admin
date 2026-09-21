interface RoleFilterSource {
  code: string;
  name: string;
}

export interface RoleFilterOption {
  label: string;
  value: string;
}

export function buildUserRoleFilterOptions(roles: RoleFilterSource[]): RoleFilterOption[] {
  const optionsByCode = new Map<string, RoleFilterOption>();

  for (const role of roles) {
    const code = role.code.trim();
    if (!code || optionsByCode.has(code)) continue;

    const name = role.name.trim();
    optionsByCode.set(code, {
      value: code,
      label: name && name !== code ? `${name} (${code})` : code,
    });
  }

  return Array.from(optionsByCode.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "vi")
  );
}
