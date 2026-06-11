"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type FieldType =
  | "text"
  | "email"
  | "number"
  | "textarea"
  | "select"
  | "date"
  | "datetime-local"
  | "checkbox";

export type ResourceField = {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
};

export type ResourceColumn = {
  key: string;
  label: string;
  render?: (row: ResourceRow) => React.ReactNode;
};

export type ResourceRow = Record<string, unknown> & {
  id?: number | string;
  active?: boolean;
};

type AdminResourcePageProps = {
  title: string;
  description: string;
  tableName: string;
  select: string;
  fields: ResourceField[];
  columns: ResourceColumn[];
  searchKeys?: string[];
  orderBy?: string;
  setupHint?: string;
  allowDelete?: boolean;
  allowActiveToggle?: boolean;
};

type ToastMessage = {
  type: "success" | "error";
  text: string;
};

function emptyForm(fields: ResourceField[]) {
  return fields.reduce<Record<string, string | boolean>>((result, field) => {
    result[field.key] = field.type === "checkbox" ? false : "";
    return result;
  }, {});
}

function textValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatCell(value: unknown) {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  return textValue(value) || "-";
}

function buildPayload(fields: ResourceField[], form: Record<string, string | boolean>) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    const value = form[field.key];

    if (field.type === "checkbox") {
      payload[field.key] = Boolean(value);
      return payload;
    }

    if (field.type === "number") {
      const parsed = Number(value);
      payload[field.key] = value === "" || Number.isNaN(parsed) ? null : parsed;
      return payload;
    }

    payload[field.key] =
      typeof value === "string" && value.trim() ? value.trim() : null;
    return payload;
  }, {});
}

