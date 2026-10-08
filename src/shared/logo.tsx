// Kuala Lepak wordmark: small red KUALA stacked over a big yellow LEPAK, both outlined in ink
const SIZES = {
  sm: { kuala: "text-[11px] [-webkit-text-stroke:4px_#1f1a17]", lepak: "text-2xl", stroke: "[-webkit-text-stroke:4px_#1f1a17]" },
  hud: { kuala: "text-sm [-webkit-text-stroke:6px_#1f1a17]", lepak: "text-[34px]", stroke: "[-webkit-text-stroke:6px_#1f1a17]" },
  // KUALA gets a thinner stroke so it stays readable when the start screen shrinks on phones
  lg: { kuala: "text-[clamp(1.6rem,4.5vh,2.4rem)] [-webkit-text-stroke:7px_#1f1a17]", lepak: "text-[clamp(3.6rem,15vh,8.5rem)]", stroke: "[-webkit-text-stroke:10px_#1f1a17]" },
  poster: { kuala: "text-[44px] [-webkit-text-stroke:12px_#1f1a17]", lepak: "text-[120px]", stroke: "[-webkit-text-stroke:12px_#1f1a17]" },
} as const;

export function Logo({ size = "sm", className = "" }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size];
  return (
    <span className={`flex flex-col leading-[0.85] font-extrabold tracking-wide ${className}`} aria-label="Kuala Lepak">
      <span className={`${s.kuala} relative z-10 text-chili [paint-order:stroke_fill]`}>KUALA</span>
      <span className={`${s.lepak} ${s.stroke} text-amber-300 [paint-order:stroke_fill]`}>LEPAK</span>
    </span>
  );
}
