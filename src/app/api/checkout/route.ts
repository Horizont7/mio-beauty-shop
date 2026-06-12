import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

type CheckoutItem = {
  productId: number;
  quantity: number;
};

type CheckoutRequestBody = {
  customerName?: string;
  phone?: string;
  city?: string;
  address?: string;
  comment?: string;
  paymentMethod?: string;
  items?: CheckoutItem[];
};

type CheckoutErrorCode =
  | "invalid_order_data"
  | "empty_cart"
  | "product_not_found"
  | "product_out_of_stock"
  | "database_error"
  | "server_config_error";

type ValidatedProduct = {
  id: number;
  name_ru: string | null;
  name_uz: string | null;
  sku: string | null;
  image: string | null;
  price: number | string | null;
  stock: number | null;
  active: boolean | null;
};

type PreparedOrderItem = {
  product_id: number;
  product_name: string;
  product_sku: string | null;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const allowedCheckoutKeys = new Set([
  "customerName",
  "phone",
  "city",
  "address",
  "comment",
  "paymentMethod",
  "items",
]);
const phonePattern = /^\+?[0-9 ()-]{7,20}$/;
const recentOrderFingerprints = new Map<string, number>();

class CheckoutError extends Error {
  code: CheckoutErrorCode;
  status: number;

  constructor(code: CheckoutErrorCode, message: string, status = 400) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
    this.status = status;
  }
}

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string"
    ? value.replace(/[<>]/g, "").trim().slice(0, maxLength)
    : "";
}

