"use client";

import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

export default function RegionalPrice({
  pkrAmount,
  className,
  conversion = "international-quote",
}: {
  pkrAmount: number;
  className?: string;
  conversion?: "international-quote" | "historical-fx" | "international-addon";
}) {
  const { currency, locale, formatPrice, formatConvertedPKR } = useCurrency();
  const formatted = conversion === "historical-fx"
    ? formatConvertedPKR(pkrAmount)
    : conversion === "international-addon" && currency !== "PKR"
      ? formatCurrency(100, currency, locale)
      : formatPrice(pkrAmount);
  return <span className={className}>{formatted}</span>;
}
