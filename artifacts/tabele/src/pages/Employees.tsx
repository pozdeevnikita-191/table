import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  getListEmployeesQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { getInitials, EMPLOYEE_COLORS } from "@/lib/utils";
import { Link } from "wouter";

function EmployeeModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: { name: string; position: string; color: string };
  onSave: (data: { name: string; position: string; color: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [color, setColor] = useState(initial?.color ?? EMPLOYEE_COLORS[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), position: position.trim(), color }); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">{initial ? "Редактировать сотрудника" : "Новый сотрудник"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Имя</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Фамилия Имя" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Должность</label>
            <input type="text" value={position} onChange={e => setPosition(e.target.value)} placeholder="Монтажник" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Цвет</label>
            <div className="flex gap-2 flex-wrap">
              {EMPLOYEE_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-7 h-7 rounded-full border-2 transition-all" style={{ background: c, borderColor: c === color ? "white" : "transparent", outline: c === color ? `2px solid ${c}` : "none" }} />
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Отмена</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useListEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<(typeof employees)[0] | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: getListEmployeesQueryKey() });

  async function handleAdd(data: { name: string; position: string; color: string }) {
    await createEmployee.mutateAsync({ data });
    await invalidate();
  }

  async function handleEdit(data: { name: string; position: string; color: string }) {
    if (!editing) return;
    await updateEmployee.mutateAsync({ id: editing.id, data });
    await invalidate();
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить сотрудника?")) return;
    await deleteEmployee.mutateAsync({ id });
    await invalidate();
  }

  return (
    <Layout title="Сотрудники" actions={
      <button onClick={() => setShowAdd(true)} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
        + Добавить
      </button>
    }>
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {employees.map(emp => (
            <div key={emp.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <Link href={`/employees/${emp.id}`}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity" style={{ background: emp.color + "22", color: emp.color }}>
                    {getInitials(emp.name)}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/employees/${emp.id}`}>
                    <h4 className="text-sm font-semibold truncate cursor-pointer hover:text-primary transition-colors">{emp.name}</h4>
                  </Link>
                  <p className="text-xs text-muted-foreground">{emp.position || "Сотрудник"}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(emp)} className="text-muted-foreground hover:text-foreground text-xs px-1.5 py-1 rounded hover:bg-muted transition-colors">✏</button>
                  <button onClick={() => handleDelete(emp.id)} className="text-muted-foreground hover:text-destructive text-xs px-1.5 py-1 rounded hover:bg-destructive/10 transition-colors">✕</button>
                </div>
              </div>
              <Link href={`/employees/${emp.id}`}>
                <div className="mt-3 pt-3 border-t border-border cursor-pointer">
                  <div className="text-xs text-muted-foreground">Нажмите для просмотра статистики</div>
                </div>
              </Link>
            </div>
          ))}
          <button
            onClick={() => setShowAdd(true)}
            className="bg-card border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all min-h-[140px]"
          >
            <span className="text-2xl">+</span>
            <span className="text-sm font-medium">Новый сотрудник</span>
          </button>
        </div>
      )}

      {showAdd && <EmployeeModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editing && <EmployeeModal initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </Layout>
  );
}
