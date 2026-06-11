import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function PromotionsPage() {
  return (
    <AdminResourcePage
      title="Promotions"
      description="Create product or category discounts with date limits."
      tableName="promotions"
      select="id,title,discount_type,discount_value,product_id,category_id,start_date,end_date,active,created_at"
      orderBy="created_at"
      searchKeys={["title", "discount_type"]}
      setupHint="Create promotions table from docs/admin-supabase-setup.sql. Product/category attachment uses product_id/category_id."
      fields={[
        { key: "title", label: "Title", required: true },
        {
          key: "discount_type",
          label: "Discount type",
          type: "select",
          options: [
            { label: "Percentage", value: "percentage" },
            { label: "Fixed", value: "fixed" },
          ],
        },
        { key: "discount_value", label: "Discount value", type: "number" },
        { key: "product_id", label: "Product ID", type: "number" },
        { key: "category_id", label: "Category ID", type: "number" },
        { key: "start_date", label: "Start date", type: "date" },
        { key: "end_date", label: "End date", type: "date" },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { key: "title", label: "Title" },
        { key: "discount_type", label: "Type" },
        { key: "discount_value", label: "Value" },
        { key: "product_id", label: "Product" },
        { key: "category_id", label: "Category" },
        { key: "active", label: "Status" },
      ]}
    />
  );
}
