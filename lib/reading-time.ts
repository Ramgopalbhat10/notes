export function computeReadingTimeLabel(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (!words) {
    return "< 1 min";
  }
  const minutes = words / 200;
  if (minutes < 1) {
    return "< 1 min";
  }
  if (minutes < 60) {
    return `${Math.max(1, Math.round(minutes))} min`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1)} hr`;
}
