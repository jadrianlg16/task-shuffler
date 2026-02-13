use docker compose to develop this project.

Task Shuffler Web Application - Requirements Document
Overview
A web-based task management application that organizes activities by category and allows users to randomly select tasks based on available time and preferences.
Core Features
1. Activity Categories
The application will organize tasks into categories with flexibility for user customization:
Default Categories
School Activities - Academic and education-related tasks
Personal Activities - Self-care, errands, and personal matters
Business Activities - Work and professional tasks
Hobby Activities - Leisure and recreational pursuits
Field Activities - Outdoor or location-specific tasks
Unassigned - Activities not yet categorized or that don't fit other categories
Custom Categories
Users can create their own custom categories
Add unlimited custom categories based on personal needs
Rename or delete custom categories (default categories can be hidden but not deleted)
Examples: Family, Health, Creative Projects, Side Hustle, Learning, etc.
2. Activity Management
Adding Activities
Each activity entry includes:
Activity Name (required) - Description of the task
Time Duration (optional) - Estimated time to complete the activity (can be left blank for flexible timing)
Category (optional) - One of the default or custom categories, or leave unassigned
Users can quick-add activities without assigning a category (automatically goes to "Unassigned")
Bulk category assignment for multiple activities at once
Editing Activities
Modify activity name, duration, or category at any time
Move activities between categories with drag-and-drop or dropdown selection
Duplicate activities to create similar tasks quickly
Bulk edit multiple activities simultaneously
Completing and Managing Activities
Mark activities as complete with a single click/tap
Completed activities automatically move to an Archive section
View archived (completed) activities separately from active list
Permanently delete activities from the archive
Restore archived activities back to active list if needed
Bulk operations available for completing multiple activities
Viewing Activities
Display all active activities across all categories
View activities filtered by one or multiple specific categories
View only unassigned activities
Show activity name, duration (if specified), and category for each entry
Sort options: by name, by duration, by category, by date added
Toggle between list view and category-grouped view
Separate view for archived (completed) activities
3. Activity Selection Methods
Random Shuffle Feature
Users can randomly select an activity through:
Shuffle All Lists - Randomly pick from all categories combined
Shuffle Single Category - Randomly pick from a specific category only
Shuffle Multiple Selected Categories - Choose 2+ categories to shuffle from
Shuffle Unassigned Only - Random selection from uncategorized activities
UI/UX Note: Shuffle should feature a fun, quick casino-style roulette wheel animation that cycles through activity names before landing on the selected task, making the selection process engaging and exciting
Time-Based Filtering
Users can filter activities by time duration:
Any Time - Include all activities regardless of duration (including those without time specified)
Specific Duration - Set exact time (e.g., "30 minutes")
Time Range - Set a range (e.g., "15-45 minutes")
Maximum Time - Activities that take "X minutes or less"
Minimum Time - Activities that take "at least X minutes"
Activities without time duration can be included or excluded from filtered results
Random selection considers only activities matching the time criteria
Manual Selection
Browse the complete list of activities
Manually choose any activity to work on
Selection independent of shuffle or time features
4. Activity Completion and Archive System
Marking Activities as Complete
Check off activities when finished
Completed activities automatically move to Archive section
Archive is separate from active activity lists
Shuffle and selection tools only work with active (non-archived) activities
Archive Management
View all archived (completed) activities
Restore archived activities back to active list
Permanently delete activities from archive
Bulk operations: restore multiple or delete multiple archived items
Archive preserves original category and time information
User Workflow Examples
Example 1: Quick Random Task with Time Filter
User has 45 minutes available
Sets time filter to "45 minutes or less"
Clicks "Shuffle All Lists"
Casino roulette animation plays, cycling through activity names
System presents a random activity that fits the time constraint
Example 2: Category-Specific Selection
User wants to work on hobby activities
Selects "Hobby Activities" category
Clicks "Shuffle" for that category
Receives a random hobby task with animation
Example 3: Browse and Choose
User opens "View All Activities"
Reviews the complete list across all categories
Manually selects a specific activity to work on
Example 4: Multi-Category Shuffle with Any Time
User wants to mix personal and hobby activities
Selects both "Personal" and "Hobby" categories
Sets time filter to "Any Time"
Clicks "Shuffle Selected Categories"
Gets a random activity from either category, regardless of duration
Example 5: Quick Add to Unassigned
User thinks of a task but isn't sure where it fits
Quick-adds "Research new coffee maker" without selecting category
Activity automatically goes to "Unassigned"
User can categorize it later or shuffle from unassigned activities
Example 6: Completing and Managing Activities
User finishes "Write blog post" activity
Marks it as complete
Activity automatically moves to Archive
User can later view Archive to review completed tasks
From Archive, user can either restore the activity or permanently delete it
Technical Requirements
Data Storage
Store activities with name, duration, category, and completion status
Persist data between sessions
User Interface
Clean, intuitive interface for adding activities
Clear category organization with visual differentiation (colors, icons)
Easy-to-use shuffle and filter controls
Responsive design for desktop and mobile use
Keyboard shortcuts for power users
Functionality
Add new activities to any category or leave unassigned
Create, rename, and manage custom categories
Edit existing activities (name, duration, category)
Mark activities as complete (automatically moves to archive)
Delete activities from archive permanently
Random selection algorithm with casino roulette animation
Flexible time-based filtering (any time, specific, range, min/max)
Display full activity list with multiple view and sort options
Drag-and-drop for organization
Multi-select for bulk operations
Future Enhancement Ideas
Priority levels for activities
Recurring/repeating activities
Activity analytics dashboard
Tags in addition to categories for cross-categorization
Notes or detailed descriptions for activities
Subtasks or checklists within activities
Notifications and reminders
Gamification elements (streaks, achievements, points)




