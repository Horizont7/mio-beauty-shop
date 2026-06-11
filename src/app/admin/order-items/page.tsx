import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function OrderItemsPage() {
  return (
    <AdminResourcePage
      title="Order items"
      description="View and manage products attached to customer orders."
      tableName="order_items"
      select="id,order_id,product_id,sku,product_name,quantity,unit_price,total_price,created_at"
      orderBy="created_at"
      searchKeys={["order_id", "sku", "product_name"]}
      setupHint="Create order_items table from docs/admin-supabase-setup.sql."
      allowActiveToggle={false}
      fields={[
        { key: "order_id", label: "Order ID", required: true },
        { key: "product_id", label: "Product ID", type: "number" },
        { key: "sku", label: "SKU" },
        { key: "product_name", label: "Product name" },
        { key: "quantity", label: "Quantity", type: "number" },
        { key: "unit_price", label: "Unit price", type: "number" },
        { key: "total_price", label: "Total price", type: "number" },
      ]}
      columns={[
        { key: "order_id", label: "Order" },
        { key: "product_name", label: "Product" },
        { key: "sku", label: "SKU" },
        { key: "quantity", label: "Qty" },
        { key: "unit_price", label: "Unit price" },
        { key: "total_price", label: "Total" },
      ]}
    />
  );
}
