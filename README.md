# OrganizAPP

Internal project management and production control system for managing your organization's projects and external agency work.

**Tech Stack:** Next.js 13, React 18, Supabase, TypeScript, Tailwind CSS, shadcn/ui

## Features

- **Projects Management** — Organize and track internal projects
- **Agency Production Control** — Manage and monitor deliverables from external agencies
- **Team Collaboration** — Assign tasks, collaborate on projects
- **User Management** — Admin controls for user activation and roles
- **Real-time Updates** — Instant sync across team members
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

### Database (Supabase)

- **profiles** — User accounts (is_active, role: 'admin' | 'member')
- **teams** — Organizational groups (internal, agencies, clients, etc.)
- **team_members** — User-to-team associations
- **projects** — Internal projects
- **project_members** — User-to-project associations
- **agencies** — External agency information (no login)
- **production_plans** — Plans for agency deliverables
- **production_deliverables** — Individual tasks/items from agencies

### Access Control

- **Admin users** (`role='admin' && is_active=true`) — Full access to all modules
- **Regular members** (`role='member' && is_active=true`) — Only see projects/teams they belong to
- **Inactive users** (`is_active=false`) — Blocked from dashboard

### Modules

1. **Dashboard** — Overview of projects and tasks
2. **Projects** — Manage internal projects
3. **Agency Production** — Control external agency work
4. **Admin Users** — Manage team members (activate/deactivate, assign roles)

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

See [ORGANIZAPP_CONTEXT.md](ORGANIZAPP_CONTEXT.md) for detailed architecture documentation.

## License

Private - Internal use only
