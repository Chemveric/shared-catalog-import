/**
 * Shared types for catalog import functionality.
 * Used by both Admin-Dashboard and Frontend applications.
 */

// ============================================================================
// Core Import Types
// ============================================================================

export type CatalogImportMode = 'merge' | 'replace';

export type CatalogImportKind = 'BUILDING_BLOCK' | 'SCREENING_COMPOUND';

/**
 * Screening import sub-mode:
 * - COMPOUND_LIST: Unplated screening compound list (no plate fields required)
 * - PLATED_KIT: Pre-plated screening library kit (plate fields required)
 */
export type ScreeningMode = 'COMPOUND_LIST' | 'PLATED_KIT';

/**
 * Plate format for pre-plated screening kits.
 */
export type PlateFormat = 'P96' | 'P384' | 'P1536';

// ============================================================================
// Column Mapping Types
// ============================================================================

/**
 * Column mapping kinds - determines how a file column is interpreted during import.
 * Mirrors backend ColumnMappingKind.
 */
export type ColumnMappingKind =
  // Compound identifiers
  | 'catalogNumber'
  | 'cas'
  | 'inchiKey'
  | 'productName'
  | 'mdlNumber'
  | 'compoundId'
  // Structure
  | 'smiles'
  | 'mdl'
  | 'molfile'
  // Chemistry descriptors
  | 'molFormula'
  | 'molWeight'
  | 'saltData'
  | 'purity'
  | 'chiralPurity'
  // Commercial
  | 'packageSize'
  | 'unitPrice'
  | 'inventoryAvailable'
  | 'leadTime'
  | 'moq'
  // Product info
  | 'vendorName'
  | 'countryOfOrigin'
  | 'storageConditions'
  | 'appearance'
  | 'solubility'
  | 'shelfLife'
  | 'physicalForm'
  | 'notes'
  // Quality & compliance
  | 'sdsAvailable'
  | 'coaAvailable'
  | 'customSynthesis'
  | 'retestOrExpiry'
  | 'hsCode'
  | 'hazmat'
  // Plate map fields (for compound library/kit imports)
  | 'plateId'
  | 'well'
  | 'row'
  | 'column'
  // Library metadata
  | 'libraryName'
  | 'libraryId'
  | 'targetName'
  | 'pathway'
  | 'description'
  | 'moleculeType'
  | 'alias'
  | 'mechanismOfAction'
  // Supply and handling
  | 'concentration'
  | 'volume'
  | 'solvent'
  // Screening annotations
  | 'controlType'
  | 'batchId'
  // Warehouse fields (one warehouse per row)
  | 'warehouseCode'
  | 'warehouseName'
  | 'warehouseCountry'
  | 'warehouseCity'
  | 'warehouseLeadTimeDays'
  | 'warehouseStockQty'
  | 'warehousePrice'
  | 'ignore';

/**
 * Single column mapping entry.
 */
export interface ColumnMappingEntry {
  fileColumn: string;
  mapTo: ColumnMappingKind;
}

/**
 * Column mapping configuration for an import.
 */
export interface ColumnMapping {
  mappings: ColumnMappingEntry[];
}

/**
 * Single column from header preview response.
 */
export interface HeaderPreviewColumn {
  fileColumn: string;
  samples: string[];
}

/**
 * Response from header preview endpoint.
 */
export interface HeaderPreviewResponse {
  columns: HeaderPreviewColumn[];
}

// ============================================================================
// Import Status Types
// ============================================================================

export interface CatalogImportError {
  row: number;
  sku?: string;
  error: string;
}

export interface CatalogImportProgress {
  total: number;
  processed: number;
  inserted: number;
  updated: number;
  errored: number;
  enqueuedAt: string;
  startedAt?: string;
  finishedAt?: string;
  errors?: CatalogImportError[];
}