function makeOrderNumber() {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replaceAll("-", "");
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replaceAll("-", "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `MIO-${stamp}-${random.toUpperCase()}`;
}

function logCheckoutError(stage: string, error: unknown, context?: Record<string, unknown>) {
  const supabaseError = error as SupabaseLikeError;

  console.error("[checkout]", stage, {
    code: supabaseError?.code,
    message:
      error instanceof Error
        ? error.message
        : supabaseError?.message || String(error),
    details: supabaseError?.details,
    hint: supabaseError?.hint,
    ...context,
  });
}

function isSchemaCacheError(error: SupabaseLikeError | null | undefined) {
  if (!error) return false;

  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();

  return (
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}

function normalizeItems(items: CheckoutItem[]) {
  const byProductId = new Map<number, number>();

  for (const item of items) {
    const productId = Number(item.productId);
    const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1));

    if (!Number.isInteger(productId) || productId <= 0) continue;

    byProductId.set(productId, Math.min(99, (byProductId.get(productId) || 0) + quantity));
  }

  return Array.from(byProductId, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasUnknownFields(value: Record<string, unknown>) {
  return Object.keys(value).some((key) => !allowedCheckoutKeys.has(key));
}

function makeOrderFingerprint({
  ip,
  phone,
  address,
  items,
}: {
  ip: string;
  phone: string;
  address: string;
  items: ReturnType<typeof normalizeItems>;
}) {
  const itemKey = items
    .map((item) => `${item.productId}:${item.quantity}`)
    .sort()
    .join(",");

  return `${ip}:${phone}:${address.toLowerCase()}:${itemKey}`;
}

function rejectDuplicateOrder(fingerprint: string) {
  const now = Date.now();
  const previous = recentOrderFingerprints.get(fingerprint);

  for (const [key, expiresAt] of recentOrderFingerprints) {
    if (expiresAt <= now) {
      recentOrderFingerprints.delete(key);
    }
  }

  if (previous && previous > now) {
    return true;
  }

  recentOrderFingerprints.set(fingerprint, now + 2 * 60 * 1000);
  return false;
}

function prepareOrderItems(
  normalizedItems: ReturnType<typeof normalizeItems>,
  products: ValidatedProduct[]
) {
  const productById = new Map(products.map((product) => [product.id, product]));

  return normalizedItems.map((item) => {
    const product = productById.get(item.productId);

    if (!product) {
      throw new CheckoutError(
        "product_not_found",
        "One or more products are no longer available.",
        404
      );
    }

    if (typeof product.stock === "number" && product.stock <= 0) {
      throw new CheckoutError("product_out_of_stock", "Product is out of stock.", 409);
    }

    if (typeof product.stock === "number" && product.stock < item.quantity) {
      throw new CheckoutError(
        "product_out_of_stock",
        "Not enough stock for one or more products.",
        409
      );
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
}

async function insertOrderWithItems({
  supabase,
  orderNumber,
  customerName,
  phone,
  city,
  address,
  comment,
  subtotal,
  deliveryPrice,
  total,
  orderItems,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  orderNumber: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  comment: string;
  subtotal: number;
  deliveryPrice: number;
  total: number;
  orderItems: PreparedOrderItem[];
}) {
  async function insertSkuItems(orderId: number, priceColumn: "unit_price" | "price") {
    return supabase.from("order_items").insert(
      orderItems.map((item) => ({
        order_id: orderId,
        product_id: item.product_id,
        sku: item.product_sku,
        product_name: item.product_name,
        quantity: item.quantity,
        [priceColumn]: item.unit_price,
        total_price: item.total_price,
      }))
    );
  }

  async function insertCompatibleSkuItems(orderId: number) {
    const unitPriceResult = await insertSkuItems(orderId, "unit_price");

    if (!unitPriceResult.error || !isSchemaCacheError(unitPriceResult.error)) {
      return unitPriceResult;
    }

    logCheckoutError("sku order_items insert with unit_price failed", unitPriceResult.error, {
      orderId,
      orderNumber,
    });

    return insertSkuItems(orderId, "price");
  }

  const modernOrderPayload = {
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
  };

  const modernOrderResult = await supabase
    .from("orders")
    .insert(modernOrderPayload)
    .select("id,order_number")
    .single();

  if (!modernOrderResult.error) {
    const { error: modernItemsError } = await supabase.from("order_items").insert(
      orderItems.map((item) => ({
        order_id: modernOrderResult.data.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_image: item.product_image,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }))
    );

    if (!modernItemsError) {
      return modernOrderResult.data.order_number || orderNumber;
    }

    logCheckoutError("modern order_items insert failed", modernItemsError, {
      orderId: modernOrderResult.data.id,
      orderNumber,
    });

    if (isSchemaCacheError(modernItemsError)) {
      const { error: legacyItemsForModernOrderError } = await insertCompatibleSkuItems(
        modernOrderResult.data.id
      );

      if (!legacyItemsForModernOrderError) {
        return modernOrderResult.data.order_number || orderNumber;
      }

      logCheckoutError(
        "legacy order_items insert for modern order failed",
        legacyItemsForModernOrderError,
        {
          orderId: modernOrderResult.data.id,
          orderNumber,
        }
      );
    }

    throw new CheckoutError("database_error", "Database insert failed.", 500);
  } else {
    logCheckoutError("modern orders insert failed", modernOrderResult.error, {
      orderNumber,
      fields: Object.keys(modernOrderPayload),
    });

    if (!isSchemaCacheError(modernOrderResult.error)) {
      throw new CheckoutError("database_error", "Database insert failed.", 500);
    }
  }

  const legacyOrderPayload = {
    customer_name: customerName,
    phone,
    address,
    total_price: total,
    status: "new",
    payment_method: "cash_on_delivery",
    delivery_method: city || null,
  };
  const legacyOrderResult = await supabase
    .from("orders")
    .insert(legacyOrderPayload)
    .select("id")
    .single();

  if (legacyOrderResult.error) {
    logCheckoutError("legacy orders insert failed", legacyOrderResult.error, {
      orderNumber,
      fields: Object.keys(legacyOrderPayload),
    });
    throw new CheckoutError("database_error", "Database insert failed.", 500);
  }

  const { error: legacyItemsError } = await insertCompatibleSkuItems(
    legacyOrderResult.data.id
  );

  if (legacyItemsError) {
    logCheckoutError("legacy order_items insert failed", legacyItemsError, {
      orderId: legacyOrderResult.data.id,
      orderNumber,
    });
    throw new CheckoutError("database_error", "Database insert failed.", 500);
  }

  return orderNumber;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rateLimit = checkRateLimit({
      key: `checkout:${ip}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many checkout requests.", errorCode: "invalid_order_data" },
        { status: 429 }
      );
    }

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json(
        { error: "Checkout requires JSON.", errorCode: "invalid_order_data" },
        { status: 415 }
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 32_000) {
      return NextResponse.json(
        { error: "Checkout payload is too large.", errorCode: "invalid_order_data" },
        { status: 413 }
      );
    }

    let body: CheckoutRequestBody;

    try {
      const parsed = await request.json();

      if (!isPlainObject(parsed) || hasUnknownFields(parsed)) {
        throw new CheckoutError(
          "invalid_order_data",
          "Checkout payload contains invalid fields.",
          400
        );
      }

      body = parsed as CheckoutRequestBody;
    } catch (parseError) {
      if (parseError instanceof CheckoutError) {
        throw parseError;
      }

      logCheckoutError("validation failed", parseError, { reason: "invalid json" });
      return NextResponse.json(
        { error: "Invalid order data.", errorCode: "invalid_order_data" },
        { status: 400 }
      );
    }

    const customerName = cleanText(body.customerName, 120);
    const phone = cleanText(body.phone, 60);
    const city = cleanText(body.city, 120);
    const address = cleanText(body.address, 300);
    const comment = cleanText(body.comment, 800);
    const items = Array.isArray(body.items) ? body.items : [];

    if (!customerName || !phone || !address) {
      logCheckoutError("validation failed", new Error("missing required fields"), {
        hasCustomerName: Boolean(customerName),
        hasPhone: Boolean(phone),
        hasAddress: Boolean(address),
      });
      return NextResponse.json(
        {
          error: "Required checkout fields are missing.",
          errorCode: "invalid_order_data",
        },
        { status: 400 }
      );
    }

    if (!phonePattern.test(phone)) {
      logCheckoutError("validation failed", new Error("invalid phone format"));
      return NextResponse.json(
        {
          error: "Phone number format is invalid.",
          errorCode: "invalid_order_data",
        },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      logCheckoutError("validation failed", new Error("empty cart"));
      return NextResponse.json(
        { error: "Cart must not be empty.", errorCode: "empty_cart" },
        { status: 400 }
      );
    }

    const normalizedItems = normalizeItems(items);

    if (normalizedItems.length === 0) {
      logCheckoutError("validation failed", new Error("no valid cart items"), {
        incomingItemCount: items.length,
      });
      return NextResponse.json(
        { error: "Cart contains invalid products.", errorCode: "invalid_order_data" },
        { status: 400 }
      );
    }

    const fingerprint = makeOrderFingerprint({
      ip,
      phone,
      address,
      items: normalizedItems,
    });

    if (rejectDuplicateOrder(fingerprint)) {
      return NextResponse.json(
        {
          error: "Duplicate checkout request detected.",
          errorCode: "invalid_order_data",
        },
        { status: 409 }
      );
    }

    const productIds = normalizedItems.map((item) => item.productId);
    const supabase = createSupabaseAdminClient();

    console.info("[checkout] request accepted", {
      itemCount: normalizedItems.length,
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    });

    const { data: products, error } = await supabase
      .from("products")
      .select("id,name_ru,name_uz,sku,image,price,stock,active")
      .in("id", productIds)
      .eq("active", true);

    if (error) {
      logCheckoutError("products lookup failed", error, { productIds });
      throw new CheckoutError("database_error", "Product validation failed.", 500);
    }

    const orderItems = prepareOrderItems(
      normalizedItems,
      ((products || []) as ValidatedProduct[])
    );

    const subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
    const deliveryPrice = 0;
    const total = subtotal + deliveryPrice;

    let finalOrderNumber = "";

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const orderNumber = makeOrderNumber();

      try {
        finalOrderNumber = await insertOrderWithItems({
          supabase,
          orderNumber,
          customerName,
          phone,
          city,
          address,
          comment,
          subtotal,
          deliveryPrice,
          total,
          orderItems,
        });
        break;
      } catch (insertError) {
        const supabaseError = insertError as SupabaseLikeError;
        if (supabaseError.code === "23505" && attempt < 3) {
          logCheckoutError("order number collision, retrying", insertError, {
            attempt,
            orderNumber,
          });
          continue;
        }

        throw insertError;
      }
    }

    if (!finalOrderNumber) {
      throw new CheckoutError("database_error", "Could not create a unique order.", 500);
    }

    console.info("[checkout] order created", {
      orderNumber: finalOrderNumber,
      itemCount: orderItems.length,
      total,
    });

    return NextResponse.json({ orderNumber: finalOrderNumber });
  } catch (error) {
    logCheckoutError("request failed", error);

    if (error instanceof CheckoutError) {
      return NextResponse.json(
        { error: error.message, errorCode: error.code },
        { status: error.status }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("SUPABASE_SERVICE_ROLE_KEY")
    ) {
      return NextResponse.json(
        {
          error: "Server checkout configuration is incomplete.",
          errorCode: "server_config_error",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Could not create order.",
        errorCode: "database_error",
      },
      { status: 500 }
    );
  }
}
