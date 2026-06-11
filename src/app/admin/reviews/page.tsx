import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function ReviewsPage() {
  return (
    <AdminResourcePage
      title="Reviews"
      description="Moderate product reviews and customer feedback."
      tableName="reviews"
      select="id,product_id,customer_name,rating,text,status,created_at"
      orderBy="created_at"
      searchKeys={["customer_name", "text", "status"]}
      setupHint="Create reviews table from docs/admin-supabase-setup.sql. Product names can be joined once review ingestion is connected."
      allowActiveToggle={false}
      fields={[
        { key: "product_id", label: "Product ID", type: "number", required: true },
        { key: "customer_name", label: "Customer name", required: true },
        { key: "rating", label: "Rating", type: "number" },
        { key: "text", label: "Review text", type: "textarea" },
        {
          key: "status",
          label: "Status",
          type: "select",
          options: [
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" },
          ],
        },
      ]}
      columns={[
        { key: "product_id", label: "Product" },
        { key: "customer_name", label: "Customer" },
        { key: "rating", label: "Rating" },
        { key: "text", label: "Text" },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
