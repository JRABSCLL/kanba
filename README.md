# OrganizAPP

OrganizAPP is an internal project and production management system by SAIA LABS, adapted from the open-source Kanba project.

It keeps the core Kanban/project-management experience while adding internal access control, user approval workflows, and operational modules for SAIA LABS use cases.

## Product direction

OrganizAPP is not only a generic Kanban board. It is evolving into an internal operations platform for:

- project tracking;
- approved-user access control;
- team collaboration;
- agency and provider production control;
- creative/content deliverable follow-up;
- internal dashboards and accountability.

## Agency Production Module

A new product module is being specified for controlling agencies, providers, and external collaborators without turning OrganizAPP into a file-upload system.

Read the full product and technical guide here:

- [Agency Production Module](./docs/agency-production-module.md)

Important principles for this module:

- Do not hardcode agencies, quantities, statuses, or deliverable types.
- Do not require file uploads; each deliverable may use an optional external link.
- Use Kanban as one view, but also provide table/list and dashboard views.
- Support multiple agencies with different production commitments.
- Treat Supabase as the likely source of truth and audit the real database before changing schema/RLS.
- Do not work on `main`; use the v0/harambless branch unless explicitly instructed otherwise.

## Current stack

- Next.js
- React
- Tailwind CSS
- shadcn/ui
- Supabase
- Prisma schema present, but verify against the real Supabase schema before relying on it
- Stripe integration from the original Kanba base, currently optional depending on OrganizAPP operations

## Development

Create `.env.local` from `.env.example` and configure the Supabase project and other optional services.

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Deployment

The project can be deployed on Vercel. Configure environment variables through Vercel dashboard or CLI.

## Supabase caution

Before making Supabase changes, inspect the real database:

- tables;
- columns;
- views;
- RPCs/functions;
- triggers;
- RLS policies.

Do not run destructive migrations or `prisma db push` without confirming that Prisma matches the real Supabase database.

## Original Kanba context

This project was adapted from Kanba, an open-source lightweight Trello alternative built with Tailwind CSS, shadcn/ui, Supabase, and Stripe integration.
