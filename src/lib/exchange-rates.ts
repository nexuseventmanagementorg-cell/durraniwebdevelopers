import { CURRENCY_OPTIONS, CurrencyCode, ExchangeRates } from "./currency";

const EXCHANGE_RATE_URL = "https://open.er-api.com/v6/latest/PKR";

export interface ExchangeRateSnapshot {
  rates: ExchangeRates;
  updatedAt: string;
}

export async function getExchangeRateSnapshot(): Promise<ExchangeRateSnapshot> {
  const response = await fetch(EXCHANGE_RATE_URL, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error("Live exchange rates are temporarily unavailable.");
  }

  const data: unknown = await response.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("result" in data) ||
    data.result !== "success" ||
    !("rates" in data) ||
    typeof data.rates !== "object" ||
    data.rates === null ||
    !("time_last_update_utc" in data) ||
    typeof data.time_last_update_utc !== "string"
  ) {
    throw new Error("The exchange-rate provider returned invalid data.");
  }

  const rates: ExchangeRates = { PKR: 1 };
  const rawRates = data.rates as Record<string, unknown>;
  const supported = CURRENCY_OPTIONS
    .map((currency) => currency.code)
    .filter((code): code is CurrencyCode => code !== "PKR");
  for (const code of supported) {
    const rate = rawRates[code];
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      rates[code] = rate;
    }
  }

  return { rates, updatedAt: data.time_last_update_utc };
}
