import AdminResourcePage from "@/components/admin/AdminResourcePage";

const statusOptions = [
  "new",
  "accepted",
  "packing",
  "delivering",
  "completed",
  "cancelled",
].map((status) => ({ label: status, value: status }));

export default function OrdersPage() {
  return (
    <AdminResourcePage
      title="Orders"
      description="View orders, update fulfillment status and manage checkout records."
      tableName="orders"
      select="id,customer_name,phone,address,total_price,status,payment_method,delivery_method,created_at"
      orderBy="created_at"
      searchKeys={["customer_name", "phone", "address", "status"]}
      setupHint="Create orders and order_items tables from docs/admin-supabase-setup.sql. If order_items exists, connect an order details drawer in the next pass."
      allowActiveToggle={false}
      fields={[
        { key: "customer_name", label: "Customer name", required: true },
        { key: "phone", label: "Phone", required: true },
        { key: "address", label: "Address", type: "textarea" },
        { key: "total_price", label: "Total price", type: "number" },
        { key: "status", label: "Status", type: "select", options: statusOptions },
        { key: "payment_method", label: "Payment method" },
        { key: "delivery_method", label: "Delivery method" },
      ]}
      columns={[
        { key: "id", label: "ID" },
        { key: "customer_name", label: "Customer" },
        { key: "phone", label: "Phone" },
        { key: "total_price", label: "Total" },
        { key: "status", label: "Status" },
        { key: "payment_method", label: "Payment" },
        { key: "delivery_method", label: "Delivery" },
        { key: "created_at", label: "Created" },
      ]}
    />
  );
}
