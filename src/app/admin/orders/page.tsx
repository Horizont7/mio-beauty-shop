import AdminResourcePage from "@/components/admin/AdminResourcePage";

const statusOptions = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
].map((status) => ({ label: status, value: status }));

const paymentStatusOptions = ["pending", "paid", "cancelled"].map((status) => ({
  label: status,
  value: status,
}));

export default function OrdersPage() {
  return (
    <AdminResourcePage
      title="Orders"
      description="View orders, update fulfillment status and manage checkout records."
      tableName="orders"
      select="id,order_number,customer_name,customer_phone,customer_city,customer_address,customer_comment,payment_method,payment_status,order_status,subtotal,delivery_price,total,created_at"
      orderBy="created_at"
      searchKeys={["order_number", "customer_name", "customer_phone"]}
      setupHint="Apply the Phase 2 commerce migration to create orders and order_items."
      allowActiveToggle={false}
      fields={[
        { key: "customer_name", label: "Customer name", required: true },
        { key: "customer_phone", label: "Phone", required: true },
        { key: "customer_city", label: "City" },
        { key: "customer_address", label: "Address", type: "textarea" },
        { key: "customer_comment", label: "Comment", type: "textarea" },
        { key: "payment_status", label: "Payment status", type: "select", options: paymentStatusOptions },
        { key: "order_status", label: "Order status", type: "select", options: statusOptions },
      ]}
      columns={[
        { key: "order_number", label: "Order Number" },
        { key: "customer_name", label: "Customer" },
        { key: "customer_phone", label: "Phone" },
        { key: "total", label: "Total" },
        { key: "payment_status", label: "Payment Status" },
        { key: "order_status", label: "Order Status" },
        { key: "created_at", label: "Created" },
      ]}
    />
  );
}
