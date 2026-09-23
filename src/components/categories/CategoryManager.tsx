import { useState } from "react";
import { useCategoryStore } from "@/store/categoryStore";
import { useActivityStore } from "@/store/activityStore";
import { replaceAllData } from "@/store/replaceAllData";
import { ColorPicker } from "./ColorPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  exportData,
  parseImportData,
  downloadJson,
} from "@/utils/exportImport";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Pencil, X } from "lucide-react";
import { CategoryDot } from "./CategoryBadge";
import type { Activity, Category } from "@/types";
import { SHORTCUTS } from "@/hooks/useShortcuts";

type PendingImport = {
  fileName: string;
  activities: Activity[];
  categories: Category[];
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function CategoryRow({
  cat,
  isFirst,
  isLast,
  onMove,
  onDelete,
}: {
  cat: Category;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  const updateCategory = useCategoryStore((s) => s.updateCategory);
  const toggleHidden = useCategoryStore((s) => s.toggleHidden);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);
  const [color, setColor] = useState(cat.color);

  const startEdit = () => {
    setName(cat.name);
    setColor(cat.color);
    setEditing(true);
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed !== cat.name || color !== cat.color) {
      updateCategory(cat.id, { name: trimmed, color });
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className="space-y-3"
        style={{ padding: 12, margin: "4px 0", borderRadius: 12, border: "1px solid var(--ink-faint)" }}
      >
        <input
          value={name}
          aria-label="Category name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              e.stopPropagation(); // close the editor, not the whole dialog
              setEditing(false);
            }
          }}
          className="field w-full"
          autoFocus
        />
        <ColorPicker value={color} onChange={setColor} />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={!name.trim()}>
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg hover:bg-muted/60"
      style={{ padding: "2px 4px", opacity: cat.isHidden ? 0.55 : 1 }}
    >
      <button
        className="icon-btn"
        style={{ width: 26, height: 26 }}
        onClick={() => onMove("up")}
        disabled={isFirst}
        aria-label={`Move ${cat.name} up`}
      >
        <ChevronUp size={14} />
      </button>
      <button
        className="icon-btn"
        style={{ width: 26, height: 26, marginLeft: -6 }}
        onClick={() => onMove("down")}
        disabled={isLast}
        aria-label={`Move ${cat.name} down`}
      >
        <ChevronDown size={14} />
      </button>
      <CategoryDot color={cat.color} size={10} />
      <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14 }}>
        {cat.name}
        {cat.isHidden && (
          <span style={{ fontSize: 11, color: "var(--ink-muted)", marginLeft: 8 }}>
            hidden
          </span>
        )}
      </span>
      <button
        className="icon-btn"
        style={{ width: 28, height: 28 }}
        onClick={startEdit}
        aria-label={`Rename or recolour ${cat.name}`}
        title="Rename / recolour"
      >
        <Pencil size={13} />
      </button>
      <button
        className="nav-tab"
        style={{ height: 28, fontSize: 12 }}
        onClick={() => toggleHidden(cat.id)}
      >
        {cat.isHidden ? "Show" : "Hide"}
      </button>
      {!cat.isDefault && (
        <button
          className="icon-btn danger"
          style={{ width: 28, height: 28 }}
          onClick={onDelete}
          aria-label={`Delete ${cat.name}`}
          title="Delete category"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function CategoryManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const categories = useCategoryStore((s) => s.categories);
  const addCategory = useCategoryStore((s) => s.addCategory);
  const deleteCategory = useCategoryStore((s) => s.deleteCategory);
  const reorderCategories = useCategoryStore((s) => s.reorderCategories);

  const activities = useActivityStore((s) => s.activities);
  const bulkReassignCategory = useActivityStore((s) => s.bulkReassignCategory);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importing, setImporting] = useState(false);

  const handleAddCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // Categories are identified by colour; the legacy icon field stays empty.
    addCategory(trimmed, newColor, "");
    setNewName("");
    setNewColor("#3B82F6");
    setShowAddForm(false);
  };

  const handleDeleteCategory = (id: string) => {
    bulkReassignCategory(id, "unassigned");
    deleteCategory(id);
    toast("Category deleted. Its tasks moved to Unassigned.");
  };

  const handleExport = () => {
    const data = exportData(activities, categories);
    const date = format(new Date(), "yyyy-MM-dd");
    downloadJson(data, `done-backup-${date}.json`);
    toast("Backup downloaded.");
  };

  // Step 1: read + validate the file. Nothing changes until the user confirms.
  const handleChooseFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      file.text().then((json) => {
        try {
          setPendingImport({ fileName: file.name, ...parseImportData(json) });
        } catch (err) {
          toast.error((err as Error).message);
        }
      });
    };
    input.click();
  };

  // Step 2: replace, only after confirming.
  const handleConfirmImport = async () => {
    if (!pendingImport) return;
    setImporting(true);
    const ok = await replaceAllData(pendingImport.activities, pendingImport.categories);
    setImporting(false);
    if (ok) {
      toast(`Imported ${plural(pendingImport.activities.length, "task")}.`);
      setPendingImport(null);
    }
  };

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

  const moveCategory = (id: string, direction: "up" | "down") => {
    const ids = sorted.map((c) => c.id);
    const index = ids.indexOf(id);
    if (direction === "up" && index > 0) {
      [ids[index], ids[index - 1]] = [ids[index - 1], ids[index]];
    } else if (direction === "down" && index < ids.length - 1) {
      [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    }
    reorderCategories(ids);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPendingImport(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto font-body">
        <DialogHeader>
          <DialogTitle className="font-display font-normal" style={{ fontSize: 20 }}>
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>
              Categories
            </div>
            <div>
              {sorted.map((cat, i) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  isFirst={i === 0}
                  isLast={i === sorted.length - 1}
                  onMove={(direction) => moveCategory(cat.id, direction)}
                  onDelete={() => handleDeleteCategory(cat.id)}
                />
              ))}
            </div>
          </div>

          {showAddForm ? (
            <div
              className="space-y-3"
              style={{ padding: 14, borderRadius: 12, border: "1px solid var(--ink-faint)" }}
            >
              <input
                placeholder="Category name"
                aria-label="New category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                className="field w-full"
                autoFocus
              />
              <div>
                <div className="section-label" style={{ marginBottom: 6 }}>
                  Colour
                </div>
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCategory}>
                  Add category
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              + New category
            </Button>
          )}

          <div style={{ borderTop: "1px solid var(--ink-faint)", paddingTop: 16 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>
              Backup
            </div>
            {pendingImport ? (
              <div
                role="alertdialog"
                aria-label="Confirm import"
                style={{ padding: 14, borderRadius: 12, border: "1px solid var(--danger)" }}
              >
                <p style={{ fontSize: 13, lineHeight: 1.5 }}>
                  Replace your {plural(activities.length, "task")} and{" "}
                  {plural(categories.length, "category", "categories")} with{" "}
                  <strong style={{ fontWeight: 500 }}>
                    {plural(pendingImport.activities.length, "task")} and{" "}
                    {plural(pendingImport.categories.length, "category", "categories")}
                  </strong>{" "}
                  from {pendingImport.fileName}?
                </p>
                <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
                  <Button variant="outline" size="sm" onClick={handleExport} disabled={importing}>
                    Download current first
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleConfirmImport} disabled={importing}>
                    {importing ? "Importing…" : "Replace"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPendingImport(null)} disabled={importing}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  Export JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleChooseFile}>
                  Import JSON
                </Button>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--ink-faint)", paddingTop: 16 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>
              Keyboard
            </div>
            <dl className="grid gap-y-1.5" style={{ gridTemplateColumns: "auto 1fr", columnGap: 12, fontSize: 13 }}>
              {SHORTCUTS.map(({ keys, label }) => (
                <div key={label} className="contents">
                  <dt>
                    <kbd
                      style={{
                        fontFamily: "inherit",
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 6,
                        border: "1px solid var(--ink-faint)",
                        background: "var(--bg)",
                      }}
                    >
                      {keys}
                    </kbd>
                  </dt>
                  <dd style={{ color: "var(--ink-muted)" }}>{label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
