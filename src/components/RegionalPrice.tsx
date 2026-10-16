"use client";

import { useCurrency } from "./CurrencyProvider";

export default function RegionalPrice({
  pkrAmount,
  className,
  conversion = "international-quote",
}: {
  pkrAmount: number;
  className?: string;
  conversion?: "international-quote" | "historical-fx";
}) {
  const { formatPrice, formatConvertedPKR } = useCurrency();
  const format = conversion === "historical-fx" ? formatConvertedPKR : formatPrice;
  return <span className={className}>{format(pkrAmount)}</span>;
}
