"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  CurrencyCode,
  currencyForCountry,
  ExchangeRates,
  formatCurrency,
  isCurrencyCode,
  localeForCountry,
} from "@/lib/currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  rates: ExchangeRates;
  rateDate: string;
  rateError: string;
  locale: string;
  formatPrice: (pkrAmount: number) => string;
  formatConvertedPKR: (pkrAmount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function currencyPreferenceKey(country: string): string {
  return `dwd-currency:${country}`;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("PKR");
  const [country, setCountry] = useState("PK");
  const [rates, setRates] = useState<ExchangeRates>({ PKR: 1 });
  const [rateDate, setRateDate] = useState("");
  const [rateError, setRateError] = useState("");
  const [locale, setLocale] = useState("en-US");

  useEffect(() => {
    let active = true;

    async function loadLocale() {
      try {
        const response = await fetch("/api/public/locale");
        if (!response.ok) throw new Error("Currency rates could not be loaded.");
        const result = await response.json();
        if (!active || !result || typeof result !== "object") return;

        const visitorCountry =
          typeof result.country === "string" && result.country
            ? result.country.toUpperCase()
            : "PK";
        const visitorLocale = localeForCountry(visitorCountry, navigator.language || "en-PK");
        const savedCurrency = localStorage.getItem(currencyPreferenceKey(visitorCountry));
        const availableRates =
          result.rates && typeof result.rates === "object" ? result.rates : { PKR: 1 };
        const selectedCurrency = isCurrencyCode(savedCurrency)
          ? savedCurrency
          : currencyForCountry(visitorCountry);

        setRates(availableRates);
        setRateDate(typeof result.updatedAt === "string" ? result.updatedAt : "");
        setCountry(visitorCountry);
        setLocale(visitorLocale);
        setCurrencyState(selectedCurrency);
        localStorage.removeItem("dwd-currency");
        if (selectedCurrency !== "PKR" && !availableRates[selectedCurrency]) {
          setRateError(`No current ${selectedCurrency} exchange rate is available.`);
        } else {
          setRateError("");
        }
      } catch (error) {
        if (!active) return;
        setRateError(error instanceof Error ? error.message : "Currency rates could not be loaded.");
        const savedCurrency = localStorage.getItem(currencyPreferenceKey("PK"));
        setCountry("PK");
        setLocale("en-PK");
        setCurrencyState(isCurrencyCode(savedCurrency) ? savedCurrency : "PKR");
        localStorage.removeItem("dwd-currency");
      }
    }

    void loadLocale();
    return () => {
      active = false;
    };
  }, []);

  const setCurrency = useCallback((nextCurrency: CurrencyCode) => {
    setCurrencyState(nextCurrency);
    localStorage.setItem(currencyPreferenceKey(country), nextCurrency);
    if (nextCurrency !== "PKR" && !rates[nextCurrency]) {
      setRateError(`No current ${nextCurrency} exchange rate is available.`);
    } else {
      setRateError("");
    }
  }, [country, rates]);

  const formatPrice = useCallback((pkrAmount: number) => {
    if (currency === "PKR") return formatCurrency(pkrAmount, currency);
    const rate = rates[currency];
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      return rateError ? "Rate unavailable" : "Loading regional rate…";
    }
    return formatCurrency(pkrAmount * 2 * rate, currency, locale);
  }, [currency, rates, rateError, locale]);
  const formatConvertedPKR = useCallback((pkrAmount: number) => {
    if (currency === "PKR") return formatCurrency(pkrAmount, currency, locale);
    const rate = rates[currency];
    if (!rate || !Number.isFinite(rate) || rate <= 0) {
      return rateError ? "Rate unavailable" : "Loading regional rate…";
    }
    return formatCurrency(pkrAmount * rate, currency, locale);
  }, [currency, rates, rateError, locale]);

  const value = useMemo(
    () => ({ currency, setCurrency, rates, rateDate, rateError, locale, formatPrice, formatConvertedPKR }),
    [currency, setCurrency, rates, rateDate, rateError, locale, formatPrice, formatConvertedPKR]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error("useCurrency must be used inside CurrencyProvider.");
  return context;
}
