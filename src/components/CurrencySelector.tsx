"use client";

import { CURRENCY_OPTIONS } from "@/lib/currency";
import { useCurrency } from "./CurrencyProvider";

export default function CurrencySelector({
  className = "",
  id,
}: {
  className?: string;
  id?: string;
}) {
  const { currency, setCurrency } = useCurrency();

  return (
    <select
      aria-label="Select project currency"
      id={id}
      value={currency}
      onChange={(event) => setCurrency(event.target.value as typeof currency)}
      className={className}
    >
      {CURRENCY_OPTIONS.map((option) => (
        <option key={option.code} value={option.code}>
          {option.code} — {option.name}
        </option>
      ))}
    </select>
  );
}
