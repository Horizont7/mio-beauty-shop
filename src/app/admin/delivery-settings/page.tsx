import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function DeliverySettingsPage() {
  return (
    <AdminResourcePage
      title="Delivery settings"
      description="Configure delivery pricing, regions and public delivery text."
      tableName="delivery_settings"
      select="id,region,city,delivery_price,free_delivery_min,delivery_text,active,created_at"
      orderBy="created_at"
      searchKeys={["region", "city", "delivery_text"]}
      setupHint="Create delivery_settings table from docs/admin-supabase-setup.sql."
      fields={[
        { key: "region", label: "Region" },
        { key: "city", label: "City" },
        { key: "delivery_price", label: "Delivery price", type: "number" },
        { key: "free_delivery_min", label: "Free delivery minimum", type: "number" },
        { key: "delivery_text", label: "Delivery text", type: "textarea" },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { key: "region", label: "Region" },
        { key: "city", label: "City" },
        { key: "delivery_price", label: "Price" },
        { key: "free_delivery_min", label: "Free from" },
        { key: "active", label: "Status" },
      ]}
    />
  );
}
