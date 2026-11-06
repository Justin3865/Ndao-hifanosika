"use client";

import { useEffect } from "react";

import { useI18n } from "@/components/i18n/I18nProvider";
import { translatePhrase } from "@/lib/i18n/phrases.mg";

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT"]);

/**
 * Traduit TOUT le texte français de l'interface en malgache quand la langue est « mg », sans modifier un seul composant :
 * il remplace les textes exacts connus (phrases.mg.ts) puis restaure le français si on rebascule. Un texte inconnu reste en français.
 * Monté une seule fois dans le layout (voir appliquer-malagasy.py). `data-no-translate` exclut une zone.
 */
export function AutoTranslate() {
  const { lang } = useI18n();

  useEffect(() => {
    const originals = new WeakMap<Node, string>();
    const attrOriginals = new WeakMap<Element, Record<string, string>>();
    let busy = false;

    const text = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || SKIP.has(parent.tagName) || parent.closest("[data-no-translate]")) return;
      const current = node.nodeValue ?? "";
      const base = originals.get(node);
      if (lang === "mg") {
        const src = base !== undefined && translatePhrase(base) === current ? base : current;
        const next = translatePhrase(src);
        if (next !== current) {
          originals.set(node, src);
          node.nodeValue = next;
        }
      } else if (base !== undefined) {
        node.nodeValue = base;
        originals.delete(node);
      }
    };

    const attrs = (el: Element) => {
      if (el.closest("[data-no-translate]")) return;
      const saved = attrOriginals.get(el) ?? {};
      for (const a of ATTRS) {
        const cur = el.getAttribute(a);
        if (cur === null) continue;
        if (lang === "mg") {
          const src = saved[a] !== undefined && translatePhrase(saved[a]!) === cur ? saved[a]! : cur;
          const next = translatePhrase(src);
          if (next !== cur) {
            saved[a] = src;
            el.setAttribute(a, next);
          }
        } else if (saved[a] !== undefined) {
          el.setAttribute(a, saved[a]!);
          delete saved[a];
        }
      }
      attrOriginals.set(el, saved);
    };

    const run = (root: Node) => {
      if (busy) return;
      busy = true;
      try {
        if (root.nodeType === Node.TEXT_NODE) return text(root as Text);
        if (root.nodeType !== Node.ELEMENT_NODE) return;
        attrs(root as Element);
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (n.nodeType === Node.TEXT_NODE) text(n as Text);
          else attrs(n as Element);
        }
      } finally {
        busy = false;
      }
    };

    run(document.body);
    if (lang !== "mg") return; // français : on a seulement restauré
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") run(r.target);
        else if (r.type === "attributes") run(r.target);
        else r.addedNodes.forEach((n) => run(n));
      }
    });
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => obs.disconnect();
  }, [lang]);

  return null;
}
