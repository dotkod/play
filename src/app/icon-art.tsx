// App icon: "KL" for Kuala Lepak, yellow on ink with a red underline
export function IconArt({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#1f1a17",
        borderRadius: size * 0.22,
      }}
    >
      <span style={{ fontFamily: "Baloo", color: "#fcd34d", fontSize: size * 0.56, fontWeight: 800, lineHeight: 1, letterSpacing: -size * 0.02 }}>KL</span>
      <span style={{ width: size * 0.42, height: size * 0.06, background: "#d8352a", borderRadius: size * 0.03, marginTop: size * 0.03 }} />
    </div>
  );
}
