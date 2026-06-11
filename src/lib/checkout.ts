import { supabase } from "@/lib/supabase";

export type CheckoutCustomer = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

export type CheckoutItem = {
  productId?: number | null;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
};

export type CheckoutOrderInput = {
  customer: CheckoutCustomer;
  items: CheckoutItem[];
  totalPrice: number;
  paymentMethod?: string;
  deliveryMethod?: string;
};

export type CheckoutOrderResult = {
  orderId: string;
};

function getOrderId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  throw new Error("Unable to create order id in this browser.");
}

export async function createCheckoutOrder({
  customer,
  items,
  totalPrice,
  paymentMethod,
  deliveryMethod,
}: CheckoutOrderInput): Promise<CheckoutOrderResult> {
  const orderId = getOrderId();

  const { error: customerError } = await supabase.from("customers").insert({
    name: customer.name,
    phone: customer.phone,
    email: customer.email || null,
    address: customer.address || null,
  });

  if (customerError) {
    throw customerError;
  }

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    customer_name: customer.name,
    phone: customer.phone,
    address: customer.address || null,
    total_price: totalPrice,
    status: "new",
    payment_method: paymentMethod || null,
    delivery_method: deliveryMethod || null,
  });

  if (orderError) {
    throw orderError;
  }

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: orderId,
        product_id: item.productId || null,
        product_name: item.productName,
        sku: item.sku || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
      }))
    );

    if (itemsError) {
      throw itemsError;
    }
  }

  return { orderId };
}
