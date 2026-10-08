// App icon: a chunky yellow play button on ink, matching the PLAY logo
export function IconArt({ size }: { size: number }) {
  const tri = size * 0.36;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1f1a17",
        borderRadius: size * 0.22,
      }}
    >
      <div
        style={{
          width: 0,
          height: 0,
          marginLeft: tri * 0.25,
          borderTop: `${tri * 0.62}px solid transparent`,
          borderBottom: `${tri * 0.62}px solid transparent`,
          borderLeft: `${tri}px solid #fcd34d`,
        }}
      />
    </div>
  );
}
