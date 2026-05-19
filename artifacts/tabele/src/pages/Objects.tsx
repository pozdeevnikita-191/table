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

function ObjectModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: { name: string; code: string; status: string };
  onSave: (data: { name: string; code: string; status: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [code, setCode] = useState(initial?.code ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), code: code.trim() || "-", status }); onClose(); }
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

  const invalidate = () => qc.invalidateQueries({ queryKey: getListObjectsQueryKey() });

  const entryCountByObject = (id: number) =>
    entries.filter(e => e.type === "work" && (e.segments as Array<{ objectId: number }>).some(s => s.objectId === id)).length;

  async function handleAdd(data: { name: string; code: string; status: string }) {
    await createObject.mutateAsync({ data });
    await invalidate();
  }
  async function handleEdit(data: { name: string; code: string; status: string }) {
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
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {objects.map(obj => (
            <div key={obj.id} className="bg-card border border-border rounded-xl p-3.5 shadow-sm flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#2c5f8a" strokeWidth={1.8} className="w-4 h-4">
                  <polygon points="3 9 12 2 21 9 21 20 3 20" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold leading-snug break-words">{obj.name}</h4>
                {obj.code && obj.code !== "-" && <div className="text-xs text-muted-foreground font-mono mt-0.5">ЛЗ: {obj.code}</div>}
                <div className="flex items-center gap-2 mt-1.5">
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
          ))}
          <button
            onClick={() => setShowAdd(true)}
            className="bg-card border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all min-h-[88px]"
          >
            <span className="text-2xl">+</span>
            <span className="text-sm font-medium">Новый объект</span>
          </button>
        </div>
      )}

      {showAdd && <ObjectModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <ObjectModal initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </Layout>
  );
}
