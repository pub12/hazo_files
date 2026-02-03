# hazo_files - AI Agent Notes

Notes for Claude and other AI assistants working on this package.

## Package Overview

hazo_files is a universal file management package with:
- Multiple storage backends (local, Google Drive)
- Database tracking via hazo_connect
- Naming convention system
- LLM extraction integration
- React UI components

## Key Architecture Decisions

### 1. Three Entry Points

- `hazo_files` - Core exports, works everywhere
- `hazo_files/ui` - React components (client-safe)
- `hazo_files/server` - Server-only exports with factory

### 2. Result Pattern

All operations return `OperationResult<T>`:
```typescript
{ success: boolean; data?: T; error?: string; }
```

### 3. Hash Algorithm

Using xxHash (via xxhash-wasm) for file change detection:
- Non-cryptographic, optimized for speed
- Falls back to FNV-1a if wasm not available
- Hash stored in `file_hash` column

### 4. Naming Conventions

Each convention contains BOTH file and folder patterns in `naming_value` JSON.
The `naming_type` field indicates primary use but doesn't restrict patterns.

### 5. Scopes

`scope_id` in naming table links to `hazo_scopes` from hazo_auth.
Represents multi-tenant organizational units. NULL = global.

## Common Tasks

### Adding a New Storage Provider

1. Create class in `src/modules/{provider}/`
2. Extend `BaseStorageModule`
3. Implement `StorageModule` interface
4. Add to `src/modules/index.ts`
5. Add types to `src/types/index.ts`

### Adding Database Columns

1. Update `src/types/metadata.ts` interfaces
2. Update `src/schema/index.ts` DDL and columns array
3. Update relevant service methods
4. Update test-app schema

### Adding UI Components

1. Create component in `src/ui/components/`
2. Export from `src/ui/index.ts`
3. Follow existing patterns (props interface, JSDoc)

## Testing

```bash
# Unit tests
npm run test

# Test app
npm run dev:test-app
```

## Build

```bash
npm run build  # Builds main, ui, and server entry points
```

## Dependencies

**Runtime:**
- googleapis (Google Drive API)
- ini (config file parsing)
- xxhash-wasm (file hashing)

**Peer (optional):**
- react, react-dom (UI components)
- @dnd-kit/* (drag-and-drop)
- hazo_connect, hazo_config, hazo_logs, hazo_llm_api (integrations)

## File Locations

- Types: `src/types/`
- Schema: `src/schema/index.ts`
- Services: `src/services/`
- Common utilities: `src/common/`
- UI components: `src/ui/components/`
- Server entry: `src/server/`
