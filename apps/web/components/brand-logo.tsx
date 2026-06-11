import Image from "next/image";

import { cn } from "@/lib/utils";

const logoSizes = {
  sm: "h-5 w-5 rounded-md",
  md: "h-6 w-6 rounded-md",
  lg: "h-8 w-8 rounded-lg",
} as const;

export function BrandLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof logoSizes;
  className?: string;
}) {
  return (
    <Image
      src="/brand/logo.png"
      alt=""
      aria-hidden="true"
      width={64}
      height={64}
      priority={size === "lg"}
      className={cn("shrink-0 object-contain", logoSizes[size], className)}
    />
  );
}
