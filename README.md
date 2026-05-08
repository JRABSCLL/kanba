# OrganizAPP

Internal project management and production control system for managing your organization's projects and external agency work.

**Tech Stack:** Next.js 16, React 19, Supabase, TypeScript, Tailwind CSS, shadcn/ui, @hello-pangea/dnd

## Features

- **Projects Management** — Internal projects with team collaboration via `project_members`, configurable kanban columns
- **Agency Production Control** — Track deliverables from external agencies with configurable workflow stages (no file uploads)
- **User Management** — Admin controls for activation, roles, and permissions (`is_active` + `role`)
- **Real-time Sync** — Supabase row-level security (RLS) ensures members see only their projects/agencies
- **Drag & Drop Kanban** — Move items between workflow stages with @hello-pangea/dnd
- **Dark/Light Mode** — Full theme support

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account (for database and auth)

### Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd organizapp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment Setup:**
Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side)

4. **Run Development Server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Architecture

### Database Structure (Supabase)

**Usuarios internos:**
- `profiles` — Users (is_active, role)
- `projects` — Internal projects
- `project_members` — User-to-project associations
- `columns` — Kanban columns per project

**Agencias externas:**
- `agencies` — Provider data (name, type, status)
- `agency_members` — Multiple contacts per agency
- `production_plans` — Production schedules per agency
- `production_plan_items` — Individual items in plans
- `production_plan_stages` — Configurable workflow stages per plan
- `production_stage_templates` — Reusable stage templates
- `production_deliverables` — Deliverables with stage tracking (no files)
- `brands` — Brands to assign to deliverables

### Access Control

- **Admins** (`is_active=true && role='admin'`) — Access all modules, manage users and agencias
- **Members** (`is_active=true && role='member'`) — See only projects they're assigned to, read-only access to agencies
- **Inactive** (`is_active=false`) — Blocked from dashboard, redirected to `/pending`

### Key Features

1. **Projects** — Collaborate with internal team, customizable kanban columns with drag & drop
2. **Agency Production** — Track external deliverables with configurable workflow stages (no file uploads)
3. **Workflow Stages** — Each project and plan has its own customizable stages:
   - Predefined templates: Standard, Video, Social Media, Design
   - Create/edit/delete stages with custom colors
   - Auto-create stages for existing plans on first load
4. **Agency Members** — Manage multiple contacts per agency (director, account manager, designer)
5. **Drag & Drop** — Move tasks/deliverables between stages using @hello-pangea/dnd
4. **Admin Console** — Activate users, assign roles, manage permissions
5. **User Search** — Assign internal supervisors to agency deliverables

See [ORGANIZAPP_CONTEXT.md](ORGANIZAPP_CONTEXT.md) for complete architecture and changelog.

## License

Private - Internal use only
