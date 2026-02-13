import { useState } from "react";
import { useCategoryStore } from "@/store/categoryStore";
import { useActivityStore } from "@/store/activityStore";
import { ColorPicker } from "./ColorPicker";
import { EmojiPicker } from "./EmojiPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [newIcon, setNewIcon] = useState("*");
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addCategory(trimmed, newColor, newIcon);
    setNewName("");
    setNewColor("#3B82F6");
    setNewIcon("*");
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
    downloadJson(data, `task-shuffler-backup-${date}.json`);
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
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Categories</h3>
          <div className="space-y-2">
            {sorted.map((cat, i) => (
              <div
                key={cat.id}
                className="flex items-center gap-1.5 py-1.5 px-2 rounded-md hover:bg-muted/50"
              >
                <div className="flex flex-col">
                  <button
                    onClick={() => moveCategory(cat.id, "up")}
                    disabled={i === 0}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                  >
                    {"▲"}
                  </button>
                  <button
                    onClick={() => moveCategory(cat.id, "down")}
                    disabled={i === sorted.length - 1}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-20 leading-none"
                  >
                    {"▼"}
                  </button>
                </div>
                <span>{cat.icon}</span>
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="flex-1 text-sm">{cat.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => toggleHidden(cat.id)}
                >
                  {cat.isHidden ? "Show" : "Hide"}
                </Button>
                {!cat.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive"
                    onClick={() => handleDeleteCategory(cat.id)}
                  >
                    {"✕"}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {showAddForm ? (
            <div className="space-y-3 p-3 border rounded-md">
              <Input
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8"
              />
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Color
                </label>
                <ColorPicker value={newColor} onChange={setNewColor} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Icon
                </label>
                <EmojiPicker value={newIcon} onChange={setNewIcon} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddCategory}>
                  Add Category
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              + Add Category
            </Button>
          )}

          <hr className="border-border" />

          <h3 className="text-sm font-semibold">Data</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport}>
              Import JSON
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
