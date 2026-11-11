"use client";

import { Fragment, ReactNode } from "react";
import { useAmountsHidden } from "./useAmountsHidden";

/**
 * Re-rend toute la page quand on affiche / masque les montants : les fonctions de formatage
 * (fmtMoney, formatCurrency…) relisent alors l'état courant.
 */
export function AmountsBoundary({ children }: { children: ReactNode }) {
  const hidden = useAmountsHidden();
  return <Fragment key={hidden ? "hidden" : "visible"}>{children}</Fragment>;
}