Task Shuffler — Product Requirements Document
Version: 1.0
 Status: Ready for Development
 Target: Solo developer, local-first, cloud-ready

1. Product Vision
A fast, fun task management app that helps you stop overthinking what to do next. Add your tasks, set a time budget, spin the wheel, and get moving. Runs locally with zero dependencies on cloud services — but structured to migrate to cloud hosting when ready.

2. Architecture Decision: Local-First → Cloud
Phase 1 — Local (Ship in days)
Layer
Choice
Why
Frontend
Single-page React app (Vite)
Fast dev, hot reload, tiny bundle
Backend
None — all client-side
Zero setup, runs from npm run dev
Storage
localStorage + JSON export/import
No server, no database, instant persistence
Hosting
localhost:5173
Just open terminal and go

Phase 2 — Cloud Migration (When ready)
Layer
Migrate to
Migration effort
Frontend
Deploy to Vercel / Netlify / Cloudflare Pages
~5 min, zero code changes
Backend
Add optional Express/Fastify API or serverless functions
Only if you need multi-device sync
Storage
Supabase (Postgres + auth) or Firebase
Swap storage adapter; data layer is abstracted
Auth
Supabase Auth / Clerk / Auth.js
Add when multi-user is needed

Key Architectural Principle
Abstract all data access behind a storage adapter interface so you can swap localStorage for an API client later without touching UI code:
interface StorageAdapter {
  getActivities(): Activity[]
  saveActivity(a: Activity): void
  deleteActivity(id: string): void
  getCategories(): Category[]
  saveCategory(c: Category): void
  // ...etc
}

Build LocalStorageAdapter first. Build ApiStorageAdapter in Phase 2. Everything else stays the same.

3. Data Model
type Activity = {
  id: string              // UUID
  name: string            // required
  durationMinutes: number | null  // null = flexible/unspecified
  categoryId: string      // references Category.id, defaults to "unassigned"
  status: "active" | "archived"
  createdAt: string       // ISO timestamp
  completedAt: string | null
}

type Category = {
  id: string              // UUID, or slug for defaults
  name: string
  color: string           // hex color for visual grouping
  icon: string            // emoji or icon identifier
  isDefault: boolean      // true = can hide but not delete
  isHidden: boolean       // hidden categories excluded from views
  sortOrder: number
}

Default Categories (seeded on first launch)
ID
Name
Color


school
School
#3B82F6


personal
Personal
#8B5CF6


business
Business
#F59E0B


hobby
Hobby
#10B981


field
Field
#EF4444


unassigned
Unassigned
#6B7280




