import { NextRequest, NextResponse } from "next/server";
import { currencyForCountry } from "@/lib/currency";
import { getExchangeRateSnapshot } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const snapshot = await getExchangeRateSnapshot();
    const country = request.headers.get("x-vercel-ip-country")?.toUpperCase() || "PK";

    return NextResponse.json(
      {
        country,
        currency: currencyForCountry(country),
        rates: snapshot.rates,
        updatedAt: snapshot.updatedAt,
        rateSource: "ExchangeRate-API, refreshed daily",
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Locale and exchange-rate lookup failed", error);
    return NextResponse.json(
      { success: false, error: "Regional currency rates are temporarily unavailable." },
      { status: 503 }
    );
  }
}
