import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function CustomersPage() {
  return (
    <AdminResourcePage
      title="Customers"
      description="Manage customer profiles and contact information."
      tableName="customers"
      select="id,name,phone,email,address,orders_count,total_spent,created_at"
      orderBy="created_at"
      searchKeys={["name", "phone", "email", "address"]}
      setupHint="Create the customers table from docs/admin-supabase-setup.sql. Order history can be joined from orders by phone/customer_id after checkout is connected."
      allowActiveToggle={false}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "address", label: "Address", type: "textarea" },
        { key: "orders_count", label: "Orders count", type: "number" },
        { key: "total_spent", label: "Total spent", type: "number" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "orders_count", label: "Orders" },
        { key: "total_spent", label: "Spent" },
        { key: "created_at", label: "Created" },
      ]}
    />
  );
}
