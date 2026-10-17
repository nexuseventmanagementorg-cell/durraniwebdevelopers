import { formatCurrency, isCurrencyCode } from "@/lib/currency";
import type { CalculatorLead } from "@/lib/types";

export interface CalculatorLeadFollowupTemplate {
  id: "phase-one" | "understand-needs" | "estimate-summary";
  label: string;
  message: string;
}

export function buildCalculatorLeadFollowups(lead: CalculatorLead): CalculatorLeadFollowupTemplate[] {
  const currency = isCurrencyCode(lead.currency) ? lead.currency : "PKR";
  const price = formatCurrency(lead.recommendation.calculation.estimatedTotal, currency, lead.locale);
  const name = lead.name.trim();
  const greeting = lead.language === "roman-ur"
    ? `Assalam-o-Alaikum${name ? ` ${name}` : ""}!`
    : `Hello${name ? ` ${name}` : ""},`;

  if (lead.language === "roman-ur") {
    return [
      {
        id: "phase-one",
        label: "Budget ke mutabiq pehla phase",
        message: `${greeting} Aapne ${lead.recommendation.title} ka taqreeban ${price} estimate dekha tha. Agar poora scope abhi budget mein fit nahi hota, hum pehle sirf zaroori features ka chhota phase plan karne par baat kar sakte hain; baqi features baad mein add ho sakte hain. Is se scope aur total bhi badlega, jo hum pehle clear karenge. Kya aap apni sab se zaroori 1 ya 2 cheezein batayenge? Koi pressure nahi.`,
      },
      {
        id: "understand-needs",
        label: "Zaroorat samajhne ka follow-up",
        message: `${greeting} Aapne calculator mein ${lead.goal} ka option chuna tha. Agar website ke features ke naam samajhna mushkil ho, bas apne business ka kaam aur jo masla hal karna hai woh aam alfaaz mein bata dein. Hum pehle aapke budget ke andar mumkin options samjhayenge; ghair-zaroori extras shamil nahi karenge.`,
      },
      {
        id: "estimate-summary",
        label: "Estimate aur shamil cheezon ki wazahat",
        message: `${greeting} Aapka saved starting estimate ${price} hai aur is mein ${lead.recommendation.included.slice(0, 2).join(" aur ")} shamil hain. ${lead.recommendation.notIncluded[0] || "Baaki requirements final scope mein confirm hongi."} Agar aap chahein to hum estimate ko aapki asal zaroorat ke mutabiq dobara dekh sakte hain.`,
      },
    ];
  }

  return [
    {
      id: "phase-one",
      label: "Start with a budget-fit first phase",
      message: `${greeting} You viewed an estimated ${price} plan for ${lead.recommendation.title}. If the full scope does not fit your budget right now, we can discuss starting with only the most important features and leaving the rest for a later phase. The scope and total would change, and we would confirm both with you first. What are your top one or two needs? No pressure either way.`,
    },
    {
      id: "understand-needs",
      label: "Help clarify what the business needs",
      message: `${greeting} You selected ${lead.goal} in the calculator. If the feature names were unclear, just describe what your business does and what you want to make easier. We can explain options that fit your budget first, without adding extras you do not need.`,
    },
    {
      id: "estimate-summary",
      label: "Explain the estimate and inclusions",
      message: `${greeting} Your saved starting estimate is ${price}. It includes ${lead.recommendation.included.slice(0, 2).join(" and ")}. ${lead.recommendation.notIncluded[0] || "Other requirements can be confirmed in the final scope."} We can review the estimate around your actual needs if that would help.`,
    },
  ];
}