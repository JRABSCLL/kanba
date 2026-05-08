# OrganizAPP

Internal project management and production control system for managing your organization's projects and external agency work.

**Tech Stack:** Next.js 13, React 18, Supabase, TypeScript, Tailwind CSS, shadcn/ui

## Features

- **Projects Management** — Internal projects with team collaboration via `project_members`
- **Agency Production Control** — Track deliverables from external agencies without file uploads (state-based tracking only)
- **User Management** — Admin controls for activation, roles, and permissions (`is_active` + `role`)
- **Real-time Sync** — Supabase row-level security (RLS) ensures members see only their projects
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

**Agencias externas (sin login):**
- `agencies` — Provider data (name, type, status)
- `agency_members` — Multiple contacts per agency (director, account manager, designer, etc.)
- `production_plans` — Production schedules per agency
- `production_plan_items` — Individual items in plans
- `production_deliverables` — State-tracked deliverables
- `brands` — Brands to assign to deliverables

### Access Control

- **Admins** (`is_active=true && role='admin'`) — Access all modules, manage users and agencias
- **Members** (`is_active=true && role='member'`) — See only projects they're assigned to, read-only access to agencies
- **Inactive** (`is_active=false`) — Blocked from dashboard, redirected to `/pending`

### Key Features

1. **Projects** — Collaborate with internal team using `project_members`
2. **Agency Production** — Track external deliverables by state (no file uploads)
3. **Agency Members** — Manage multiple contacts per agency (director, account manager, designer)
4. **Admin Console** — Activate users, assign roles, manage permissions
5. **User Search** — Assign internal supervisors to agency deliverables

See [ORGANIZAPP_CONTEXT.md](ORGANIZAPP_CONTEXT.md) for complete architecture and changelog.

## License

Private - Internal use only
