"use client";

import { useSyncExternalStore } from "react";
import { areAmountsHidden, subscribeAmounts } from "@/lib/privacy";

/** Hook : true = montants masqués (côté serveur : toujours masqué, pour éviter tout écart à l'hydratation). */
export function useAmountsHidden(): boolean {
  return useSyncExternalStore(subscribeAmounts, areAmountsHidden, () => true);
}
