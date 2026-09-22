import { useState } from "react";
import { useCategoryStore } from "@/store/categoryStore";
import { useActivityStore } from "@/store/activityStore";
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
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { CategoryDot } from "./CategoryBadge";

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
  const toggleHidden = useCategoryStore((s) => s.toggleHidden);
  const importCategories = useCategoryStore((s) => s.importCategories);
  const reorderCategories = useCategoryStore((s) => s.reorderCategories);

  const activities = useActivityStore((s) => s.activities);
  const bulkReassignCategory = useActivityStore(
    (s) => s.bulkReassignCategory
  );
  const importActivities = useActivityStore((s) => s.importActivities);

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3B82F6");
  const [showAddForm, setShowAddForm] = useState(false);

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
    toast("Category deleted. Activities moved to Unassigned.");
  };

  const handleExport = () => {
    const data = exportData(activities, categories);
    const date = format(new Date(), "yyyy-MM-dd");
    downloadJson(data, `done-backup-${date}.json`);
    toast("Data exported!");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = ev.target?.result as string;
          const { activities: importedActs, categories: importedCats } =
            parseImportData(json);
          importActivities(importedActs);
          importCategories(importedCats);
          toast("Data imported successfully!");
        } catch {
          toast("Failed to import data. Check the file format.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-lg hover:bg-muted/60"
                  style={{ padding: "2px 4px", opacity: cat.isHidden ? 0.55 : 1 }}
                >
                  <button
                    className="icon-btn"
                    style={{ width: 26, height: 26 }}
                    onClick={() => moveCategory(cat.id, "up")}
                    disabled={i === 0}
                    aria-label={`Move ${cat.name} up`}
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    style={{ width: 26, height: 26, marginLeft: -6 }}
                    onClick={() => moveCategory(cat.id, "down")}
                    disabled={i === sorted.length - 1}
                    aria-label={`Move ${cat.name} down`}
                  >
                    <ChevronDown size={14} />
                  </button>
                  <CategoryDot color={cat.color} size={10} />
                  <span className="flex-1" style={{ fontSize: 14 }}>
                    {cat.name}
                    {cat.isHidden && (
                      <span style={{ fontSize: 11, color: "var(--ink-muted)", marginLeft: 8 }}>
                        hidden
                      </span>
                    )}
                  </span>
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
                      onClick={() => handleDeleteCategory(cat.id)}
                      aria-label={`Delete ${cat.name}`}
                      title="Delete category"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
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
                aria-label="Category name"
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleImport}>
                Import JSON
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
