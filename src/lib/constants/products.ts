/** Column map shared by the Excel import and export (header ↔ field). */
export const PRODUCT_COLUMNS = [
  { key: "name_en", header: "Product Name (EN)" },
  { key: "hs_code", header: "HS Code" },
  { key: "unit", header: "Unit" },
  { key: "unit_price_usd", header: "Unit Price (USD)" },
  { key: "net_weight", header: "Net Weight (kg)" },
  { key: "gross_weight", header: "Gross Weight (kg)" },
  { key: "dimensions", header: "Dimensions" },
  { key: "origin_country", header: "Origin Country" },
] as const;

export type ProductColumnKey = (typeof PRODUCT_COLUMNS)[number]["key"];

export const PRODUCT_EXPORT_FILENAME = "products.xlsx";
export const PRODUCT_TEMPLATE_FILENAME = "products_template.xlsx";
