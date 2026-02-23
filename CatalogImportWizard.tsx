import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Alert,
  LinearProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  CatalogImportMode,
  CatalogImportStatus,
  CatalogImportKind,
  ColumnMapping,
  HeaderPreviewColumn,
  ScreeningMode,
  PlateFormat,
  PLATE_FORMAT_OPTIONS,
} from './types';
import { ColumnMappingStep, initializeColumnMapping } from './ColumnMappingStep';
import { useCatalogImport, CatalogImportApiConfig } from './useCatalogImport';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Translate frontend-specific mapping kinds to their backend equivalents.
 * The frontend uses more descriptive names (libraryName, plateId, molfile) while
 * the backend uses shorter/canonical names (library, plate, mdl).
 *
 * Returns a plain object (not typed as ColumnMapping) since the translated
 * values may not match the frontend's ColumnMappingKind type.
 */
function translateColumnMapping(mapping: ColumnMapping): {
  mappings: { fileColumn: string; mapTo: string }[];
} {
  return {
    mappings: mapping.mappings.map((entry) => ({
      fileColumn: entry.fileColumn,
      mapTo: translateMappingKind(entry.mapTo),
    })),
  };
}

function translateMappingKind(kind: string): string {
  switch (kind) {
    case 'libraryName':
      return 'library';
    case 'plateId':
      return 'plate';
    case 'molfile':
      return 'mdl';
    default:
      return kind;
  }
}

// ============================================================================
// Props Types
// ============================================================================

export interface CatalogImportWizardProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  /** API configuration for endpoints */
  apiConfig: CatalogImportApiConfig;
  /** File uploader component to use */
  fileUploader: React.ReactNode;
  /** Callback when a file is uploaded */
  onFileUploaded: (fileId: string, fileName: string) => void;
  /** File ID if already uploaded */
  uploadedFileId?: string | null;
  /** File name if already uploaded */
  uploadedFileName?: string | null;
}

