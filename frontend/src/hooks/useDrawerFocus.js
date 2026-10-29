import { useEffect } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Keyboard focus for a slide-in drawer: moves focus into the panel when it opens, keeps Tab / Shift+Tab
// inside it while open, and returns focus to whatever opened it (the menu or filter button) on close.
const useDrawerFocus = (open, panelRef) => {
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const opener = document.activeElement;
    panel.querySelector(FOCUSABLE)?.focus();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open, panelRef]);
};

export default useDrawerFocus;
