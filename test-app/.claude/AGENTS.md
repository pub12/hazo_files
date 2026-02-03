# hazo_files Test App - AI Agent Notes

Notes for Claude and other AI assistants working on the test application.

## Purpose

This is a Next.js app that demonstrates and tests all hazo_files features:
- File browsing (local and Google Drive)
- Naming rule configuration
- Naming convention management
- File metadata tracking
- Upload with extraction workflow

## Tech Stack

- Next.js 14+ (App Router)
- React 18
- Tailwind CSS (with shadcn/ui components)
- SQLite via hazo_connect
- TypeScript

## Project Structure

```
test-app/
├── app/
│   ├── api/                    # API routes
│   │   ├── files/              # File operations
│   │   ├── auth/google/        # Google OAuth
│   │   └── naming-conventions/ # Naming CRUD
│   ├── local/                  # Local files browser
│   ├── google-drive/           # Google Drive browser
│   ├── naming-config/          # NamingRuleConfigurator demo
│   ├── naming-conventions/     # Convention manager page
│   ├── naming-test/            # Name generation testing
│   ├── file-metadata/          # Metadata viewer
│   ├── upload-extract/         # Upload workflow demo
│   └── settings/               # App settings
├── config/
│   └── database.ts             # Database initialization
├── lib/
│   ├── hazo-files.ts           # FileBrowser API adapter
│   ├── naming-conventions.ts   # Naming API adapter
│   └── file-manager.ts         # Server-side file manager
└── components/ui/              # shadcn/ui components
```

## Database

SQLite database at `./data/hazo_files.sqlite` with tables:
- `hazo_files` - File metadata tracking
- `hazo_files_naming` - Naming conventions

Initialize via `initializeDatabase()` in `config/database.ts`.

## Key Files

- `config/database.ts` - Database setup and CRUD services
- `lib/file-manager.ts` - Server-side TrackedFileManager singleton
- `lib/hazo-files.ts` - Client-side FileBrowser API adapter
- `lib/naming-conventions.ts` - Client-side naming API adapter

## Running

```bash
# From hazo_files root
npm run dev:test-app

# Or from test-app directory
npm run dev
```

## Environment Variables

Create `.env.local` with:

```env
# Enable database tracking
HAZO_FILES_DB_ENABLED=true

# Google Drive (optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

## Common Tasks

### Adding a New Demo Page

1. Create page in `app/{page-name}/page.tsx`
2. Add to navigation in `app/components/Sidebar.tsx`
3. Add API route if needed in `app/api/`

### Updating Database Schema

1. Modify schema strings in `config/database.ts`
2. Delete `./data/hazo_files.sqlite` to recreate
3. Restart the app

### Testing New hazo_files Features

1. Build hazo_files: `npm run build` (from root)
2. Test in test-app: `npm run dev` (from test-app)
3. Import from hazo_files (uses built package)

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/files` | GET | List, tree, metadata |
| `/api/files` | POST | Create, delete, rename, move |
| `/api/files/upload` | POST | File upload |
| `/api/files/download` | GET | File download |
| `/api/files/preview` | GET | File preview |
| `/api/naming-conventions` | GET/POST | List/create conventions |
| `/api/naming-conventions/[id]` | GET/PUT/DELETE | Single convention ops |
| `/api/naming-conventions/[id]/duplicate` | POST | Duplicate convention |
| `/api/auth/google/*` | Various | Google OAuth flow |
