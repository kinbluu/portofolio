import { OverlayScrollbars } from "overlayscrollbars";

for (const target of document.querySelectorAll<HTMLElement>("[data-overlayscrollbars-initialize]:not(html)")) {
  OverlayScrollbars(
    { target, cancel: { nativeScrollbarsOverlaid: true } },
    { scrollbars: { theme: "os-theme-rm3", autoHide: "move", autoHideSuspend: true } },
  );
}
