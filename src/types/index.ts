// 产地/地区
export interface Region {
  code: string           // 产地代码，例如 "JPN"、"EUR"
}

// 年份条目（color_years 表中的一行）
export interface YearEntry {
  year: number          // 起始年份；若 year_end 为空则为单一年份
  year_end?: number     // 结束年份；undefined/null 表示单年（不展开）
}

// 车辆品牌
export interface CarMake {
  id: string
  name: string          // 例如 "Toyota"、"BMW"
  region: string        // 产地代码，例如 "JPN"、"EUR"
}

// 颜色变体（同一颜色代码在不同批次/工厂可能有微小差异）
export interface ColorVariant {
  id: string
  name: string           // 例如 "Standard"、"Pearl Effect"
  year_range: string     // 例如 "2018-2022"
}

// 颜色类型（一个颜色可有多个类型）
export type ColorType = "solid" | "metallic" | "pearl" | "matte" | "candy" | "special";

// 颜色（每个车厂的 OEM 颜色）
export interface Color {
  id: string
  make_id: string
  color_code: string      // 官方颜色代码，例如 "040" "NH731P"
  color_name: string      // 中英文颜色名，例如 "Super White / 超白"
  color_type: ColorType[]
  hex_preview: string     // 颜色预览 hex，例如 "#F5F5F0"
  car_model?: string      // 车型，例如 "Camry" "Corolla"
  variants: ColorVariant[]
  years?: YearEntry[]     // 适用年份列表（含区间）
}

// 配方类型
export type FormulaType = "Single Stage" | "Two Stages" | "Three Stages";

// Pearl Paint 分组
export type ComponentGroup = "Pearl Paint" | "Ground Paint";

// 调漆配方中的单个色母用量
export interface FormulaComponent {
  uid?: string            // 唯一标识，用于 React key（客户端生成）
  toner_code: string      // 色母编号，例如 "HW-2001"
  toner_name: string      // 色母名称，例如 "Titanium White"
  percentage: number      // 在总配方中的百分比，例如 45.5
  grams_per_100g: number  // 每 100g 总漆的用量克数
  density?: number        // 密度
  rgb_r?: number          // RGB Red
  rgb_g?: number          // RGB Green
  rgb_b?: number          // RGB Blue
  component_group?: ComponentGroup  // 仅 Pearl Paint 使用
}

// 完整调漆配方
export interface Formula {
  id: string
  color_id: string
  variant_id: string
  version: string          // 配方版本号，例如 "v1.2"
  paint_system: "1K" | "2K"  // 1K 还是 2K 体系
  formula_type: FormulaType
  components: FormulaComponent[]
  notes: string            // 施工备注，例如 "建议喷涂2遍底色"
  updated_at: string
  year?: number            // 适用年份（可选，用于反规范化搜索）
  color_name?: string      // 颜色名称（可选，用于快速搜索）
}

// 搜索参数
export interface SearchParams {
  region?: string       // 产地筛选
  make_id?: string
  color_code?: string
  color_name?: string
  color_type?: string
  year?: string
}

// 搜索结果
export interface SearchResult {
  color: Color
  formulas: Formula[]
}

// 表格行：每个配方一行（展平 SearchResult）
export interface FormulaTableRow {
  color: Color
  formula: Formula
  variant: ColorVariant | undefined  // 通过 formula.variant_id 在 color.variants 中查找
  makeName: string                    // 通过 brands 解析 make_id -> name
  yearEntry?: YearEntry             // 展平后的年份条目（可能是单年或区间）
}

// 系统设置
export interface AppSettings {
  finishes: string[]
  types: string[]
  yearMin: number
  yearMax: number
}

// TDS 产品族分类（汽车修补漆产品族）
export interface GuideCategory {
  id: string                    // 'primer' / 'basecoat' / 'clearcoat' / ...
  name: string                  // 英文
  nameZh: string                // 中文
  description?: string
  descriptionZh?: string
  icon?: string                 // lucide 图标名
  sortOrder: number
}

// 色母分类
export type TonerCategory = "2K_BASECOAT" | "1K_BASECOAT" | "1K_SILVER_BASECOAT" | "1K_PEARL_BASECOAT" | "SUPPLEMENTARY";

// 色母
export interface Toner {
  code: string            // 色母编号，例如 "2K-2001"
  tradeName: string       // 英文商品名，例如 "White"
  nameZh: string          // 中文品名，例如 "纯白"
  category: TonerCategory
  hex: string             // 颜色预览 hex，例如 "#FFFFFF"
  rgb_r?: number          // RGB Red 分量 (0-255)
  rgb_g?: number          // RGB Green 分量 (0-255)
  rgb_b?: number          // RGB Blue 分量 (0-255)
}

// TDS 文档主表
export type DocType = 'tds' | 'msds' | 'sds' | 'manual'

export interface Guide {
  id: string
  categoryId: string
  productSku?: string           // 产品 SKU，如 'P-2K-001'
  version: string               // 版本号
  docType: DocType              // 文档类型
  title: string                 // 英文标题
  titleZh: string               // 中文标题
  summary?: string              // 英文摘要
  summaryZh?: string            // 中文摘要
  coverImage?: string           // Supabase Storage URL
  content: string               // 英文 Markdown
  contentZh: string             // 中文 Markdown
  sortOrder: number
  isPublished: boolean          // 草稿/发布
  updatedAt: string
}
