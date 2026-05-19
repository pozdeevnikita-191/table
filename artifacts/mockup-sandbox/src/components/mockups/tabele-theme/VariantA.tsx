
// Вариант A — Чёрный монохром (thelight.pro aesthetic)
// Pure near-black, near-invisible borders, zero radius, wide letter-spacing

const BG = "#0b0b0b";
const SIDEBAR = "#080808";
const CARD = "#111111";
const BORDER = "#1c1c1c";
const TEXT = "#e4e4e4";
const MUTED = "#5a5a5a";
const PRIMARY = "#4e8fc7";
const ORANGE = "#c87941";

const NAV_ITEMS = [
  { label: "Дашборд",        active: true },
  { label: "Заполнить день", active: false },
  { label: "Записи",         active: false },
  { label: "Сотрудники",     active: false },
  { label: "Объекты",        active: false },
];
const NAV_ANALYTIC = [
  { label: "Отчёты", active: false },
];

const ACTIVITY = [
  { day: "1",  h: 8,  ot: 0 },
  { day: "3",  h: 10, ot: 2 },
  { day: "5",  h: 8,  ot: 0 },
  { day: "7",  h: 9,  ot: 1 },
  { day: "8",  h: 8,  ot: 0 },
  { day: "10", h: 11, ot: 3 },
  { day: "12", h: 8,  ot: 0 },
  { day: "14", h: 8,  ot: 0 },
  { day: "15", h: 10, ot: 2 },
  { day: "17", h: 8,  ot: 0 },
  { day: "19", h: 9,  ot: 1 },
  { day: "21", h: 8,  ot: 0 },
  { day: "22", h: 11, ot: 3 },
];

const TOP_OBJECTS = [
  { name: "Объект A-24",   hours: 86 },
  { name: "Объект Б-11",   hours: 62 },
  { name: "Объект В-07",   hours: 44 },
  { name: "Стройплощадка", hours: 30 },
];

function DashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 15, height: 15 }}>
      <rect x="3" y="3" width="7" height="7" rx="0.5" />
      <rect x="14" y="3" width="7" height="7" rx="0.5" />
      <rect x="3" y="14" width="7" height="7" rx="0.5" />
      <rect x="14" y="14" width="7" height="7" rx="0.5" />
    </svg>
  );
}
function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 15, height: 15 }}>
      <rect x="3" y="4" width="18" height="18" rx="0.5" /><line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 15, height: 15 }}>
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 15, height: 15 }}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function BldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 15, height: 15 }}>
      <polygon points="3 9 12 2 21 9 21 20 3 20" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function BarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} style={{ width: 15, height: 15 }}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

const NAV_ICONS = [DashIcon, CalIcon, ListIcon, UsersIcon, BldIcon];
const ANA_ICONS = [BarIcon];

const maxH = Math.max(...ACTIVITY.map(d => d.h + d.ot));

