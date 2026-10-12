"use client";
import { useEffect, useRef } from "react";

/**
 * Aksesibilitas modal tanpa mengubah markup: taruh `<DialogA11y onClose={...} />`
 * sebagai anak pertama panel modal. Komponen ini menandai parent-nya sebagai dialog,
 * memindahkan fokus ke dalam modal, menahan Tab agar berputar di dalam, menutup
 * modal dengan Escape, dan mengembalikan fokus ke elemen semula saat ditutup.
 * Modal yang bertumpuk (mis. konfirmasi di atas form) hanya yang paling atas yang
 * bereaksi terhadap Escape/Tab.
 */
const stack: HTMLElement[] = [];
const FIELD = 'input:not([disabled]):not([type="hidden"]):not([readonly]), select:not([disabled]), textarea:not([disabled])';
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DialogA11y({ onClose, label }: { onClose: () => void; label?: string }) {
  const markerRef = useRef<HTMLSpanElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const panel = markerRef.current?.parentElement;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panel.setAttribute("role", panel.getAttribute("role") ?? "dialog");
    panel.setAttribute("aria-modal", "true");
    if (label) panel.setAttribute("aria-label", label);
    if (!panel.hasAttribute("tabindex")) panel.setAttribute("tabindex", "-1");
    stack.push(panel);

    // Fokus awal: [data-autofocus] → kolom isian pertama → elemen fokus pertama (mis. "Batal") → panel.
    const initial =
      panel.querySelector<HTMLElement>("[autofocus], [data-autofocus]") ??
      panel.querySelector<HTMLElement>(FIELD) ??
      panel.querySelector<HTMLElement>(FOCUSABLE) ??
      panel;
    if (!panel.contains(document.activeElement)) initial.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== panel) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (items.length === 0) { e.preventDefault(); return; }
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.lastIndexOf(panel);
      if (i >= 0) stack.splice(i, 1);
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus({ preventScroll: true });
    };
  }, [label]);

  return <span ref={markerRef} hidden />;
}
