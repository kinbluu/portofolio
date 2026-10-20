// Mobile: the launcher sits over content, so tuck it away while reading (scrolling down).
// Returns undefined for jitter under `threshold` px, so the caller keeps its current state.
export function launcherHidden(lastY: number, y: number, panelOpen: boolean, threshold = 8) {
  if (Math.abs(y - lastY) < threshold) return undefined;
  return y > lastY && y > 200 && !panelOpen;
}