4. Feature Specification — MVP (Phase 1)
4.1 Activity CRUD
Add Activity
Inline form at top of list: name (required), duration (optional, in minutes), category (dropdown, defaults to Unassigned)
Press Enter or click Add — single action, no modals for quick-add
"Quick add" mode: just type a name, it goes to Unassigned with no duration
Edit Activity
Click activity name → inline edit (name, duration, category)
Or open a small edit panel/popover for all fields
Drag-and-drop to move between category groups (stretch goal for MVP)
Complete Activity
Single click on checkbox → activity moves to Archive with completedAt timestamp
Brief "undo" toast (3 seconds) in case of accidental completion
Delete Activity
Only available from Archive view
Confirm dialog for permanent deletion
Bulk delete: select multiple → delete all
Restore Activity
From Archive: click restore → moves back to active list, clears completedAt
4.2 Category Management
Custom Categories
Add new categories from a settings panel or inline "+ Category" button
Set name, pick color (from palette or hex input), choose emoji icon
Reorder categories via drag-and-drop or up/down controls
Hide/Show Default Categories
Toggle visibility on default categories (cannot delete)
Hidden categories: activities remain but category is filtered out of selection and views
Delete Custom Categories
Activities in deleted category move to Unassigned automatically
4.3 Activity Views
Main View: Active Activities
Default: grouped by category (collapsible sections, color-coded headers)
Toggle to flat list view
Sort by: name (A-Z), duration (short→long), category, date added (newest first)
Filter by: one or more categories (multi-select chips)
Search: real-time text filter across activity names
Count badge per category
Archive View
Separate tab/section
Shows completed activities with completion date
Bulk restore or bulk delete
Same sort/filter options as active view
4.4 Shuffle System (Core Feature)
This is the star of the app. It should feel fun and satisfying.
Shuffle Scope Options:
All — pick from every active activity across all visible categories
Single Category — pick from one specific category
Multi-Category — select 2+ categories to shuffle from
Unassigned Only — pick from uncategorized activities
Time Filter (applied before shuffle):
Filter
Behavior
Any Time
Include all activities (including those with no duration)
≤ X minutes
Activities with duration ≤ X, optionally include no-duration activities
≥ X minutes
Activities with duration ≥ X
X – Y minutes
Activities with duration in range
Exactly X minutes
Activities with that exact duration

A toggle: "Include activities without a set duration" (default: on)
Shuffle Animation:
Casino-style roulette wheel or slot-machine animation
Cycle through activity names rapidly, then decelerate and land on the selected one
Duration: ~2–3 seconds total (fast enough to not annoy, slow enough to build excitement)
Sound effects: optional, toggleable (subtle tick-tick-tick → ding!)
The selected activity appears highlighted with a brief celebration (confetti burst or glow)
Shuffle Result:
Display the selected activity prominently: name, duration, category badge
Action buttons: "Let's do it!" (marks as current), "Shuffle again", "Pick another way"
Optional: "Not feeling it" button reshuffles excluding that activity for this session
Edge Cases:
0 activities match filters → show friendly message: "No activities match! Try adjusting your filters or adding more tasks."
1 activity matches → skip animation, show it directly with a note
Shuffle algorithm: simple Math.random() on filtered array — no need for complexity
4.5 Manual Selection
Browse the full active list, click any activity to select it
Same result screen as shuffle (with action buttons)
This is just "pick from the list" — no special UI beyond the existing list view

5. UI/UX Design Guidelines
Layout Structure
┌──────────────────────────────────────────────┐
│  🎲 Task Shuffler              [Archive] [⚙] │
├──────────────────────────────────────────────┤
│  ┌─── Shuffle Controls ───────────────────┐  │
│  │ [Scope: All ▼]  [Time: Any ▼]         │  │
│  │         [ 🎰 SHUFFLE! ]               │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌─── Quick Add ──────────────────────────┐  │
│  │ [Activity name...] [Min] [Cat ▼] [+]  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌─── Activities ─────────────────────────┐  │
│  │ [Search...] [Sort ▼] [View: Grid|List] │  │
│  │                                        │  │
│  │ 📚 School (3)                     ▼    │  │
│  │   ☐ Study calculus          45 min     │  │
│  │   ☐ Read chapter 5         30 min     │  │
│  │   ☐ Write essay            60 min     │  │
│  │                                        │  │
│  │ 🎨 Hobby (2)                      ▼    │  │
│  │   ☐ Practice guitar         30 min     │  │
│  │   ☐ Sketch portrait          —         │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘

Design Principles
Fun but functional — the shuffle feature is playful; the task list is clean and scannable
Mobile-first responsive — works great on phone, scales up to desktop
Minimal clicks — quick-add is one field + Enter; complete is one checkbox; shuffle is one button
Color as information — category colors used consistently across badges, headers, borders
Dark mode — support both light and dark; default to system preference
Component Library
Use shadcn/ui (or build lightweight custom components with Tailwind). Key components:
Button, Input, Select, Checkbox, Dialog, Popover, Toast, Tabs
Custom: RouletteWheel, CategoryBadge, ActivityCard, TimeFilter

