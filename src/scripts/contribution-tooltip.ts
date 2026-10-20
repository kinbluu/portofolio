interface Rectangle {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

// Fixed viewport coordinates keep the tooltip inside the screen, including edge cells.
export function contributionTooltipPosition(
  anchor: Rectangle,
  tooltip: Size,
  viewport: Size,
) {
  const inset = 8;
  const gap = 8;
  const center = anchor.left + anchor.width / 2;
  const left = Math.max(
    inset,
    Math.min(
      center - tooltip.width / 2,
      viewport.width - tooltip.width - inset,
    ),
  );
  const above = anchor.top - tooltip.height - gap;
  const side = above >= inset ? "top" : "bottom";
  const preferredTop =
    side === "top" ? above : anchor.top + anchor.height + gap;
  const top = Math.max(
    inset,
    Math.min(preferredTop, viewport.height - tooltip.height - inset),
  );
  const arrowX = Math.max(
    inset,
    Math.min(center - left, tooltip.width - inset),
  );

  return { left, top, arrowX, side };
}
