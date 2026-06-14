"use client";

import AdminResourcePage from "@/components/admin/AdminResourcePage";

export default function ReviewsPage() {
  return (
    <AdminResourcePage
      title="Reviews"
      description="Moderate product reviews and customer feedback."
      tableName="reviews"
      select="id,product_id,customer_name,rating,comment,active,created_at"
      fallbackSelect="id,product_id,customer_name,rating,text,status,created_at"
      orderBy="created_at"
      searchKeys={["customer_name", "comment"]}
      setupHint="Apply the Phase 2 commerce migration to create reviews."
      allowActiveToggle
      normalizeRow={(row, schema) =>
        schema === "fallback"
          ? {
              ...row,
              comment: row.text,
              active: row.status === "approved",
            }
          : row
      }
      adaptPayload={(payload, schema) => {
        if (schema === "primary") return payload;

        const { comment, active, ...legacyPayload } = payload;
        return {
          ...legacyPayload,
          text: comment,
          status: active ? "approved" : "pending",
        };
      }}
      activePayload={(row, schema) =>
        schema === "fallback"
          ? { status: row.active ? "pending" : "approved" }
          : { active: !row.active }
      }
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
