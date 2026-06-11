import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function BrandsPage() {
  return (
    <AdminResourcePage
      title="Brands"
      description="Manage MIO Beauty brand groups used for filtering and presentation."
      tableName="brands"
      select="id,name,slug,image,active,created_at"
      orderBy="created_at"
      searchKeys={["name", "slug"]}
      setupHint="Create brands table from docs/admin-supabase-setup.sql. Products currently store brand as text, so filtering already works by product brand value."
      fields={[
        { key: "name", label: "Brand name", required: true },
        { key: "slug", label: "Slug", required: true },
        { key: "image", label: "Image/logo URL" },
        { key: "active", label: "Active", type: "checkbox" },
      ]}
      columns={[
        { key: "name", label: "Name" },
        { key: "slug", label: "Slug" },
        { key: "image", label: "Logo" },
        { key: "active", label: "Status" },
      ]}
    />
  );
}
