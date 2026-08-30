const EXAM_DATE = new Date("2027-03-01");

function daysRemaining(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = EXAM_DATE.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function App() {
  const days = daysRemaining();
  return (
    <main style={{
      margin: 0, padding: 0, minHeight: "100vh",
      background: "#0A0E12", display: "flex",
      flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      color: "#E6EDF3"
    }}>
      <div style={{ fontSize: "11px", letterSpacing: "0.14em", color: "#7D8B99", marginBottom: "12px" }}>
        SOCIOLOGY · DAYS TO EXAM
      </div>
      <div style={{ fontSize: "96px", lineHeight: 1, color: "#5FD3F3" }}>
        {days}
      </div>
      <div style={{ fontSize: "13px", color: "#7D8B99", marginTop: "12px" }}>
        {days === 0 ? "exam day" : days === 1 ? "one day remaining" : "days remaining"}
      </div>
    </main>
  );
}