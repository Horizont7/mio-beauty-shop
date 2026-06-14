"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProductSummary = {
  id: number;
  name_ru: string | null;
  name_uz: string | null;
  sku: string | null;
  stock: number | null;
  active: boolean;
  created_at?: string;
};

type OrderSummary = {
  id: string | number;
  customer_name: string | null;
  total: number;
  status: string;
  created_at: string | null;
};

type DashboardState = {
  products: ProductSummary[];
  orders: OrderSummary[];
  productError: string;
  orderError: string;
  orderCount: number;
  revenue: number;
  customerCount: number;
  customerError: string;
};

const initialState: DashboardState = {
  products: [],
  orders: [],
  productError: "",
  orderError: "",
  orderCount: 0,
  revenue: 0,
  customerCount: 0,
  customerError: "",
};

function productName(product: ProductSummary) {
  return product.name_uz || product.name_ru || product.sku || "Unnamed product";
}

export default function AdminPage() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      const [productsResult, modernOrdersResult, customersResult] =
        await Promise.all([
          supabase
            .from("products")
            .select("id,name_ru,name_uz,sku,stock,active,created_at")
            .order("id", { ascending: false }),
          supabase
            .from("orders")
            .select("id,customer_name,total,order_status,created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("customers")
            .select("id", { count: "exact", head: true }),
        ]);

      let orders: OrderSummary[] = [];
      let orderError = "";

      if (!modernOrdersResult.error) {
        orders = (modernOrdersResult.data || []).map((order) => ({
          id: order.id,
          customer_name: order.customer_name,
          total: Number(order.total || 0),
          status: order.order_status || "new",
          created_at: order.created_at,
        }));
      } else {
        const legacyOrdersResult = await supabase
          .from("orders")
          .select("id,customer_name,total_price,status,created_at")
          .order("created_at", { ascending: false });

        if (legacyOrdersResult.error) {
          orderError =
            legacyOrdersResult.error.message || modernOrdersResult.error.message;
        } else {
          orders = (legacyOrdersResult.data || []).map((order) => ({
            id: order.id,
            customer_name: order.customer_name,
            total: Number(order.total_price || 0),
            status: order.status || "new",
            created_at: order.created_at,
          }));
        }
      }

      setState({
        products: (productsResult.data || []) as ProductSummary[],
        orders,
        productError: productsResult.error?.message || "",
        orderError,
        orderCount: orders.length,
        revenue: orders.reduce((sum, order) => sum + order.total, 0),
        customerCount: customersResult.count || 0,
        customerError: customersResult.error?.message || "",
      });
      setLoading(false);
    }

    void loadDashboard();
  }, []);

  const activeProducts = state.products.filter((product) => product.active);
  const lowStockProducts = state.products.filter(
    (product) => (product.stock ?? 0) <= 5
  );
  const newOrders = state.orders.filter((order) => order.status === "new");
  const stats = [
    { label: "Total products", value: state.products.length },
    { label: "Active products", value: activeProducts.length },
    { label: "Orders", value: state.orderCount },
    { label: "Customers", value: state.customerCount },
    { label: "Sales summary", value: state.revenue.toLocaleString("ru-RU") },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B96C5C]">
          MIO Beauty admin
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-500">
          Overview of catalog, orders, stock and recent activity.
        </p>
      </div>

      {(state.productError || state.orderError || state.customerError) && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-bold">Some Supabase tables still need setup</p>
          {state.productError && <p className="mt-2">Products: {state.productError}</p>}
          {state.orderError && <p className="mt-2">Orders: {state.orderError}</p>}
          {state.customerError && <p className="mt-2">Customers: {state.customerError}</p>}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((item) => (
          <div key={item.label} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-gray-950">
              {loading ? "..." : item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-950">New orders</h2>
          <div className="mt-4 space-y-3">
            {newOrders.length ? (
              newOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="rounded-2xl border border-gray-100 p-4">
                  <p className="font-bold text-gray-950">#{order.id}</p>
                  <p className="text-sm text-gray-500">{order.customer_name || "Customer"}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No new orders.</p>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-950">Low stock products</h2>
          <div className="mt-4 space-y-3">
            {lowStockProducts.length ? (
              lowStockProducts.slice(0, 6).map((product) => (
                <div key={product.id} className="flex justify-between rounded-2xl border border-gray-100 p-4">
                  <span className="font-semibold text-gray-950">{productName(product)}</span>
                  <span className="text-sm font-bold text-red-600">{product.stock ?? 0}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No low stock products.</p>
            )}
          </div>
        </section>

        <section className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-950">Recent products</h2>
          <div className="mt-4 space-y-3">
            {state.products.slice(0, 6).map((product) => (
              <div key={product.id} className="rounded-2xl border border-gray-100 p-4">
                <p className="font-semibold text-gray-950">{productName(product)}</p>
                <p className="text-sm text-gray-500">{product.sku || "No SKU"}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