export interface CatalogImportStatus {
  jobId: string;
  organizationId: string;
  state: 'queued' | 'active' | 'completed' | 'failed';
  progress?: CatalogImportProgress;
  errorsLocation?: string;
  failureReason?: string;
  /** Backend-calculated progress percentage (0-100) */
  progressPct?: number;
  /** Current processing stage */
  stage?: 'parsing' | 'upserting' | 'image_generation' | 'finalizing';
  /** Human-readable progress message from backend */
  message?: string;
}

// ============================================================================
// Import Configuration Types
// ============================================================================

/**
 * Configuration for catalog import wizard.
 */
export interface CatalogImportConfig {
  /** Type of catalog items being imported */
  importKind: CatalogImportKind;
  /** Import mode (merge or replace) */
  importMode: CatalogImportMode;
  /** Screening sub-mode (only when importKind is SCREENING_COMPOUND) */
  screeningMode?: ScreeningMode;
  /** Library name for screening compounds (optional, defaults to filename if blank) */
  libraryName?: string;
  /** Plate format for pre-plated kits (only when screeningMode is PLATED_KIT) */
  plateFormat?: PlateFormat;
  /** Default Plate ID for pre-plated kits (only when screeningMode is PLATED_KIT) */
  defaultPlateId?: string;
}

/**
 * Parameters for starting a catalog import.
 */
