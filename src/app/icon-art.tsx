// Shared art for the favicon/app icon: a teh tarik glass on mamak teal
export function IconArt({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#2f8f86",
        borderRadius: size * 0.22,
        fontSize: size * 0.68,
      }}
    >
      🍵
    </div>
  );
}
