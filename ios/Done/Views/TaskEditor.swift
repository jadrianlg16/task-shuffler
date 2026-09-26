import DoneCore
import SwiftUI

/// Edit a task: name, estimate and category, plus Start, Done and Delete.
struct TaskEditor: View {
    @Environment(LibraryStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let taskId: String

    @State private var name = ""
    @State private var minutesInput = ""
    @State private var categoryId = TaskCategory.unassignedId
    @State private var loaded = false
    @State private var confirmDelete = false

    private var task: TaskItem? { store.library.task(id: taskId) }
    private var minutes: Int? { Int(minutesInput.filter(\.isNumber)).flatMap { $0 > 0 ? $0 : nil } }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Task name", text: $name)
                        .font(.body)
                        .submitLabel(.done)
                        .onSubmit {
                            guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                            save()
                            dismiss()
                        }
                        .accessibilityIdentifier("editName")
                }

                Section("Time") {
                    HStack {
                        TextField("Minutes", text: $minutesInput)
                            .keyboardType(.numberPad)
                            .accessibilityIdentifier("editMinutes")
                        Text("min").foregroundStyle(Palette.inkMuted)
                    }
                    HStack(spacing: 6) {
                        ForEach([5, 15, 30, 60, 90], id: \.self) { preset in
                            Chip(isOn: minutes == preset, action: { minutesInput = minutes == preset ? "" : "\(preset)" }) {
                                Text("\(preset)m")
                            }
                        }
                    }
                    .listRowBackground(Color.clear)
                }

                Section("Category") {
                    Picker("Category", selection: $categoryId) {
                        ForEach(store.library.sortedCategories.filter { !$0.isHidden || $0.id == categoryId }) { category in
                            HStack {
                                CategoryDot(color: category.color)
                                Text(category.name)
                            }
                            .tag(category.id)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }

                if let task, task.status == .active {
                    Section {
                        if !task.isStarted {
                            Button {
                                save()
                                store.start(task.id)
                                dismiss()
                            } label: {
                                Label("Start now", systemImage: "play.fill")
                            }
                        }
                        Button {
                            save()
                            store.complete(task.id)
                            dismiss()
                        } label: {
                            Label("Mark done", systemImage: "checkmark")
                        }
                        Button(role: .destructive) {
                            confirmDelete = true
                        } label: {
                            Label("Delete task", systemImage: "trash")
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Palette.background)
            .navigationTitle("Edit task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        save()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    .accessibilityIdentifier("editSave")
                }
            }
            .confirmationDialog("Delete this task?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    store.delete(taskId)
                    dismiss()
                }
            } message: {
                Text("You can undo right after.")
            }
            .onAppear(perform: loadTask)
            .tint(Palette.accent)
        }
    }

    private func loadTask() {
        guard !loaded, let task else { return }
        loaded = true
        name = task.name
        minutesInput = task.durationMinutes.map { String($0) } ?? ""
        categoryId = task.categoryId
    }

    private func save() {
        store.updateTask(id: taskId, name: name, durationMinutes: minutes, categoryId: categoryId)
    }
}
