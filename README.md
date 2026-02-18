# Shared Catalog Import

Shared catalog import components, hooks, and types for the Chemveric frontend and admin-dashboard applications.

## Usage

This package is used as a git submodule in both:

- `frontend` - Main customer-facing application
- `Admin-Dashboard` - Internal admin application

### Adding to a project

```bash
git submodule add https://github.com/Chemveric/shared-catalog-import.git src/shared/catalog-import
```

### Updating the submodule

```bash
git submodule update --remote src/shared/catalog-import
```

## Contents

- **types.ts** - TypeScript types for column mapping, import configuration, etc.
- **ColumnMappingStep.tsx** - Column mapping UI component
- **CatalogImportWizard.tsx** - Full import wizard component
- **useCatalogImport.ts** - React hook for managing import state
- **index.ts** - Re-exports all public APIs

## Making Changes

1. Make changes in this repository
2. Commit and push to `main`
3. In frontend/admin-dashboard, update the submodule:
   ```bash
   cd src/shared/catalog-import
   git pull origin main
   cd ../../..
   git add src/shared/catalog-import
   git commit -m "chore: update shared-catalog-import submodule"
   ```
