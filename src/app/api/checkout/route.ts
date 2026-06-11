import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

type CheckoutItem = {
  productId: number;
  quantity: number;
};

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function makeOrderNumber() {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `MIO-${stamp}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      customerName?: string;
      phone?: string;
      city?: string;
      address?: string;
      comment?: string;
      paymentMethod?: string;
      items?: CheckoutItem[];
    };

    const customerName = cleanText(body.customerName, 120);
    const phone = cleanText(body.phone, 60);
    const city = cleanText(body.city, 120);
    const address = cleanText(body.address, 300);
    const comment = cleanText(body.comment, 800);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerName || !phone || !address) {
      return NextResponse.json(
        { error: "Required checkout fields are missing." },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Cart must not be empty." },
        { status: 400 }
      );
    }

    const normalizedItems = items
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Math.max(1, Math.min(99, Number(item.quantity) || 1)),
      }))
      .filter((item) => Number.isInteger(item.productId));

    const productIds = normalizedItems.map((item) => item.productId);
    const supabase = createSupabaseAdminClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("id,name_ru,name_uz,sku,image,price,stock,active")
      .in("id", productIds)
      .eq("active", true);

    if (error) throw error;

    const productById = new Map((products || []).map((product) => [product.id, product]));
    const orderItems = normalizedItems.map((item) => {
      const product = productById.get(item.productId);

      if (!product) {
        throw new Error("Product is unavailable.");
      }

      if (product.stock !== null && product.stock < item.quantity) {
        throw new Error("Not enough stock for one or more products.");
      }

      const unitPrice = Number(product.price || 0);

      return {
        product_id: product.id,
        product_name: product.name_ru || product.name_uz || "MIO Beauty",
        product_sku: product.sku,
        product_image: product.image,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: unitPrice * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
    const deliveryPrice = 0;
    const total = subtotal + deliveryPrice;
    const orderNumber = makeOrderNumber();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: customerName,
        customer_phone: phone,
        customer_city: city || null,
        customer_address: address,
        customer_comment: comment || null,
        payment_method: "cash_on_delivery",
        payment_status: "pending",
        order_status: "new",
        subtotal,
        delivery_price: deliveryPrice,
        total,
      })
      .select("id,order_number")
      .single();

    if (orderError) throw orderError;

    const { error: itemsError } = await supabase.from("order_items").insert(
      orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      }))
    );

    if (itemsError) throw itemsError;

    return NextResponse.json({ orderNumber: order.order_number });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create order.",
      },
      { status: 400 }
    );
  }
}
