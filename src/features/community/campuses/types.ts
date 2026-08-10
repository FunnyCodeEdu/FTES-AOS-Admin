// Campus = danh mục "cơ sở" cộng đồng người dùng gắn khi đăng bài. Shape khớp CampusView của BE
// (GET /api/v1/admin/community/campuses). nameEn/region là string | null theo envelope.
export interface Campus {
  id: string;
  code: string;
  name: string;
  nameEn: string | null;
  region: string | null;
  active: boolean;
  sortOrder: number;
}

export interface CampusFormValues {
  code?: string;
  name?: string;
  nameEn?: string;
  region?: string;
  active?: boolean;
  sortOrder?: number;
}