6. Technical Implementation Plan
Tech Stack
Tool
Purpose
Vite + React 18
App framework
TypeScript
Type safety
Tailwind CSS
Styling
Zustand
State management (lightweight, simple)
Framer Motion
Shuffle animation
uuid
Activity/category IDs
date-fns
Date formatting (lightweight)

Project Structure
task-shuffler/
├── src/
│   ├── components/
│   │   ├── layout/        # Header, Sidebar, MainLayout
│   │   ├── activities/    # ActivityList, ActivityCard, ActivityForm, ArchiveView
│   │   ├── categories/    # CategoryManager, CategoryBadge
│   │   ├── shuffle/       # ShuffleControls, RouletteWheel, ShuffleResult
│   │   └── ui/            # Shared UI primitives (Button, Input, etc.)
│   ├── store/
│   │   ├── activityStore.ts
│   │   └── categoryStore.ts
│   ├── adapters/
│   │   ├── types.ts           # StorageAdapter interface
│   │   └── localStorage.ts   # LocalStorageAdapter implementation
│   ├── utils/
│   │   ├── shuffle.ts     # Random selection logic
│   │   └── filters.ts     # Time-based filtering
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts

Development Milestones
Sprint 1 — Foundation (Day 1–2)
[ ] Project setup: Vite + React + TypeScript + Tailwind
[ ] Data model + Zustand stores with localStorage persistence
[ ] StorageAdapter interface + LocalStorageAdapter
[ ] Seed default categories on first launch
Sprint 2 — Core CRUD (Day 3–4)
[ ] Quick-add activity form
[ ] Activity list with category grouping
[ ] Inline edit for activities
[ ] Complete activity → archive
[ ] Archive view with restore/delete
Sprint 3 — Categories (Day 5)
[ ] Category manager panel (add, edit, reorder, hide)
[ ] Color picker + emoji selection
[ ] Delete custom category → activities move to Unassigned
Sprint 4 — Shuffle (Day 6–7)
[ ] Shuffle scope selector (all, single, multi, unassigned)
[ ] Time filter component
[ ] Shuffle algorithm (filter → random pick)
[ ] Roulette wheel animation (Framer Motion)
[ ] Result screen with action buttons
Sprint 5 — Polish (Day 8–9)
[ ] Search and sort for activity list
[ ] Dark mode toggle
[ ] Responsive mobile layout
[ ] Undo toast on complete
[ ] Empty states and error handling
[ ] JSON export/import for data backup
Sprint 6 — Ship (Day 10)
[ ] Final testing and bug fixes
[ ] Build optimization
[ ] Deploy to Vercel/Netlify for cloud access
[ ] Write minimal README

7. Cloud Migration Checklist (Phase 2)
When you're ready to go multi-device or multi-user:
Set up backend: Supabase project (Postgres + Auth + Realtime) or Express API + SQLite/Postgres
Build ApiStorageAdapter: implements same interface as LocalStorageAdapter but calls API/Supabase
Add auth: Supabase Auth or Clerk — protect user data
Database schema: mirror the TypeScript types as tables
Swap adapter: change one line in your store initialization
Data migration: export localStorage JSON → import into database (one-time script)
Deploy: frontend stays on Vercel/Netlify; backend on Supabase/Railway/Fly.io

8. What's Intentionally Cut from MVP
These are good ideas from your original doc that should wait until the core is solid:
Feature
Why deferred
Drag-and-drop reorder
Nice but not essential for v1; adds complexity
Bulk operations (multi-select)
Add after single-item flows work perfectly
Keyboard shortcuts
Add incrementally based on your own usage
Priority levels
Adds decision complexity; shuffling is the point
Recurring activities
Needs scheduling logic; Phase 2+
Analytics dashboard
Need usage data first
Tags / subtasks / notes
Feature creep — categories are enough for v1
Notifications
Requires backend/service worker; Phase 2
Gamification
Fun but scope creep; consider for v2


9. Success Criteria
The MVP is "done" when you can:
✅ Open the app locally and see your tasks persisted from last session
✅ Add a task in under 3 seconds (name + Enter)
✅ Hit Shuffle and watch the roulette animation pick a task
✅ Filter by time and category before shuffling
✅ Complete tasks and find them in the archive
✅ Create a custom category with its own color/icon
✅ Use it comfortably on your phone
✅ Export your data as JSON backup