export function VariantA() {
  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: BG,
      fontFamily: "'Inter', system-ui, sans-serif", color: TEXT,
      fontSize: 13,
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 210, minWidth: 210, background: SIDEBAR,
        borderRight: `1px solid ${BORDER}`,
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: "22px 20px 18px",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", color: TEXT }}>TABЕЛЬ</div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 3, letterSpacing: "0.12em", textTransform: "uppercase" }}>Учёт рабочего времени</div>
        </div>

        {/* Nav section: Основное */}
        <div style={{ padding: "20px 0 0" }}>
          <div style={{ padding: "0 20px 8px", fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Основное
          </div>
          {NAV_ITEMS.map((item, i) => {
            const Icon = NAV_ICONS[i];
            return (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 20px",
                background: item.active ? `${PRIMARY}12` : "transparent",
                borderLeft: `2px solid ${item.active ? PRIMARY : "transparent"}`,
                color: item.active ? PRIMARY : MUTED,
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: item.active ? 500 : 400,
                letterSpacing: "0.02em",
                transition: "all 0.15s",
              }}>
                <Icon />
                {item.label}
              </div>
            );
          })}
        </div>

        {/* Nav section: Аналитика */}
        <div style={{ padding: "16px 0 0" }}>
          <div style={{ padding: "0 20px 8px", fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Аналитика
          </div>
          {NAV_ANALYTIC.map((item, i) => {
            const Icon = ANA_ICONS[i];
            return (
              <div key={item.label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 20px",
                background: "transparent",
                borderLeft: "2px solid transparent",
                color: MUTED,
                cursor: "pointer",
                fontSize: 12.5,
                letterSpacing: "0.02em",
              }}>
                <Icon />
                {item.label}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, marginLeft: 210, display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Header */}
        <header style={{
          background: SIDEBAR,
          borderBottom: `1px solid ${BORDER}`,
          padding: "0 28px",
          height: 52,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 9,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em" }}>ДАШБОРД</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{
              padding: "5px 14px", fontSize: 11, background: "transparent",
              border: `1px solid ${BORDER}`, color: MUTED, cursor: "pointer",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>← Пред.</button>
            <span style={{ fontSize: 12, fontWeight: 600, minWidth: 110, textAlign: "center" }}>Май 2026</span>
            <button style={{
              padding: "5px 14px", fontSize: 11, background: "transparent",
              border: `1px solid ${BORDER}`, color: MUTED, cursor: "pointer",
              letterSpacing: "0.08em", textTransform: "uppercase",
            }}>След. →</button>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: "28px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            {[
              { label: "Часов", value: "312", sub: "за месяц", accent: PRIMARY },
              { label: "Переработки", value: "48", sub: "ч за месяц", accent: ORANGE },
              { label: "Рабочих дней", value: "26", sub: "в месяце", accent: null },
              { label: "Объектов", value: "12", sub: "активных", accent: null },
            ].map((card) => (
              <div key={card.label} style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                padding: "16px 18px",
                position: "relative",
              }}>
                {card.accent && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    height: 2, background: card.accent,
                  }} />
                )}
                <div style={{ fontSize: 9, fontWeight: 600, color: MUTED, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 10 }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: card.accent ?? TEXT, lineHeight: 1 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Activity bar chart */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}` }}>
            <div style={{
              padding: "14px 18px",
              borderBottom: `1px solid ${BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: TEXT }}>Активность по дням</span>
              <div style={{ display: "flex", gap: 16, fontSize: 10, color: MUTED }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 2, background: PRIMARY, display: "inline-block" }} />
                  Осн.
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 10, height: 2, background: ORANGE, display: "inline-block" }} />
                  Перераб.
                </span>
              </div>
            </div>
            <div style={{ padding: "18px", display: "flex", alignItems: "flex-end", gap: 5, height: 120 }}>
              {ACTIVITY.map(d => (
                <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", gap: 1, flex: 1, justifyContent: "flex-start" }}>
                    {d.ot > 0 && (
                      <div style={{
                        width: "100%",
                        height: `${(d.ot / maxH) * 80}px`,
                        background: ORANGE,
                        opacity: 0.85,
                      }} />
                    )}
                    <div style={{
                      width: "100%",
                      height: `${(d.h / maxH) * 80}px`,
                      background: PRIMARY,
                      opacity: 0.9,
                    }} />
                  </div>
                  <div style={{ fontSize: 9, color: MUTED, marginTop: 4 }}>{d.day}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom row: top objects + recent */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Top objects */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${BORDER}`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: TEXT }}>Топ объектов</span>
              </div>
              <div style={{ padding: "12px 0" }}>
                {TOP_OBJECTS.map((obj, i) => (
                  <div key={obj.name} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 18px",
                    borderBottom: i < TOP_OBJECTS.length - 1 ? `1px solid ${BORDER}` : "none",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: TEXT, marginBottom: 4 }}>{obj.name}</div>
                      <div style={{
                        height: 2, background: BORDER, borderRadius: 0, overflow: "hidden",
                        width: 80,
                      }}>
                        <div style={{ width: `${(obj.hours / 86) * 100}%`, height: "100%", background: PRIMARY }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{obj.hours}ч</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent entries */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}` }}>
              <div style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${BORDER}`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: TEXT }}>Последние записи</span>
              </div>
              <div style={{ padding: "12px 0" }}>
                {[
                  { name: "Петров А.", date: "19 мая", hours: 10, ot: 2 },
                  { name: "Иванов С.", date: "19 мая", hours: 8,  ot: 0 },
                  { name: "Сидоров К.", date: "18 мая", hours: 11, ot: 3 },
                  { name: "Козлов Д.", date: "18 мая", hours: 8,  ot: 0 },
                ].map((e, i, arr) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 18px",
                    borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none",
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: TEXT }}>{e.name}</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{e.date}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{e.hours}ч</span>
                      {e.ot > 0 && (
                        <span style={{ fontSize: 10, color: ORANGE, display: "block" }}>+{e.ot} перераб.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
