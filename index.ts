/**
 * Shared Catalog Import Module
 *
 * This module provides reusable components and utilities for catalog import
 * functionality. It is designed to be shared between Admin-Dashboard and Frontend
 * applications via git subtree.
 *
 * Usage:
 * ```tsx
 * import {
 *   CatalogImportWizard,
 *   ColumnMappingStep,
 *   useCatalogImport,
 *   initializeColumnMapping,
 * } from './shared/catalog-import';
 * ```
 */

// Types
export type {
  CatalogImportMode,
  CatalogImportKind,
  ScreeningMode,
  PlateFormat,
  ColumnMappingKind,
  ColumnMappingEntry,
  ColumnMapping,
  HeaderPreviewColumn,
  HeaderPreviewResponse,
  CatalogImportError,
  CatalogImportProgress,
  CatalogImportStatus,
  CatalogImportConfig,
  StartCatalogImportParams,
  ValidationResult,
  MappingOptionGroup,
} from "./types";

// Constants
export {
  MAPPING_LABELS,
  BUILDING_BLOCK_OPTIONS,
  SCREENING_COMPOUND_OPTIONS,
  PLATE_FORMAT_OPTIONS,
} from "./types";

// Hook
export {
  useCatalogImport,
  type CatalogImportApiConfig,
} from "./useCatalogImport";

// Components
export {
  ColumnMappingStep,
  initializeColumnMapping,
  validateMapping,
  type ColumnMappingStepProps,
} from "./ColumnMappingStep";

export {
  CatalogImportWizard,
  type CatalogImportWizardProps,
} from "./CatalogImportWizard";
