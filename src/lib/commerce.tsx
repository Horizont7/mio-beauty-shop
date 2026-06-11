"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CatalogProduct } from "@/lib/products";

export type CartItem = {
  id: number;
  slug: string | null;
  name_ru: string | null;
  name_uz: string | null;
  sku?: string | null;
  image: string | null;
  price: number | null;
  quantity: number;
};

type CommerceContextValue = {
  cartItems: CartItem[];
  favoriteIds: number[];
  cartCount: number;
  favoritesCount: number;
  cartTotal: number;
  addToCart: (product: CatalogProduct, quantity?: number) => void;
  increaseQuantity: (productId: number) => void;
  decreaseQuantity: (productId: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  toggleFavorite: (productId: number) => void;
  isFavorite: (productId: number) => boolean;
};

const CommerceContext = createContext<CommerceContextValue | null>(null);
const cartStorageKey = "mio-cart";
const favoritesStorageKey = "mio-favorites";

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function productToCartItem(product: CatalogProduct, quantity: number): CartItem {
  return {
    id: product.id,
    slug: product.slug,
    name_ru: product.name_ru,
    name_uz: product.name_uz,
    sku: product.sku,
    image: product.image,
    price: product.price,
    quantity,
  };
}

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() =>
    readStorage<CartItem[]>(cartStorageKey, [])
  );
  const [favoriteIds, setFavoriteIds] = useState<number[]>(() =>
    readStorage<number[]>(favoritesStorageKey, [])
  );
  const [ready] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
  }, [cartItems, ready]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(
      favoritesStorageKey,
      JSON.stringify(favoriteIds)
    );
  }, [favoriteIds, ready]);

  const value = useMemo<CommerceContextValue>(() => {
    function addToCart(product: CatalogProduct, quantity = 1) {
      setCartItems((current) => {
        const existing = current.find((item) => item.id === product.id);

        if (existing) {
          return current.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        }

        return [...current, productToCartItem(product, quantity)];
      });
    }

    function increaseQuantity(productId: number) {
      setCartItems((current) =>
        current.map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    }

    function decreaseQuantity(productId: number) {
      setCartItems((current) =>
        current
          .map((item) =>
            item.id === productId
              ? { ...item, quantity: Math.max(0, item.quantity - 1) }
              : item
          )
          .filter((item) => item.quantity > 0)
      );
    }

    function removeFromCart(productId: number) {
      setCartItems((current) =>
        current.filter((item) => item.id !== productId)
      );
    }

    function clearCart() {
      setCartItems([]);
    }

    function toggleFavorite(productId: number) {
      setFavoriteIds((current) =>
        current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId]
      );
    }

    function isFavorite(productId: number) {
      return favoriteIds.includes(productId);
    }

    return {
      cartItems,
      favoriteIds,
      cartCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      favoritesCount: favoriteIds.length,
      cartTotal: cartItems.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0
      ),
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
      toggleFavorite,
      isFavorite,
    };
  }, [cartItems, favoriteIds]);

  return (
    <CommerceContext.Provider value={value}>
      {children}
    </CommerceContext.Provider>
  );
}

export function useCommerce() {
  const context = useContext(CommerceContext);

  if (!context) {
    throw new Error("useCommerce must be used inside CommerceProvider");
  }

  return context;
}
