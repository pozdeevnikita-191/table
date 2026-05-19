import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListObjects,
  useListEntries,
  useCreateObject,
  useUpdateObject,
  useDeleteObject,
  getListObjectsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";

const CATEGORIES = [
  { value: "standard", label: "Стандартный", color: "bg-primary/10 text-primary border-primary/30" },
  { value: "regular",  label: "Регулярный",  color: "bg-orange-100 text-orange-700 border-orange-300" },
];

function categoryMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? CATEGORIES[0];
}

function ObjectModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: { name: string; code: string; status: string; category?: string };
  onSave: (data: { name: string; code: string; status: string; category: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [category, setCategory] = useState(initial?.category ?? "standard");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), code: code.trim() || "-", status, category }); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-card rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">{initial ? "Редактировать объект" : "Новый объект"}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Название</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Название объекта"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Код ЛЗ</label>
            <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="5114"
              className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>

          {/* Категория */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Категория</label>
            <div className="flex gap-2">
              {CATEGORIES.map(({ value, label }) => (
                <button key={value} onClick={() => setCategory(value)}
                  className={["flex-1 py-2.5 text-sm rounded-lg border font-medium transition-all",
                    category === value
                      ? value === "regular"
                        ? "border-orange-400 bg-orange-100 text-orange-700"
                        : "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-muted-foreground"
                  ].join(" ")}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Статус */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Статус</label>
            <div className="flex gap-2">
              {[["active", "Активный"], ["closed", "Закрыт"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setStatus(val)}
                  className={["flex-1 py-2.5 text-sm rounded-lg border font-medium transition-all",
                    status === val ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                  ].join(" ")}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Objects() {
  const qc = useQueryClient();
  const { data: objects = [], isLoading } = useListObjects();
  const { data: entries = [] } = useListEntries();
  const createObject = useCreateObject();
  const updateObject = useUpdateObject();
  const deleteObject = useDeleteObject();

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<(typeof objects)[0] | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const invalidate = () => qc.invalidateQueries({ queryKey: getListObjectsQueryKey() });

  const entryCountByObject = (id: number) =>
    entries.filter(e => e.type === "work" && (e.segments as Array<{ objectId: number }>).some(s => s.objectId === id)).length;

  const filtered = objects.filter(o => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || o.name.toLowerCase().includes(q) || (o.code && o.code !== "-" && o.code.toLowerCase().includes(q));
    const matchCat = filterCategory === "all" || (o as any).category === filterCategory;
    return matchSearch && matchCat;
  });

  const regularCount = objects.filter(o => (o as any).category === "regular").length;
  const standardCount = objects.filter(o => (o as any).category !== "regular").length;

  async function handleAdd(data: { name: string; code: string; status: string; category: string }) {
    await createObject.mutateAsync({ data });
    await invalidate();
  }
  async function handleEdit(data: { name: string; code: string; status: string; category: string }) {
    if (!editing) return;
    await updateObject.mutateAsync({ id: editing.id, data });
    await invalidate();
  }
  async function handleDelete(id: number) {
    if (!confirm("Удалить объект?")) return;
    await deleteObject.mutateAsync({ id });
    await invalidate();
  }

  return (
    <Layout title="Объекты" actions={
      <button onClick={() => setShowAdd(true)} className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
        + Добавить
      </button>
    }>
      <div className="p-3 md:p-6 space-y-3">
        {/* Поиск */}
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или номеру ЛЗ..."
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm bg-card shadow-sm focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs">✕</button>
          )}
        </div>

        {/* Фильтр по категории */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCategory("all")}
            className={["px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              filterCategory === "all" ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50"
            ].join(" ")}>
            Все <span className="opacity-70 ml-1">{objects.length}</span>
          </button>
          <button onClick={() => setFilterCategory("standard")}
            className={["px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              filterCategory === "standard" ? "border-primary bg-primary text-white" : "border-border hover:border-primary/50"
            ].join(" ")}>
            Стандартные <span className="opacity-70 ml-1">{standardCount}</span>
          </button>
          <button onClick={() => setFilterCategory("regular")}
            className={["px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              filterCategory === "regular" ? "border-orange-500 bg-orange-500 text-white" : "border-orange-200 text-orange-700 hover:border-orange-400"
            ].join(" ")}>
            🔁 Регулярные <span className="opacity-70 ml-1">{regularCount}</span>
          </button>
        </div>

        {search && (
          <p className="text-xs text-muted-foreground">
            {filtered.length === 0 ? "Ничего не найдено" : `Найдено: ${filtered.length} из ${objects.length}`}
          </p>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(obj => {
              const cat = categoryMeta((obj as any).category ?? "standard");
              const isRegular = (obj as any).category === "regular";
              return (
                <div key={obj.id} className={["bg-card border rounded-xl p-3.5 shadow-sm flex items-start gap-3 transition-colors",
                  isRegular ? "border-orange-200 hover:border-orange-300" : "border-border hover:border-primary/30"
                ].join(" ")}>
                  <div className={["w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                    isRegular ? "bg-orange-100" : "bg-primary/10"
                  ].join(" ")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={isRegular ? "#c2410c" : "#2c5f8a"} strokeWidth={1.8} className="w-4 h-4">
                      <polygon points="3 9 12 2 21 9 21 20 3 20" /><polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold leading-snug break-words">{obj.name}</h4>
                    {obj.code && obj.code !== "-" && <div className="text-xs text-muted-foreground font-mono mt-0.5">ЛЗ: {obj.code}</div>}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {isRegular && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                          🔁 Регулярный
                        </span>
                      )}
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${obj.status === "active" ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                        {obj.status === "active" ? "Активный" : "Закрыт"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{entryCountByObject(obj.id)} зап.</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => setEditing(obj)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors text-xs">✏</button>
                    <button onClick={() => handleDelete(obj.id)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors text-xs">✕</button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => setShowAdd(true)}
              className="bg-card border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all min-h-[88px]"
            >
              <span className="text-2xl">+</span>
              <span className="text-sm font-medium">Новый объект</span>
            </button>
          </div>
        )}
      </div>

      {showAdd && <ObjectModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <ObjectModal initial={{ ...editing, category: (editing as any).category ?? "standard" }} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </Layout>
  );
}
