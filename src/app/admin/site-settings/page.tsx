import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function SiteSettingsPage() {
  return (
    <AdminResourcePage
      title="Site settings"
      description="Manage contact, social and website information."
      tableName="site_settings"
      select="id,logo,phone,email,address,instagram,telegram,youtube,footer_text,company_info,delivery_page_text,payment_page_text,created_at"
      orderBy="created_at"
      searchKeys={["phone", "email", "address", "footer_text", "company_info"]}
      setupHint="Create site_settings table from docs/admin-supabase-setup.sql. Header/footer can be wired to this table in the next website integration pass."
      allowActiveToggle={false}
      allowDelete={false}
      fields={[
        { key: "logo", label: "Logo URL" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email", type: "email" },
        { key: "address", label: "Address", type: "textarea" },
        { key: "instagram", label: "Instagram" },
        { key: "telegram", label: "Telegram" },
        { key: "youtube", label: "YouTube" },
        { key: "footer_text", label: "Footer text", type: "textarea" },
        { key: "company_info", label: "Company information", type: "textarea" },
        { key: "delivery_page_text", label: "Delivery page text", type: "textarea" },
        { key: "payment_page_text", label: "Payment page text", type: "textarea" },
      ]}
      columns={[
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "address", label: "Address" },
        { key: "instagram", label: "Instagram" },
      ]}
    />
  );
}
