// Kuala Lepak wordmark: small red KUALA stacked over a big yellow LEPAK, both outlined in ink
const SIZES = {
  sm: { kuala: "text-[11px]", lepak: "text-2xl", stroke: "[-webkit-text-stroke:4px_#1f1a17]" },
  hud: { kuala: "text-sm", lepak: "text-[34px]", stroke: "[-webkit-text-stroke:6px_#1f1a17]" },
  lg: { kuala: "text-[clamp(1.2rem,4.5vh,2.4rem)]", lepak: "text-[clamp(3.6rem,15vh,8.5rem)]", stroke: "[-webkit-text-stroke:10px_#1f1a17]" },
  poster: { kuala: "text-[44px]", lepak: "text-[120px]", stroke: "[-webkit-text-stroke:12px_#1f1a17]" },
} as const;

export function Logo({ size = "sm", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span className={`flex flex-col leading-[0.85] font-extrabold tracking-wide ${className}`} aria-label="Kuala Lepak">
      <span className={`${s.kuala} ${s.stroke} text-chili [paint-order:stroke_fill]`}>KUALA</span>
      <span className={`${s.lepak} ${s.stroke} text-amber-300 [paint-order:stroke_fill]`}>LEPAK</span>
    </span>
  );
}