export interface StartCatalogImportParams {
  organizationId: string;
  fileId: string;
  mode: CatalogImportMode;
  importKind?: CatalogImportKind;
  columnMapping?: ColumnMapping;
  /** New fields for screening compound imports */
  screeningMode?: ScreeningMode;
  libraryName?: string;
  plateFormat?: PlateFormat;
  defaultPlateId?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result for column mapping.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Grouped Mapping Options
// ============================================================================

export interface MappingOptionGroup {
  group: string;
  options: ColumnMappingKind[];
}

/** Human-readable labels for column mapping kinds */
export const MAPPING_LABELS: Record<ColumnMappingKind, string> = {
  // Compound Identifiers
  catalogNumber: 'Catalog Number',
  cas: 'CAS Number',
  inchiKey: 'InChI Key',
  productName: 'Product Name',
  compoundId: 'Compound ID',
  mdlNumber: 'MDL Number',
  // Plate Map
  plateId: 'Plate ID',
  well: 'Well',
  row: 'Row',
  column: 'Column',
  // Library Metadata
  libraryName: 'Library Name',
  libraryId: 'Library ID',
  targetName: 'Target Name',
  pathway: 'Pathway',
  description: 'Description',
  moleculeType: 'Molecule Type',
  alias: 'Alias',
  mechanismOfAction: 'Mechanism of Action',
  // Structure
  smiles: 'SMILES',
  mdl: 'MDL/Molfile',
  molfile: 'Molfile (.mol)',
  // Chemistry Descriptors
  molFormula: 'Molecular Formula',
  molWeight: 'Molecular Weight',
  saltData: 'Salt Data',
  purity: 'Purity',
  chiralPurity: 'Chiral Purity',
  // Supply & Handling
  concentration: 'Concentration',
  volume: 'Volume',
  solvent: 'Solvent',
  storageConditions: 'Storage Conditions',
  // Commercial
  packageSize: 'Package Size',
  unitPrice: 'Unit Price',
  inventoryAvailable: 'Inventory Available',
  leadTime: 'Lead Time',
  moq: 'MOQ (Min. Order Qty)',
  // Product Info
  vendorName: 'Vendor Name',
  appearance: 'Appearance',
  solubility: 'Solubility',
  shelfLife: 'Shelf Life',
  physicalForm: 'Physical Form',
  notes: 'Notes',
  // Quality & Compliance
  sdsAvailable: 'SDS Available (Y/N)',
  coaAvailable: 'COA Available (Y/N)',
  retestOrExpiry: 'Re-test Date / Expiry',
  customSynthesis: 'Custom Synthesis (Y/N)',
  hsCode: 'HS Code',
  // Screening Annotations
  controlType: 'Control Type',
  batchId: 'Batch ID',
  // Hazard & Operational
  hazmat: 'Hazmat (Yes/No)',
  // Product Metadata
  countryOfOrigin: 'Country of Origin',
  // Warehouse
  warehouseCode: 'Warehouse Code',
  warehouseName: 'Warehouse Name',
  warehouseCountry: 'Warehouse Country',
  warehouseCity: 'Warehouse City',
  warehouseLeadTimeDays: 'Warehouse Lead Time (Days)',
  warehouseStockQty: 'Warehouse Stock Qty',
  warehousePrice: 'Warehouse Price',
  // Other
  ignore: 'Ignore Column',
};

/** Grouped mapping options for BUILDING_BLOCK imports */
export const BUILDING_BLOCK_OPTIONS: MappingOptionGroup[] = [
  {
    group: 'Compound Identifiers',
    options: ['catalogNumber', 'cas', 'inchiKey', 'productName', 'mdlNumber'],
  },
  {
    group: 'Structure',
    options: ['smiles', 'molfile'],
  },
  {
    group: 'Chemistry',
    options: ['molFormula', 'molWeight', 'saltData', 'purity', 'chiralPurity'],
  },
  {
    group: 'Commercial',
    options: ['packageSize', 'unitPrice', 'inventoryAvailable', 'leadTime', 'moq'],
  },
  {
    group: 'Product Info',
    options: [
      'vendorName',
      'countryOfOrigin',
      'storageConditions',
      'appearance',
      'solubility',
      'shelfLife',
      'physicalForm',
      'notes',
    ],
  },
  {
    group: 'Quality & Compliance',
    options: [
      'sdsAvailable',
      'coaAvailable',
      'customSynthesis',
      'retestOrExpiry',
      'hsCode',
      'hazmat',
    ],
  },
  {
    group: 'Warehouses',
    options: [
      'warehouseCode',
      'warehouseName',
      'warehouseCountry',
      'warehouseCity',
      'warehouseLeadTimeDays',
      'warehouseStockQty',
      'warehousePrice',
    ],
  },
  {
    group: 'Other',
    options: ['ignore'],
  },
];

/** Grouped mapping options for SCREENING_COMPOUND imports */
export const SCREENING_COMPOUND_OPTIONS: MappingOptionGroup[] = [
  {
    group: 'Plate Map',
    options: ['plateId', 'well', 'row', 'column'],
  },
  {
    group: 'Compound Identifiers',
    options: ['compoundId', 'catalogNumber', 'cas', 'inchiKey', 'productName', 'mdlNumber'],
  },
  {
    group: 'Structure',
    options: ['smiles', 'molfile'],
  },
  {
    group: 'Library & Kit Metadata',
    options: [
      'libraryName',
      'libraryId',
      'targetName',
      'pathway',
      'description',
      'moleculeType',
      'alias',
      'mechanismOfAction',
    ],
  },
  {
    group: 'PhysChem & Salt',
    options: ['molFormula', 'molWeight', 'saltData', 'purity', 'chiralPurity'],
  },
  {
    group: 'Supply & Handling',
    options: ['concentration', 'volume', 'solvent', 'storageConditions'],
  },
  {
    group: 'Screening Annotations',
    options: ['controlType', 'batchId'],
  },
  {
    group: 'Commercial',
    options: ['packageSize', 'unitPrice', 'inventoryAvailable', 'leadTime', 'moq'],
  },
  {
    group: 'Product Info',
    options: ['vendorName', 'appearance', 'solubility', 'shelfLife', 'physicalForm', 'notes'],
  },
  {
    group: 'Quality & Compliance',
    options: [
      'sdsAvailable',
      'coaAvailable',
      'customSynthesis',
      'retestOrExpiry',
      'hsCode',
      'hazmat',
    ],
  },
  {
    group: 'Other',
    options: ['ignore'],
  },
];

/** Plate format options with labels */
export const PLATE_FORMAT_OPTIONS: { value: PlateFormat; label: string }[] = [
  { value: 'P96', label: '96-well' },
  { value: 'P384', label: '384-well' },
  { value: 'P1536', label: '1536-well' },
];