export default function AdminResourcePage({
  title,
  description,
  tableName,
  select,
  fields,
  columns,
  searchKeys = [],
  orderBy = "created_at",
  setupHint,
  allowDelete = true,
  allowActiveToggle = true,
}: AdminResourcePageProps) {
  const [rows, setRows] = useState<ResourceRow[]>([]);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  function showToast(type: ToastMessage["type"], text: string) {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 3500);
  }

  async function loadRows() {
    setPageLoading(true);
    setError("");

    let query = supabase.from(tableName).select(select);
    if (orderBy) {
      query = query.order(orderBy, { ascending: false, nullsFirst: false });
    }

    const { data, error: loadError } = await query;

    if (loadError) {
      setRows([]);
      setError(loadError.message);
      setPageLoading(false);
      return;
    }

    setRows((data || []) as unknown as ResourceRow[]);
    setPageLoading(false);
  }

  function updateForm(field: string, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(fields));
    setDrawerOpen(true);
  }

  function openEdit(row: ResourceRow) {
    setEditingId(row.id ?? null);
    setForm(
      fields.reduce<Record<string, string | boolean>>((result, field) => {
        const value = row[field.key];
        result[field.key] =
          field.type === "checkbox" ? Boolean(value) : textValue(value);
        return result;
      }, {})
    );
    setDrawerOpen(true);
  }

  async function saveRow() {
    for (const field of fields) {
      if (field.required && !textValue(form[field.key]).trim()) {
        showToast("error", `${field.label} is required.`);
        return;
      }
    }

    setLoading(true);
    const payload = buildPayload(fields, form);
    const result = editingId
      ? await supabase.from(tableName).update(payload).eq("id", editingId)
      : await supabase.from(tableName).insert([payload]);

    if (result.error) {
      showToast("error", result.error.message);
      setLoading(false);
      return;
    }

    showToast("success", editingId ? "Saved successfully." : "Created successfully.");
    setDrawerOpen(false);
    setEditingId(null);
    setForm(emptyForm(fields));
    setLoading(false);
    await loadRows();
  }

  async function deleteRow(row: ResourceRow) {
    if (!row.id) return;
    if (!window.confirm("Delete this item?")) return;

    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq("id", row.id);

    if (deleteError) {
      showToast("error", deleteError.message);
      return;
    }

    showToast("success", "Deleted.");
    await loadRows();
  }

  async function toggleActive(row: ResourceRow) {
    if (!row.id) return;

    const { error: updateError } = await supabase
      .from(tableName)
      .update({ active: !row.active })
      .eq("id", row.id);

    if (updateError) {
      showToast("error", updateError.message);
      return;
    }

    showToast("success", !row.active ? "Enabled." : "Disabled.");
    await loadRows();
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) =>
      searchKeys.some((key) => textValue(row[key]).toLowerCase().includes(query))
    );
  }, [rows, search, searchKeys]);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-2xl px-5 py-4 text-sm font-semibold shadow-2xl ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          } text-white`}
        >
          {toast.text}
        </div>
      )}

      <div className="rounded-[28px] border border-white bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B96C5C]">
              MIO Beauty admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">{title}</h1>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-[#EEA391] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#EEA391]/25 transition hover:bg-[#df8f7c]"
          >
            Add new
          </button>
        </div>
      </div>

      <section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
        />
      </section>

      {error && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-bold">Supabase setup needed</p>
          <p className="mt-2">{error}</p>
          {setupHint && <p className="mt-2">{setupHint}</p>}
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] border border-white bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-950">{title} list</h2>
          <p className="text-sm text-gray-500">
            Showing {filteredRows.length} of {rows.length}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 z-10 bg-[#fff8f6] text-xs uppercase tracking-[0.14em] text-gray-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-5 py-4 text-left">
                    {column.label}
                  </th>
                ))}
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageLoading ? (
                Array.from({ length: 5 }, (_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td colSpan={columns.length + 1} className="px-5 py-5">
                      <div className="h-12 rounded-2xl bg-gray-100" />
                    </td>
                  </tr>
                ))
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row, index) => (
                  <tr key={row.id ?? index} className="transition hover:bg-[#fffaf8]">
                    {columns.map((column) => (
                      <td key={column.key} className="px-5 py-4 text-gray-700">
                        {column.render
                          ? column.render(row)
                          : formatCell(row[column.key])}
                      </td>
                    ))}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
                        >
                          Edit
                        </button>
                        {allowActiveToggle && "active" in row && (
                          <button
                            type="button"
                            onClick={() => toggleActive(row)}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-950 hover:text-gray-950"
                          >
                            {row.active ? "Disable" : "Enable"}
                          </button>
                        )}
                        {allowDelete && (
                          <button
                            type="button"
                            onClick={() => deleteRow(row)}
                            className="rounded-xl border border-red-100 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + 1} className="px-5 py-16 text-center">
                    <p className="text-lg font-bold text-gray-950">No records found</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Add data or adjust the search query.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close form"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-gray-950/35 backdrop-blur-sm"
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B96C5C]">
                  {title}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-gray-950">
                  {editingId ? "Edit record" : "Add record"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
              >
                Close
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
              {fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-1 block text-sm font-semibold text-gray-700">
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  {field.type === "textarea" ? (
                    <textarea
                      value={textValue(form[field.key])}
                      onChange={(event) => updateForm(field.key, event.target.value)}
                      rows={4}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={textValue(form[field.key])}
                      onChange={(event) => updateForm(field.key, event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                    >
                      <option value="">Select</option>
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(form[field.key])}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateForm(field.key, event.target.checked)
                      }
                      className="h-5 w-5 accent-[#EEA391]"
                    />
                  ) : (
                    <input
                      type={field.type || "text"}
                      value={textValue(form[field.key])}
                      onChange={(event) => updateForm(field.key, event.target.value)}
                      placeholder={field.placeholder}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#EEA391] focus:ring-4 focus:ring-[#EEA391]/20"
                    />
                  )}
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 transition hover:border-[#EEA391] hover:text-[#B96C5C]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRow}
                disabled={loading}
                className="rounded-xl bg-[#EEA391] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#EEA391]/25 transition hover:bg-[#df8f7c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
