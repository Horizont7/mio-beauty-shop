import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function ReviewsPage() {
  return (
    <AdminResourcePage
      title="Reviews"
      description="Moderate product reviews and customer feedback."
      tableName="reviews"
      select="id,product_id,customer_name,rating,comment,active,created_at"
      orderBy="created_at"
      searchKeys={["customer_name", "comment"]}
      setupHint="Apply the Phase 2 commerce migration to create reviews."
      allowActiveToggle
      fields={[
        { key: "product_id", label: "Product ID", type: "number", required: true },
        { key: "customer_name", label: "Customer name", required: true },
        { key: "rating", label: "Rating", type: "number" },
        { key: "comment", label: "Review text", type: "textarea" },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { key: "product_id", label: "Product" },
        { key: "customer_name", label: "Customer" },
        { key: "rating", label: "Rating" },
        { key: "comment", label: "Text" },
        { key: "active", label: "Active" },
      ]}
    />
  );
}
