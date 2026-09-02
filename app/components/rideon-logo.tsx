import Link from "next/link";

type RideOnLogoProps = {
  compact?: boolean;
  href?: string;
};

export function RideOnLogo({ compact = false, href }: RideOnLogoProps) {
  const mark = (
    <span
      className="inline-flex items-center gap-2 text-xl font-black italic leading-none tracking-[0.04em] text-foreground"
      aria-label="RideOn"
    >
      <span className="grid size-7 place-items-center bg-primary text-sm not-italic text-primary-foreground">
        R
      </span>
      {!compact && (
        <span>
          RIDE<span className="text-primary">ON</span>
        </span>
      )}
    </span>
  );

  return href ? <Link href={href}>{mark}</Link> : mark;
}