// ============================================================================
// Sub-Components
// ============================================================================

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}m ${remSec}s`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;

  return `${hr}h ${remMin}m`;
}

function getStageLabel(stage: string | undefined, t: (key: string) => string): string {
  switch (stage) {
    case 'parsing':
      return t('catalogImport.stageParsing');
    case 'upserting':
      return t('catalogImport.stageUpserting');
    case 'image_generation':
      return t('catalogImport.stageImageGeneration');
    case 'finalizing':
      return t('catalogImport.stageFinalizing');
    default:
      return '';
  }
}

function CatalogImportProgress({ status }: { status: CatalogImportStatus }) {
  const { t } = useTranslation('products');
  const { state, progress, failureReason } = status;

  const getStateLabel = () => {
    switch (state) {
      case 'queued':
        return t('catalogImport.statusQueued');
      case 'active':
        return t('catalogImport.statusProcessing');
      case 'completed':
        return t('catalogImport.statusCompleted');
      case 'failed':
        return t('catalogImport.statusFailed');
      default:
        return t('catalogImport.statusUnknown');
    }
  };

  const getStateColor = (): 'default' | 'primary' | 'success' | 'error' => {
    switch (state) {
      case 'queued':
        return 'default';
      case 'active':
        return 'primary';
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProgressPercent = () => {
    if (status.progressPct != null && status.progressPct > 0) {
      return status.progressPct;
    }
    if (!progress || progress.total === 0) return 0;

    return Math.round((progress.processed / progress.total) * 100);
  };

  const getElapsedAndEta = () => {
    if (!progress?.startedAt) return null;

    const startTime = new Date(progress.startedAt).getTime();
    const now = progress.finishedAt ? new Date(progress.finishedAt).getTime() : Date.now();
    const elapsedMs = now - startTime;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const elapsed = formatDuration(elapsedSec);

    const pct = getProgressPercent();
    let eta = '';
    if (pct > 5 && pct < 100 && !progress.finishedAt) {
      const remainingMs = (elapsedMs / pct) * (100 - pct);
      eta = formatDuration(Math.floor(remainingMs / 1000));
    }

    return { elapsed, eta };
  };

  const progressPercent = getProgressPercent();
  const stageLabel = getStageLabel(status.stage, t);

  return (
    <Box
      sx={{
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">
            {t('catalogImport.status')}: {getStateLabel()}
          </Typography>
          <Chip label={getStateLabel()} color={getStateColor()} size="small" />
        </Box>
      </Box>

      {stageLabel && state === 'active' && (
        <Typography variant="body2" color="text.secondary">
          {stageLabel}
          {status.message ? ` \u2014 ${status.message}` : ''}
        </Typography>
      )}

      {progress && (
        <>
          <Box sx={{ width: '100%' }}>
            <LinearProgress
              variant={
                state === 'active' && progressPercent === 0 ? 'indeterminate' : 'determinate'
              }
              value={progressPercent}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              {progressPercent}%
              {progress.total > 0
                ? // eslint-disable-next-line max-len
                  ` (${t('catalogImport.rowsProcessed', { processed: progress.processed.toLocaleString(), total: progress.total.toLocaleString() })})`
                : progress.processed > 0
                  ? ` (${t('catalogImport.rowsProcessedNoTotal', { processed: progress.processed.toLocaleString() })})`
                  : ''}
            </Typography>
            {(() => {
              const timing = getElapsedAndEta();
              if (!timing) return null;

              return (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {t('catalogImport.elapsed')}: {timing.elapsed}
                  {timing.eta && ` | ${t('catalogImport.estRemaining')}: ${timing.eta}`}
                </Typography>
              );
            })()}
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 2,
              mt: 1,
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('catalogImport.total')}
              </Typography>
              <Typography variant="h6">
                {progress.total > 0
                  ? progress.total.toLocaleString()
                  : progress.processed > 0
                    ? `~${progress.processed.toLocaleString()}`
                    : '...'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('catalogImport.processed')}
              </Typography>
              <Typography variant="h6" color="primary.main">
                {progress.processed.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('catalogImport.inserted')}
              </Typography>
              <Typography variant="h6" color="success.main">
                {progress.inserted.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('catalogImport.updated')}
              </Typography>
              <Typography variant="h6" color="info.main">
                {progress.updated.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('catalogImport.errors')}
              </Typography>
              <Typography variant="h6" color="error.main">
                {progress.errored.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          {progress.startedAt && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('catalogImport.started')}: {new Date(progress.startedAt).toLocaleString()}
              </Typography>
              {progress.finishedAt && (
                <Typography variant="body2" color="text.secondary">
                  {t('catalogImport.finished')}: {new Date(progress.finishedAt).toLocaleString()}
                </Typography>
              )}
            </Box>
          )}
        </>
      )}

      {state === 'failed' && failureReason && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'error.light',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" color="error.main">
            <strong>{t('catalogImport.error')}:</strong> {failureReason}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function CatalogImportErrors({
  errors,
}: {
  errors: Array<{ row: number; sku?: string; error: string }>;
}) {
  const { t } = useTranslation('products');
  if (errors.length === 0) return null;

  return (
    <Box
      sx={{
        mt: 3,
        p: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" gutterBottom color="error.main">
        {t('catalogImport.importErrors', { count: errors.length })}
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>{t('catalogImport.row')}</strong>
              </TableCell>
              <TableCell>
                <strong>{t('catalogImport.sku')}</strong>
              </TableCell>
              <TableCell>
                <strong>{t('catalogImport.error')}</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {errors.map((err, index) => (
              <TableRow key={index}>
                <TableCell>{err.row}</TableCell>
                <TableCell>{err.sku || t('catalogImport.na')}</TableCell>
                <TableCell>
                  <Typography variant="body2" color="error.main">
                    {err.error}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Derive library name from filename by stripping extension and converting to title case.
 */
function deriveLibraryNameFromFilename(fileName: string): string {
  // Remove extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

  // Convert snake_case and kebab-case to spaces
  const withSpaces = nameWithoutExt.replace(/[_-]/g, ' ');

  // Title case
  return withSpaces
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// ============================================================================
// Main Component
// ============================================================================

export function CatalogImportWizard({
  open,
  onClose,
  organizationId,
  organizationName,
  apiConfig,
  fileUploader,
  onFileUploaded,
  uploadedFileId,
  uploadedFileName,
}: CatalogImportWizardProps) {
  const { t } = useTranslation('products');
  const steps = useMemo(
    () => [
      t('catalogImport.steps.uploadFile'),
      t('catalogImport.steps.configureImport'),
      t('catalogImport.steps.mapColumns'),
      t('catalogImport.steps.monitorProgress'),
    ],
    [t],
  );
  const [activeStep, setActiveStep] = useState(0);
  const [fileId, setFileId] = useState<string | null>(uploadedFileId || null);
  const [fileName, setFileName] = useState<string | null>(uploadedFileName || null);
  const [importMode, setImportMode] = useState<CatalogImportMode>('merge');
  const [importKind, setImportKind] = useState<CatalogImportKind | null>(null);

  // Screening compound specific state
  const [screeningMode, setScreeningMode] = useState<ScreeningMode | null>(null);
  const [libraryName, setLibraryName] = useState('');
  const [plateFormat, setPlateFormat] = useState<PlateFormat>('P96');
  const [defaultPlateId, setDefaultPlateId] = useState('');

  // Column mapping state
  const [headerColumns, setHeaderColumns] = useState<HeaderPreviewColumn[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    mappings: [],
  });
  const [isLoadingHeaders, setIsLoadingHeaders] = useState(false);

  const {
    startImport,
    cancelImport,
    previewHeaders,
    reset,
    status,
    isStarting,
    isCancelling,
    error,
  } = useCatalogImport(organizationId, apiConfig);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Sync file state from props
  useEffect(() => {
    if (uploadedFileId) {
      setFileId(uploadedFileId);
    }
    if (uploadedFileName) {
      setFileName(uploadedFileName);
    }
  }, [uploadedFileId, uploadedFileName]);

  // Handle file upload callback - this could be exposed via props for custom file upload handling
  const _handleFileUploaded = useCallback(
    (newFileId: string, newFileName: string) => {
      setFileId(newFileId);
      setFileName(newFileName);
      onFileUploaded(newFileId, newFileName);
    },
    [onFileUploaded],
  );

  // Advance to step 1 when file is uploaded
  useEffect(() => {
    if (fileId && activeStep === 0) {
      setActiveStep(1);
    }
  }, [fileId, activeStep]);

  // Advance to step 3 when import starts
  useEffect(() => {
    if (status) {
      setActiveStep(3);
    }
  }, [status]);

  const handleConfigureNext = useCallback(async () => {
    if (!fileId || !importKind) return;

    // For screening compounds, ensure screeningMode is selected
    if (importKind === 'SCREENING_COMPOUND' && !screeningMode) return;

    // Set default library name from filename if not provided
    let finalLibraryName = libraryName.trim();
    if (importKind === 'SCREENING_COMPOUND' && !finalLibraryName && fileName) {
      finalLibraryName = deriveLibraryNameFromFilename(fileName);
      setLibraryName(finalLibraryName);
    }

    // Fetch headers for column mapping
    setIsLoadingHeaders(true);
    try {
      const headerResult = await previewHeaders(fileId);
      if (headerResult && headerResult.columns) {
        setHeaderColumns(headerResult.columns);
        // Initialize column mapping with auto-detected values based on import kind
        setColumnMapping(initializeColumnMapping(headerResult.columns, importKind));
        // Move to mapping step
        setActiveStep(2);
      }
    } catch {
      // Error is already reported by the hook
    } finally {
      setIsLoadingHeaders(false);
    }
  }, [fileId, importKind, screeningMode, libraryName, fileName, previewHeaders]);

  const handleStartImport = useCallback(async () => {
    if (!fileId || !importKind) return;

    // Determine final library name
    let finalLibraryName = libraryName.trim();
    if (importKind === 'SCREENING_COMPOUND' && !finalLibraryName && fileName) {
      finalLibraryName = deriveLibraryNameFromFilename(fileName);
    }

    try {
      // Translate frontend mapping kinds to backend equivalents before sending
      // Use type assertion since translated values (library, plate, mdl) are valid
      // backend values but not part of the frontend ColumnMappingKind type
      const translatedMapping =
        columnMapping.mappings.length > 0
          ? (translateColumnMapping(columnMapping) as ColumnMapping)
          : undefined;

      await startImport({
        fileId,
        mode: importMode,
        importKind,
        columnMapping: translatedMapping,
        // Screening-specific fields
        screeningMode: importKind === 'SCREENING_COMPOUND' ? screeningMode || undefined : undefined,
        libraryName:
          importKind === 'SCREENING_COMPOUND' ? finalLibraryName || undefined : undefined,
        plateFormat: screeningMode === 'PLATED_KIT' ? plateFormat : undefined,
        defaultPlateId:
          screeningMode === 'PLATED_KIT' ? defaultPlateId.trim() || undefined : undefined,
      });
    } catch {
      // Error is already reported by the hook
    }
  }, [
    fileId,
    importMode,
    importKind,
    columnMapping,
    startImport,
    screeningMode,
    libraryName,
    fileName,
    plateFormat,
    defaultPlateId,
  ]);

  const handleMappingBack = useCallback(() => {
    setActiveStep(1);
    // Reset column mapping state
    setHeaderColumns([]);
    setColumnMapping({ mappings: [] });
  }, []);

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setFileId(null);
    setFileName(null);
    setImportMode('merge');
    setImportKind(null);
    setScreeningMode(null);
    setLibraryName('');
    setPlateFormat('P96');
    setDefaultPlateId('');
    setHeaderColumns([]);
    setColumnMapping({ mappings: [] });
    reset();
  }, [reset]);

  const handleCancelImport = useCallback(async () => {
    if (!status?.jobId) return;
    try {
      await cancelImport(status.jobId);
    } catch {
      // Error is handled by the hook
    } finally {
      setShowCancelConfirm(false);
    }
  }, [status?.jobId, cancelImport]);

  const handleClose = useCallback(() => {
    // Don't allow closing if import is in progress
    if (status?.state === 'queued' || status?.state === 'active') {
      return;
    }
    handleReset();
    onClose();
  }, [status, handleReset, onClose]);

  const isImportInProgress = status?.state === 'queued' || status?.state === 'active';
  const isImportCompleted = status?.state === 'completed';
  const isImportFailed = status?.state === 'failed';

  // Determine if we can proceed from configure step

  const canProceedFromConfigure = () => {
    if (!fileId || !importKind) return false;
    if (importKind === 'SCREENING_COMPOUND' && !screeningMode) return false;

    return true;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      disableEscapeKeyDown={isImportInProgress}
    >
      <DialogTitle>
        <Box>
          <Typography variant="h6">{t('catalogImport.title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('catalogImport.organization')}: {organizationName}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ width: '100%', pt: 2 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 0: File Upload */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                1. {t('catalogImport.uploadCatalogFile')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('catalogImport.uploadCatalogFileDescription')}
              </Typography>
              {fileUploader}
            </Box>
          )}

          {/* Step 1: Configure Import */}
          {activeStep === 1 && fileId && !status && (
            <Box>
              <Typography variant="h6" gutterBottom>
                2. {t('catalogImport.steps.configureImport')}
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                {t('catalogImport.fileUploaded')}: <strong>{fileName}</strong>
              </Alert>

              {/* Import Kind Selection */}
              <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
                <FormLabel component="legend">{t('catalogImport.whatDoesFileContain')}</FormLabel>
                <RadioGroup
                  value={importKind || ''}
                  onChange={(e) => {
                    const newKind = e.target.value as CatalogImportKind;
                    setImportKind(newKind);
                    // Reset screening mode when switching kinds
                    if (newKind !== 'SCREENING_COMPOUND') {
                      setScreeningMode(null);
                      setLibraryName('');
                      setPlateFormat('P96');
                      setDefaultPlateId('');
                    }
                  }}
                >
                  <FormControlLabel
                    value="BUILDING_BLOCK"
                    control={<Radio />}
                    label={t('catalogImport.onlyBuildingBlocks')}
                  />
                  <FormControlLabel
                    value="SCREENING_COMPOUND"
                    control={<Radio />}
                    label={t('catalogImport.onlyScreeningCompounds')}
                  />
                </RadioGroup>
              </FormControl>

              {/* Screening Compound Options */}
              {importKind === 'SCREENING_COMPOUND' && (
                <Box
                  sx={{
                    ml: 3,
                    mb: 3,
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  {/* Screening Mode Selection */}
                  <FormControl component="fieldset" sx={{ mb: 2, width: '100%' }}>
                    <FormLabel component="legend">
                      {t('catalogImport.screeningImportMode')}
                    </FormLabel>
                    <RadioGroup
                      value={screeningMode || ''}
                      onChange={(e) => {
                        const newMode = e.target.value as ScreeningMode;
                        setScreeningMode(newMode);
                        // Reset plated kit fields when switching to compound list
                        if (newMode === 'COMPOUND_LIST') {
                          setPlateFormat('P96');
                          setDefaultPlateId('');
                        }
                      }}
                    >
                      <FormControlLabel
                        value="COMPOUND_LIST"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1">
                              {t('catalogImport.compoundListUnplated')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('catalogImport.compoundListDescription')}
                            </Typography>
                          </Box>
                        }
                      />
                      <FormControlLabel
                        value="PLATED_KIT"
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="body1">
                              {t('catalogImport.screeningLibraryKit')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t('catalogImport.screeningLibraryKitDescription')}
                            </Typography>
                          </Box>
                        }
                      />
                    </RadioGroup>
                  </FormControl>

                  {/* Library Name Input */}
                  <TextField
                    label={t('catalogImport.libraryNameLabel')}
                    value={libraryName}
                    onChange={(e) => setLibraryName(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                    helperText={
                      libraryName.trim()
                        ? ''
                        : t('catalogImport.libraryNameHelperText', {
                            name: fileName ? deriveLibraryNameFromFilename(fileName) : 'filename',
                          })
                    }
                  />

                  {/* Pre-plated Kit Options */}
                  {screeningMode === 'PLATED_KIT' && (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel id="plate-format-label">
                          {t('catalogImport.plateFormat')}
                        </InputLabel>
                        <Select
                          labelId="plate-format-label"
                          value={plateFormat}
                          label={t('catalogImport.plateFormat')}
                          onChange={(e) => setPlateFormat(e.target.value as PlateFormat)}
                        >
                          {PLATE_FORMAT_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        label={t('catalogImport.defaultPlateId')}
                        value={defaultPlateId}
                        onChange={(e) => setDefaultPlateId(e.target.value)}
                        sx={{ flex: 1 }}
                        helperText={t('catalogImport.defaultPlateIdHelperText')}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {/* Import Mode Selection */}
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend">{t('catalogImport.importMode')}</FormLabel>
                <RadioGroup
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as CatalogImportMode)}
                >
                  <FormControlLabel
                    value="merge"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1">{t('catalogImport.merge')}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('catalogImport.mergeDescription')}
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="replace"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1">{t('catalogImport.replace')}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t('catalogImport.replaceDescription')}
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
            </Box>
          )}

          {/* Step 2: Column Mapping */}
          {activeStep === 2 && importKind && (
            <Box>
              <Typography variant="h6" gutterBottom>
                3. {t('catalogImport.steps.mapColumns')}
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                {t('catalogImport.file')}: <strong>{fileName}</strong>
                {importKind === 'SCREENING_COMPOUND' && screeningMode && (
                  <>
                    {' '}
                    | {t('catalogImport.mode')}:{' '}
                    <strong>
                      {screeningMode === 'COMPOUND_LIST'
                        ? t('catalogImport.compoundListMode')
                        : t('catalogImport.screeningLibraryKitMode')}
                    </strong>
                  </>
                )}
              </Alert>

              {isLoadingHeaders ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 4,
                  }}
                >
                  <CircularProgress />
                  <Typography sx={{ ml: 2 }}>{t('catalogImport.analyzingHeaders')}</Typography>
                </Box>
              ) : (
                <ColumnMappingStep
                  columns={headerColumns}
                  mapping={columnMapping}
                  onMappingChange={setColumnMapping}
                  isLoading={isLoadingHeaders || isStarting}
                  onBack={handleMappingBack}
                  onConfirm={handleStartImport}
                  importKind={importKind}
                  screeningMode={screeningMode || undefined}
                  defaultPlateId={screeningMode === 'PLATED_KIT' ? defaultPlateId : undefined}
                />
              )}

              {isStarting && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                  <CircularProgress size={20} />
                  <Typography>{t('catalogImport.startingImport')}</Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Step 3: Monitor Progress */}
          {activeStep === 3 && status && (
            <Box>
              <Typography variant="h6" gutterBottom>
                4. {t('catalogImport.importProgress')}
              </Typography>

              <CatalogImportProgress status={status} />

              {status.progress?.errors && status.progress.errors.length > 0 && (
                <CatalogImportErrors errors={status.progress.errors} />
              )}

              {isImportCompleted && (
                <Alert severity="success" sx={{ mt: 3 }}>
                  {t('catalogImport.importCompletedSuccess')}
                </Alert>
              )}

              {isImportFailed && (
                <Alert severity="error" sx={{ mt: 3 }}>
                  {t('catalogImport.importFailedMessage')}
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {activeStep === 0 && <Button onClick={handleClose}>{t('catalogImport.cancel')}</Button>}

        {activeStep === 1 && !status && (
          <>
            <Button onClick={handleReset} disabled={isLoadingHeaders}>
              {t('catalogImport.back')}
            </Button>
            <Button
              variant="contained"
              onClick={handleConfigureNext}
              disabled={!canProceedFromConfigure() || isLoadingHeaders}
              startIcon={isLoadingHeaders ? <CircularProgress size={16} /> : null}
            >
              {isLoadingHeaders ? t('catalogImport.loading') : t('catalogImport.next')}
            </Button>
          </>
        )}

        {/* Step 2 actions are handled by ColumnMappingStep component */}

        {activeStep === 3 && (
          <>
            {isImportInProgress && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowCancelConfirm(true)}
                disabled={isCancelling}
                startIcon={isCancelling ? <CircularProgress size={16} /> : null}
              >
                {isCancelling ? t('catalogImport.cancelling') : t('catalogImport.cancelImport')}
              </Button>
            )}
            {(isImportCompleted || isImportFailed) && (
              <>
                <Button onClick={handleReset} variant="outlined">
                  {t('catalogImport.importAnotherFile')}
                </Button>
                <Button onClick={handleClose} variant="contained">
                  {t('catalogImport.close')}
                </Button>
              </>
            )}
          </>
        )}
      </DialogActions>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelConfirm} onClose={() => setShowCancelConfirm(false)} maxWidth="xs">
        <DialogTitle>{t('catalogImport.cancelImportConfirm')}</DialogTitle>
        <DialogContent>
          <Typography>{t('catalogImport.cancelImportConfirmMessage')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelConfirm(false)} disabled={isCancelling}>
            {t('catalogImport.keepRunning')}
          </Button>
          <Button
            onClick={handleCancelImport}
            color="error"
            variant="contained"
            disabled={isCancelling}
            startIcon={isCancelling ? <CircularProgress size={16} /> : null}
          >
            {isCancelling ? t('catalogImport.cancelling') : t('catalogImport.cancelImport')}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

export default CatalogImportWizard;
