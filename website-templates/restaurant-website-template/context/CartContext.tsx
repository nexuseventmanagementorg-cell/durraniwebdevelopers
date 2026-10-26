'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, CartItemAddon, OrderType } from '@/types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: {
    itemType: 'product' | 'deal';
    itemId: string;
    nameEn: string;
    nameUr: string;
    basePrice: number;
    quantity: number;
    addons?: CartItemAddon[];
    specialInstructions?: string;
    image: string;
  }) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  totalCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  activeTable: string | null;
  setActiveTable: (table: string | null) => void;
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'student_shawarma_cart_v1';
const TABLE_STORAGE_KEY = 'student_shawarma_active_table';
const ORDER_TYPE_STORAGE_KEY = 'student_shawarma_order_type';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTable, setActiveTableState] = useState<string | null>(null);
  const [orderType, setOrderTypeState] = useState<OrderType>('takeaway');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }

      const savedTable = localStorage.getItem(TABLE_STORAGE_KEY);
      if (savedTable) {
        setActiveTableState(savedTable);
        setOrderTypeState('dine_in');
      }

      const savedOrderType = localStorage.getItem(ORDER_TYPE_STORAGE_KEY);
      if (savedOrderType && !savedTable) {
        setOrderTypeState(savedOrderType as OrderType);
      }
    } catch {
      // Safe fallback
    }
    setIsHydrated(true);
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items, isHydrated]);

  const setActiveTable = (table: string | null) => {
    setActiveTableState(table);
    if (table) {
      setOrderTypeState('dine_in');
      try {
        localStorage.setItem(TABLE_STORAGE_KEY, table);
        localStorage.setItem(ORDER_TYPE_STORAGE_KEY, 'dine_in');
      } catch {}
    } else {
      try {
        localStorage.removeItem(TABLE_STORAGE_KEY);
      } catch {}
    }
  };

  const setOrderType = (type: OrderType) => {
    setOrderTypeState(type);
    try {
      localStorage.setItem(ORDER_TYPE_STORAGE_KEY, type);
    } catch {}
  };

  const addItem = (item: {
    itemType: 'product' | 'deal';
    itemId: string;
    nameEn: string;
    nameUr: string;
    basePrice: number;
    quantity: number;
    addons?: CartItemAddon[];
    specialInstructions?: string;
    image: string;
  }) => {
    setItems((prev) => {
      // Generate a composite key based on item + addons + instructions
      const addonKey = (item.addons || [])
        .map((a) => a.id)
        .sort()
        .join('-');
      const lineKey = `${item.itemId}_${addonKey}_${item.specialInstructions || ''}`;

      const existingIndex = prev.findIndex((i) => i.id === lineKey);
      const addonsPrice = (item.addons || []).reduce((sum, a) => sum + a.price, 0);
      const unitTotal = item.basePrice + addonsPrice;

      if (existingIndex >= 0) {
        const copy = [...prev];
        const existing = copy[existingIndex];
        const newQty = existing.quantity + item.quantity;
        copy[existingIndex] = {
          ...existing,
          quantity: newQty,
          lineTotal: unitTotal * newQty,
        };
        return copy;
      } else {
        const newItem: CartItem = {
          id: lineKey,
          itemType: item.itemType,
          itemId: item.itemId,
          nameEn: item.nameEn,
          nameUr: item.nameUr,
          basePrice: item.basePrice,
          quantity: item.quantity,
          addons: item.addons,
          specialInstructions: item.specialInstructions,
          image: item.image,
          lineTotal: unitTotal * item.quantity,
        };
        return [...prev, newItem];
      }
    });

    // Auto open cart drawer
    setIsCartOpen(true);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(cartItemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === cartItemId) {
          const addonsPrice = (item.addons || []).reduce((sum, a) => sum + a.price, 0);
          const unitTotal = item.basePrice + addonsPrice;
          return {
            ...item,
            quantity: newQty,
            lineTotal: unitTotal * newQty,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const subtotal = items.reduce((acc, item) => acc + item.lineTotal, 0);
  const totalCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        totalCount,
        isCartOpen,
        setIsCartOpen,
        activeTable,
        setActiveTable,
        orderType,
        setOrderType,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
