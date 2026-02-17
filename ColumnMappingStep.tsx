import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  Typography,
  Alert,
  ListSubheader,
} from "@mui/material";
import {
  CatalogImportKind,
  ColumnMapping,
  ColumnMappingKind,
  HeaderPreviewColumn,
  ScreeningMode,
  ValidationResult,
  MAPPING_LABELS,
  BUILDING_BLOCK_OPTIONS,
  SCREENING_COMPOUND_OPTIONS,
} from "./types";

export interface ColumnMappingStepProps {
  columns: HeaderPreviewColumn[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  isLoading: boolean;
  onBack: () => void;
  onConfirm: () => void;
  importKind: CatalogImportKind;
  /** Screening mode - only applicable when importKind is SCREENING_COMPOUND */
  screeningMode?: ScreeningMode;
  /** Default Plate ID - only applicable for PLATED_KIT mode */
  defaultPlateId?: string;
}

/**
 * Context for auto-detection to enable conditional mapping logic.
 */
interface AutoDetectContext {
  /** Whether the file contains a warehouse_code column */
  hasWarehouseCodeColumn: boolean;
}

// Auto-detect mapping based on column name
function autoDetectMapping(
  columnName: string,
  importKind: CatalogImportKind,
  ctx?: AutoDetectContext,
): ColumnMappingKind {
  const lower = columnName.toLowerCase().trim();

  // BUILDING_BLOCK warehouse detection BEFORE generic inventory patterns
  // This ensures warehouse_stock_qty is not incorrectly mapped to inventoryAvailable
  if (importKind === "BUILDING_BLOCK") {
    // Warehouse code - always check first
    if (lower === "warehouse_code" || lower === "warehousecode") {
      return "warehouseCode";
    }

    // Warehouse name
    if (lower === "warehouse_name" || lower === "warehousename") {
      return "warehouseName";
    }

    // Warehouse country
    if (lower === "warehouse_country" || lower === "warehousecountry") {
      return "warehouseCountry";
    }

    // Warehouse city
    if (lower === "warehouse_city" || lower === "warehousecity") {
      return "warehouseCity";
    }

    // Warehouse lead time
    if (
      lower === "warehouse_lead_time_days" ||
      lower === "warehouseleadtimedays" ||
      lower === "warehouse_lead_time"
    ) {
      return "warehouseLeadTimeDays";
    }

    // Warehouse in stock
    if (
      lower === "warehouse_in_stock" ||
      lower === "warehouseinstock" ||
      lower === "warehouse_instock"
    ) {
      return "warehouseInStock";
    }

    // Warehouse stock qty
    if (
      lower === "warehouse_stock_qty" ||
      lower === "warehousestockqty" ||
      lower === "warehouse_qty" ||
      lower === "warehouse_inventory"
    ) {
      return "warehouseStockQty";
    }

    // Warehouse price
    if (lower === "warehouse_price" || lower === "warehouseprice") {
      return "warehousePrice";
    }

    // Conditional mapping: inventory_available_qty
    // If warehouse_code column exists, map to warehouseStockQty; otherwise inventoryAvailable
    if (lower === "inventory_available_qty") {
      if (ctx?.hasWarehouseCodeColumn) {
        return "warehouseStockQty";
      }

      return "inventoryAvailable";
    }
  }

  // Plate map patterns (prioritize for SCREENING_COMPOUND)
  if (importKind === "SCREENING_COMPOUND") {
    // Plate ID patterns - including rack_number for vendor files
    if (
      lower === "plate" ||
      lower === "plate_id" ||
      lower === "plateid" ||
      lower === "rack_number" ||
      lower === "racknumber" ||
      lower === "rack"
    ) {
      return "plateId";
    }

    // Well patterns - including plate_location for vendor files
    if (
      lower === "well" ||
      lower === "well_position" ||
      lower === "plate_location" ||
      lower === "platelocation" ||
      lower === "position" ||
      lower === "well_location"
    ) {
      return "well";
    }

    // Row patterns
    if (lower === "row" || lower === "plate_row") {
      return "row";
    }

    // Column patterns
    if (
      lower === "column" ||
      lower === "col" ||
      lower === "plate_column" ||
      lower === "plate_col"
    ) {
      return "column";
    }

    // Compound ID / IDNUMBER patterns
    if (
      lower === "idnumber" ||
      lower === "id_number" ||
      lower === "compound_id" ||
      lower === "compoundid" ||
      lower === "mcule_id" ||
      lower === "mcule id"
    ) {
      return "compoundId";
    }

    // Library name patterns
    if (lower === "library" || lower === "library_name") {
      return "libraryName";
    }

    // Target name patterns
    if (
      lower === "target" ||
      lower === "target_name" ||
      lower === "e3l" ||
      lower === "biological_target"
    ) {
      return "targetName";
    }

    // Pathway patterns
    if (lower === "pathway") {
      return "pathway";
    }

    // Description patterns
    if (lower === "short_description" || lower === "description") {
      return "description";
    }

    // Molecule type patterns
    if (lower === "type_of_molecule") {
      return "moleculeType";
    }

    // Alias patterns
    if (lower === "alias") {
      return "alias";
    }

    // Mechanism of action patterns
    if (lower === "mechanism_of_action" || lower === "mechanism") {
      return "mechanismOfAction";
    }

    // Concentration patterns
    if (lower === "concentration" || lower === "conc") {
      return "concentration";
    }

    // Volume patterns
    if (lower === "volume" || lower === "vol") {
      return "volume";
    }

    // Control type patterns
    if (lower === "control" || lower === "control_type") {
      return "controlType";
    }

    // Batch ID patterns
    if (
      lower === "batch" ||
      lower === "batch_id" ||
      lower === "lot" ||
      lower === "lot_id"
    ) {
      return "batchId";
    }
  }

  // Catalog number patterns
  // Note: "cat" must be exact match to avoid false positives (e.g., "category")
  if (
    lower === "cat" ||
    lower.includes("catalog") ||
    lower.includes("sku") ||
    lower.includes("product_id") ||
    lower.includes("productid") ||
    lower.includes("item_number") ||
    lower.includes("part_number")
  ) {
    return "catalogNumber";
  }

  // CAS number patterns
  if (
    lower.includes("cas") ||
    lower === "cas_number" ||
    lower === "casnumber"
  ) {
    return "cas";
  }

  // InChI Key patterns
  if (lower.includes("inchi") || lower.includes("inchikey")) {
    return "inchiKey";
  }

  // Product name patterns
  if (
    lower.includes("name") ||
    lower.includes("description") ||
    lower.includes("title") ||
    lower.includes("product")
  ) {
    return "productName";
  }

  // Package size patterns
  if (
    lower.includes("package") ||
    lower.includes("size") ||
    lower.includes("quantity") ||
    lower.includes("amount") ||
    lower.includes("unit")
  ) {
    return "packageSize";
  }

  // Price patterns
  if (
    lower.includes("price") ||
    lower.includes("cost") ||
    lower.includes("usd")
  ) {
    return "unitPrice";
  }

  // Inventory patterns
  if (
    lower.includes("inventory") ||
    lower.includes("stock") ||
    lower.includes("available") ||
    lower.includes("qty")
  ) {
    return "inventoryAvailable";
  }

  // Lead time patterns
  if (
    lower.includes("lead") ||
    lower.includes("delivery") ||
    lower.includes("ship")
  ) {
    return "leadTime";
  }

  // Molecular formula patterns
  // Be specific to avoid false positives like "formulation"
  if (
    lower === "formula" ||
    lower === "mol_formula" ||
    lower === "molformula" ||
    lower === "molecular_formula" ||
    lower === "mf"
  ) {
    return "molFormula";
  }

  // Molecular weight patterns
  if (
    lower.includes("weight") ||
    lower === "mw" ||
    lower === "mol_weight" ||
    lower === "molweight"
  ) {
    return "molWeight";
  }

  // SMILES patterns
  if (lower.includes("smiles") || lower === "structure") {
    return "smiles";
  }

  // MDL Number patterns (identifier, not structure)
  // Includes MFCD format (MDL Foundation Compound Database)
  if (
    lower === "mdl_number_mdl" ||
    lower === "mdl_number" ||
    lower === "mdlnumber" ||
    lower === "mfcdnumber" ||
    lower === "mfcd_number" ||
    lower === "mfcd"
  ) {
    return "mdlNumber";
  }

  // Molfile patterns (structure)
  if (
    lower.includes("molfile") ||
    lower.includes("mol_block") ||
    lower === "ctab"
  ) {
    return "molfile";
  }

  // Legacy MDL patterns - map to molfile for backward compatibility
  // Only if it doesn't look like an MDL number
  if (lower === "mdl" && !lower.includes("number")) {
    return "molfile";
  }

  // Salt data patterns
  if (lower.includes("salt")) {
    return "saltData";
  }

  // Purity patterns (including vendor-specific like "Quality", "Assay")
  if (
    lower.includes("purity") ||
    lower === "quality" ||
    lower === "assay" ||
    lower === "hplc" ||
    lower === "lcms"
  ) {
    return "purity";
  }

  // Hazmat patterns
  if (
    lower.includes("hazmat") ||
    lower.includes("hazard") ||
    lower === "dangerousgoods" ||
    lower === "dangerous_goods" ||
    lower === "dg"
  ) {
    return "hazmat";
  }

  // NOTE: Warehouse patterns for BUILDING_BLOCK are now handled at the TOP of this function
  // to ensure they are detected before generic inventory patterns (which would incorrectly
  // match warehouse_stock_qty due to "stock" and "qty" substrings).

  // Default to ignore for unrecognized columns
  return "ignore";
}

/**
 * Initialize column mapping with auto-detected values based on column names.
 */
export function initializeColumnMapping(
  columns: HeaderPreviewColumn[],
  importKind: CatalogImportKind = "BUILDING_BLOCK",
): ColumnMapping {
  // Compute context for conditional mapping logic
  const hasWarehouseCodeColumn = columns.some((col) => {
    const lower = col.fileColumn.toLowerCase().trim();

    return lower === "warehouse_code" || lower === "warehousecode";
  });

  const ctx: AutoDetectContext = { hasWarehouseCodeColumn };

  return {
    mappings: columns.map((col) => ({
      fileColumn: col.fileColumn,
      mapTo: autoDetectMapping(col.fileColumn, importKind, ctx),
    })),
  };
}

/**
 * Validate column mapping based on import kind and screening mode.
 *
 * Validation rules:
 *
 * BUILDING_BLOCK:
 * - Requires at least one key identifier (catalogNumber, cas, inchiKey, or productName)
 *
 * SCREENING_COMPOUND with COMPOUND_LIST mode (unplated):
 * - Requires Compound ID or Catalog Number
 * - Requires Structure (SMILES or MDL)
 * - Plate fields (Plate ID, Well, Row, Column) are NOT required
 *
 * SCREENING_COMPOUND with PLATED_KIT mode (pre-plated):
 * - Requires Compound ID or Catalog Number
 * - Requires Well OR (Row AND Column)
 * - Requires Plate ID OR defaultPlateId must be provided
 * - Structure is optional (warning only)
 * - Cannot map both Well AND Row/Column (mutual exclusivity)
 */
export function validateMapping(
  mapping: ColumnMapping,
  importKind: CatalogImportKind,
  screeningMode?: ScreeningMode,
  defaultPlateId?: string,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const mappedKinds = new Set(mapping.mappings.map((m) => m.mapTo));

  if (importKind === "SCREENING_COMPOUND") {
    // Compound ID is always required for screening compounds (compoundId or catalogNumber)
    if (!mappedKinds.has("compoundId") && !mappedKinds.has("catalogNumber")) {
      errors.push(
        'Compound ID is required: map a column to "Compound ID" or "Catalog Number"',
      );
    }

    if (screeningMode === "COMPOUND_LIST") {
      // COMPOUND_LIST (unplated) mode:
      // - Structure is required
      // - Plate fields are NOT required

      if (
        !mappedKinds.has("mdl") &&
        !mappedKinds.has("molfile") &&
        !mappedKinds.has("smiles")
      ) {
        errors.push(
          'Structure is required for unplated compound lists: map a column to "Molfile (.mol)" or "SMILES"',
        );
      }

      // Plate fields are optional - just show a warning if provided but incomplete
      const hasPlateId = mappedKinds.has("plateId");
      const hasWell = mappedKinds.has("well");
      const hasRow = mappedKinds.has("row");
      const hasColumn = mappedKinds.has("column");

      // If any plate field is mapped, check for mutual exclusivity
      if (hasWell && (hasRow || hasColumn)) {
        errors.push(
          'Conflicting well position mappings: use either "Well" OR "Row"+"Column", not both',
        );
      }

      // Warnings for recommendations
      if (!mappedKinds.has("libraryName")) {
        warnings.push(
          "Library Name is recommended for better organization of screening compounds",
        );
      }

      if (!mappedKinds.has("inchiKey")) {
        warnings.push(
          "InChI Key is recommended for compound deduplication and search",
        );
      }

      // Info about plate fields being optional
      if (!hasPlateId && !hasWell && !hasRow && !hasColumn) {
        // This is fine for unplated compound lists - no warning needed
      }
    } else if (screeningMode === "PLATED_KIT") {
      // PLATED_KIT (pre-plated) mode:
      // - Plate ID is required (unless defaultPlateId is provided)
      // - Well OR (Row AND Column) is required
      // - Structure is optional (warning only)

      // Plate ID validation
      const hasPlateIdColumn = mappedKinds.has("plateId");
      const hasDefaultPlateId = defaultPlateId && defaultPlateId.trim() !== "";

      if (!hasPlateIdColumn && !hasDefaultPlateId) {
        errors.push(
          'Plate ID is required for pre-plated kits: map a column to "Plate ID" or provide a Default Plate ID',
        );
      }

      // Well position validation
      const hasWell = mappedKinds.has("well");
      const hasRow = mappedKinds.has("row");
      const hasColumn = mappedKinds.has("column");

      if (!hasWell && !(hasRow && hasColumn)) {
        errors.push(
          'Well position is required for pre-plated kits: map a column to "Well" OR both "Row" AND "Column"',
        );
      }

      // Mutual exclusivity: well vs row/column
      if (hasWell && (hasRow || hasColumn)) {
        errors.push(
          'Conflicting well position mappings: use either "Well" OR "Row"+"Column", not both',
        );
      }

      // Structure is optional for pre-plated kits - just warn
      if (
        !mappedKinds.has("mdl") &&
        !mappedKinds.has("molfile") &&
        !mappedKinds.has("smiles")
      ) {
        warnings.push(
          "Structure (SMILES or Molfile) is recommended but not required for pre-plated kits",
        );
      }

      // Warnings for recommendations
      if (!mappedKinds.has("libraryName")) {
        warnings.push(
          "Library Name is recommended for better organization of screening compounds",
        );
      }
    } else {
      // Default behavior when screeningMode is not specified (backwards compatibility)
      // This maintains the original strict validation

      // Plate ID is required
      if (!mappedKinds.has("plateId")) {
        errors.push('Plate ID is required: map a column to "Plate ID"');
      }

      // Well position: either well OR (row AND column)
      const hasWell = mappedKinds.has("well");
      const hasRow = mappedKinds.has("row");
      const hasColumn = mappedKinds.has("column");

      if (!hasWell && !(hasRow && hasColumn)) {
        errors.push(
          'Well position is required: map a column to "Well" OR both "Row" AND "Column"',
        );
      }

      // Mutual exclusivity: well vs row/column
      if (hasWell && (hasRow || hasColumn)) {
        errors.push(
          'Conflicting well position mappings: use either "Well" OR "Row"+"Column", not both',
        );
      }

      // Structure is required (mdl, molfile, or smiles)
      if (
        !mappedKinds.has("mdl") &&
        !mappedKinds.has("molfile") &&
        !mappedKinds.has("smiles")
      ) {
        errors.push(
          'Structure is required: map a column to "Molfile (.mol)" or "SMILES"',
        );
      }

      // Warnings (non-blocking)
      if (!mappedKinds.has("libraryName")) {
        warnings.push(
          "Library Name is recommended for better organization of screening compounds",
        );
      }

      if (!mappedKinds.has("inchiKey")) {
        warnings.push(
          "InChI Key is recommended for compound deduplication and search",
        );
      }
    }
  } else {
    // BUILDING_BLOCK validation
    // At least one key field is required
    const keyFields: ColumnMappingKind[] = [
      "catalogNumber",
      "cas",
      "inchiKey",
      "productName",
    ];
    const hasAnyKey = keyFields.some((k) => mappedKinds.has(k));

    if (!hasAnyKey) {
      errors.push(
        "At least one key field is required: Catalog Number, CAS Number, InChI Key, or Product Name",
      );
    }

    // Warehouse validation: if any warehouse field is mapped, warehouseCode is required
    const warehouseFields: ColumnMappingKind[] = [
      "warehouseCode",
      "warehouseName",
      "warehouseCountry",
      "warehouseCity",
      "warehouseLeadTimeDays",
      "warehouseInStock",
      "warehouseStockQty",
      "warehousePrice",
    ];
    const hasAnyWarehouseField = warehouseFields.some((k) =>
      mappedKinds.has(k),
    );
    const hasWarehouseCode = mappedKinds.has("warehouseCode");

    if (hasAnyWarehouseField && !hasWarehouseCode) {
      errors.push(
        "Warehouse Code is required when mapping warehouse-specific fields",
      );
    }

    // Warning if both inventoryAvailable and warehouseStockQty are mapped
    if (
      mappedKinds.has("inventoryAvailable") &&
      mappedKinds.has("warehouseStockQty")
    ) {
      warnings.push(
        "Warehouse Stock Qty is mapped. Recommend setting global Inventory Available to Ignore to avoid confusion.",
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Analyze sample well values to detect well format and provide preview info.
 * Returns detected plate IDs and example well normalization.
 */
function analyzePrePlatedSamples(
  columns: HeaderPreviewColumn[],
  mapping: ColumnMapping,
): { plateIdCandidates: string[]; wellExample: string | null } {
  // Find mapped well column
  const wellMapping = mapping.mappings.find(
    (m) => m.mapTo === "well" || m.mapTo === "row",
  );
  const plateMapping = mapping.mappings.find((m) => m.mapTo === "plateId");

  let wellExample: string | null = null;
  const plateIdCandidates: string[] = [];

  // Get sample wells
  if (wellMapping) {
    const wellCol = columns.find(
      (c) => c.fileColumn === wellMapping.fileColumn,
    );
    if (wellCol && wellCol.samples.length > 0) {
      const sampleWell = wellCol.samples[0];
      // Simple normalization preview: lowercase a1 -> A01
      const match = sampleWell.match(/^([a-zA-Z])(\d{1,2})$/);
      if (match) {
        const normalized = `${match[1].toUpperCase()}${match[2].padStart(2, "0")}`;
        wellExample = `${sampleWell} → ${normalized}`;
      }
    }
  }

  // Get unique plate IDs from samples
  if (plateMapping) {
    const plateCol = columns.find(
      (c) => c.fileColumn === plateMapping.fileColumn,
    );
    if (plateCol && plateCol.samples.length > 0) {
      const uniquePlates = [...new Set(plateCol.samples.filter(Boolean))];
      plateIdCandidates.push(...uniquePlates.slice(0, 3)); // First 3 unique
    }
  }

  return { plateIdCandidates, wellExample };
}

/**
 * Get instruction text based on import kind and screening mode.
 */
function getInstructionText(
  importKind: CatalogImportKind,
  screeningMode?: ScreeningMode,
): string {
  if (importKind === "BUILDING_BLOCK") {
    return (
      "Map your file columns to the appropriate fields. At minimum, a key identifier " +
      "(Catalog Number, CAS, InChI Key, or Product Name) must be mapped. " +
      "For multiple warehouses, repeat the product on multiple rows and set " +
      "Warehouse Code + Warehouse Stock Qty for each row."
    );
  }

  if (screeningMode === "COMPOUND_LIST") {
    return (
      "Map your file columns to compound fields. For unplated compound lists, " +
      "Compound ID and Structure (SMILES or MDL) are required. Plate fields are optional."
    );
  }

  if (screeningMode === "PLATED_KIT") {
    return (
      "Map your file columns to plate-map and compound fields. For pre-plated kits, " +
      "Compound ID, Plate ID (or Default Plate ID), and Well position are required. Structure is optional."
    );
  }

  // Default for backwards compatibility
  return (
    "Map your file columns to plate-map and compound fields. Plate ID, Well position, " +
    "Compound ID, and Structure are required."
  );
}

export function ColumnMappingStep({
  columns,
  mapping,
  onMappingChange,
  isLoading,
  onBack,
  onConfirm,
  importKind,
  screeningMode,
  defaultPlateId,
}: ColumnMappingStepProps) {
  const handleMappingChange = (
    fileColumn: string,
    newMapTo: ColumnMappingKind,
  ) => {
    const newMappings = mapping.mappings.map((m) =>
      m.fileColumn === fileColumn ? { ...m, mapTo: newMapTo } : m,
    );
    onMappingChange({ mappings: newMappings });
  };

  const getMappingForColumn = (fileColumn: string): ColumnMappingKind => {
    const entry = mapping.mappings.find((m) => m.fileColumn === fileColumn);

    return entry?.mapTo || "ignore";
  };

  // Validate mapping with screening mode
  const validation = validateMapping(
    mapping,
    importKind,
    screeningMode,
    defaultPlateId,
  );

  // Get grouped options based on import kind
  const optionGroups =
    importKind === "SCREENING_COMPOUND"
      ? SCREENING_COMPOUND_OPTIONS
      : BUILDING_BLOCK_OPTIONS;

  // Render grouped select options
  const renderSelectOptions = () => {
    const items: React.ReactNode[] = [];

    optionGroups.forEach((group, groupIndex) => {
      // Add group header
      items.push(
        <ListSubheader
          key={`header-${groupIndex}`}
          sx={{ backgroundColor: "background.paper", fontWeight: "bold" }}
        >
          {group.group}
        </ListSubheader>,
      );

      // Add options in group
      group.options.forEach((option) => {
        const isIgnore = option === "ignore";
        items.push(
          <MenuItem
            key={option}
            value={option}
            sx={{
              pl: 3,
              ...(isIgnore && {
                color: "error.main",
                fontWeight: "medium",
              }),
            }}
          >
            {MAPPING_LABELS[option]}
          </MenuItem>,
        );
      });
    });

    return items;
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {getInstructionText(importKind, screeningMode)}
      </Typography>

      {/* Show default plate ID info for plated kits */}
      {screeningMode === "PLATED_KIT" && defaultPlateId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Default Plate ID: <strong>{defaultPlateId}</strong> — This will be
          used for rows without a mapped Plate ID column.
        </Alert>
      )}

      {/* Detection preview for pre-plated kits */}
      {screeningMode === "PLATED_KIT" &&
        (() => {
          const { plateIdCandidates, wellExample } = analyzePrePlatedSamples(
            columns,
            mapping,
          );
          const hasPreview = plateIdCandidates.length > 0 || wellExample;
          if (!hasPreview) return null;

          return (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                Detected:
              </Typography>
              {plateIdCandidates.length > 0 && (
                <Typography variant="body2">
                  Plate IDs: {plateIdCandidates.join(", ")}
                  {plateIdCandidates.length === 3 ? "..." : ""}
                </Typography>
              )}
              {wellExample && (
                <Typography variant="body2">
                  Well format: {wellExample}
                </Typography>
              )}
            </Alert>
          );
        })()}

      {/* Validation Errors */}
      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
            Required fields missing:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validation.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && validation.errors.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
            Recommendations:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validation.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: "bold" }}>File Column</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Sample Values</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Map To</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {columns.map((col) => (
              <TableRow key={col.fileColumn}>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {col.fileColumn}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={col.samples.join(", ")}
                  >
                    {col.samples.slice(0, 3).join(", ")}
                    {col.samples.length > 3 && "..."}
                  </Typography>
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 180 }}>
                    <Select
                      value={getMappingForColumn(col.fileColumn)}
                      onChange={(e) =>
                        handleMappingChange(
                          col.fileColumn,
                          e.target.value as ColumnMappingKind,
                        )
                      }
                      disabled={isLoading}
                    >
                      {renderSelectOptions()}
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "space-between",
        }}
      >
        <Button variant="outlined" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={!validation.valid || isLoading}
        >
          Start Import
        </Button>
      </Box>
    </Box>
  );
}
