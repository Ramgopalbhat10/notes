import { cn } from "@/lib/utils";
import { getProviderAccentClass, getProviderInitials } from "./utils";

type ProviderAvatarProps = {
  provider: string;
  size?: "sm" | "md";
  className?: string;
};

// Small circular provider glyph. The initial is drawn on a deterministic tint
// derived from the provider string, so the same provider always renders with
// the same color in the trigger, filter row, and list rows.
export function ProviderAvatar({
  provider,
  size = "sm",
  className,
}: ProviderAvatarProps) {
  const accent = getProviderAccentClass(provider);
  const initial = getProviderInitials(provider);
  const sizeClass =
    size === "md"
      ? "h-5 w-5 text-[10px]"
      : "h-4 w-4 text-[9px]";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold leading-none",
        sizeClass,
        accent,
        className,
      )}
    >
      {initial}
    </span>
  );
}
