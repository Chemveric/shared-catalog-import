/* eslint-disable no-console */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  CatalogImportMode,
  CatalogImportStatus,
  CatalogImportKind,
  ColumnMapping,
  HeaderPreviewResponse,
  ScreeningMode,
  PlateFormat,
} from './types';

// Re-export types for convenience
export type {
  CatalogImportMode,
  CatalogImportStatus,
  CatalogImportKind,
  ColumnMapping,
  HeaderPreviewResponse,
  ScreeningMode,
  PlateFormat,
} from './types';

export type { CatalogImportError, CatalogImportProgress } from './types';

/**
 * API configuration for the catalog import hook.
 * Allows different apps to provide their own API endpoints.
 */
export interface CatalogImportApiConfig {
  /** POST endpoint to start an import */
  startImportUrl: string;
  /** GET endpoint to check import status (receives jobId as parameter) */
  getStatusUrl: (jobId: string) => string;
  /** GET endpoint to list active imports for an organization */
  getActiveImportsUrl: (organizationId: string) => string;
  /** POST endpoint to preview file headers */
  previewHeadersUrl: string;
  /** DELETE endpoint to cancel an import job (receives jobId as parameter) */
  cancelImportUrl?: (jobId: string) => string;
  /**
   * Whether to include organizationId in request bodies.
   * Admin endpoints require it (default: true); supplier endpoints derive it from the session.
   */
  includeOrganizationId?: boolean;
}

/**
 * Parameters for starting a catalog import.
 */
export interface StartCatalogImportParams {
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

/**
 * Maps a flat API response (ImportStatusResponseDto) into the frontend
 * CatalogImportStatus shape with a nested `progress` object.
 */
function mapApiResponseToStatus(data: Record<string, unknown>): CatalogImportStatus {
  const valid = (data.valid as number) ?? 0;
  const invalid = (data.invalid as number) ?? 0;
  const total = (data.total as number) ?? 0;

  return {
    jobId: (data.jobId as string) ?? '',
    organizationId: (data.organizationId as string) ?? '',
    state: (data.state as CatalogImportStatus['state']) ?? 'queued',
    progressPct: (data.progressPct as number) ?? 0,
    stage: data.stage as CatalogImportStatus['stage'],
    message: data.message as string | undefined,
    failureReason: data.failureReason as string | undefined,
    errorsLocation: data.errorsLocation as string | undefined,
    progress: {
      total,
      processed: valid + invalid,
      inserted: (data.upsertedProducts as number) ?? 0,
      insertedCompounds: (data.insertedCompounds as number) ?? 0,
      updated: (data.upsertedPackages as number) ?? 0,
      errored: invalid,
      enqueuedAt: (data.enqueuedAt as string) ?? '',
      startedAt: data.startedAt as string | undefined,
      finishedAt: data.finishedAt as string | undefined,
    },
  };
}

/**
 * Hook for managing catalog import operations.
 *
 * @param organizationId - The organization ID for the import
 * @param apiConfig - API configuration for endpoints
 */
export function useCatalogImport(organizationId: string, apiConfig: CatalogImportApiConfig) {
  const [status, setStatus] = useState<CatalogImportStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const getStatus = useCallback(
    async (jobId: string) => {
      try {
        console.log('[IMPORT_DEBUG] getStatus called for jobId:', jobId);
        console.log('[IMPORT_DEBUG] getStatus URL:', apiConfig.getStatusUrl(jobId));
        const response = await fetch(apiConfig.getStatusUrl(jobId), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        console.log('[IMPORT_DEBUG] getStatus response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: 'Failed to get import status',
          }));
          console.log('[IMPORT_DEBUG] getStatus error:', errorData);
          throw new Error(errorData.message || 'Failed to get import status');
        }

        const data = await response.json();
        console.log('[IMPORT_DEBUG] getStatus response data:', JSON.stringify(data, null, 2));
        const mapped = mapApiResponseToStatus(data);
        setStatus(mapped);

        return mapped;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get import status';
        console.error('[IMPORT_DEBUG] getStatus exception:', err);
        setError(errorMessage);
        throw err;
      }
    },
    [apiConfig],
  );

  const startImport = useCallback(
    async (params: StartCatalogImportParams) => {
      try {
        setError(null);
        setStatus(null);
        setIsStarting(true);

        const requestBody: Record<string, unknown> = {
          fileId: params.fileId,
          mode: params.mode,
          importKind: params.importKind || 'BUILDING_BLOCK',
        };

        if (apiConfig.includeOrganizationId !== false) {
          requestBody.organizationId = organizationId;
        }

        // Add column mapping if provided
        if (params.columnMapping) {
          requestBody.columnMapping = params.columnMapping;
        }

        // Add screening-specific fields if provided
        if (params.screeningMode) {
          requestBody.screeningMode = params.screeningMode;
        }
        if (params.libraryName) {
          requestBody.libraryName = params.libraryName;
        }
        if (params.plateFormat) {
          requestBody.plateFormat = params.plateFormat;
        }
        if (params.defaultPlateId) {
          requestBody.defaultPlateId = params.defaultPlateId;
        }

        console.log('[IMPORT_DEBUG] startImport called');
        console.log('[IMPORT_DEBUG] startImport URL:', apiConfig.startImportUrl);
        console.log(
          '[IMPORT_DEBUG] startImport requestBody:',
          JSON.stringify(requestBody, null, 2),
        );

        const response = await fetch(apiConfig.startImportUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestBody),
        });

        console.log('[IMPORT_DEBUG] startImport response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: 'Failed to start catalog import',
          }));
          console.log('[IMPORT_DEBUG] startImport error response:', errorData);
          throw new Error(errorData.message || 'Failed to start catalog import');
        }

        const data = await response.json();
        console.log('[IMPORT_DEBUG] startImport success response:', JSON.stringify(data, null, 2));
        console.log('[IMPORT_DEBUG] jobId received:', data.jobId);
        jobIdRef.current = data.jobId;

        // Immediately fetch initial status
        console.log('[IMPORT_DEBUG] Fetching initial status for jobId:', data.jobId);
        await getStatus(data.jobId);

        return data.jobId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start catalog import';
        console.error('[IMPORT_DEBUG] startImport exception:', err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsStarting(false);
      }
    },
    [organizationId, apiConfig, getStatus],
  );

  const getActiveImports = useCallback(async () => {
    try {
      const response = await fetch(apiConfig.getActiveImportsUrl(organizationId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return data;
    } catch {
      return null;
    }
  }, [organizationId, apiConfig]);

  const previewHeaders = useCallback(
    async (fileId: string): Promise<HeaderPreviewResponse | null> => {
      try {
        console.log('[IMPORT_DEBUG] previewHeaders called for fileId:', fileId);
        console.log('[IMPORT_DEBUG] previewHeaders URL:', apiConfig.previewHeadersUrl);
        console.log('[IMPORT_DEBUG] previewHeaders organizationId:', organizationId);
        const previewBody: Record<string, unknown> = { fileId };
        if (apiConfig.includeOrganizationId !== false) {
          previewBody.organizationId = organizationId;
        }
        const response = await fetch(apiConfig.previewHeadersUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(previewBody),
        });
        console.log('[IMPORT_DEBUG] previewHeaders response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: 'Failed to preview headers',
          }));
          console.error(
            '[IMPORT_DEBUG] previewHeaders error response body:',
            JSON.stringify(errorData, null, 2),
          );
          throw new Error(errorData.message || 'Failed to preview headers');
        }

        const data = await response.json();

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to preview headers';
        console.error('[IMPORT_DEBUG] previewHeaders exception:', err);
        setError(errorMessage);

        return null;
      }
    },
    [apiConfig, organizationId],
  );

  const cancelImport = useCallback(
    async (jobId: string) => {
      if (!apiConfig.cancelImportUrl) {
        console.error('[IMPORT_DEBUG] cancelImportUrl not configured');
        throw new Error('Cancel import not supported');
      }

      try {
        setIsCancelling(true);
        console.log('[IMPORT_DEBUG] cancelImport called for jobId:', jobId);
        const response = await fetch(apiConfig.cancelImportUrl(jobId), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            message: 'Failed to cancel import',
          }));
          throw new Error(errorData.message || 'Failed to cancel import');
        }

        const data = await response.json();
        console.log('[IMPORT_DEBUG] cancelImport result:', data);

        if (data.cancelled) {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setIsPolling(false);
          // Refresh status
          await getStatus(jobId);
        }

        return data.cancelled as boolean;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel import';
        console.error('[IMPORT_DEBUG] cancelImport exception:', err);
        setError(errorMessage);
        throw err;
      } finally {
        setIsCancelling(false);
      }
    },
    [apiConfig, getStatus],
  );

  const reset = useCallback(() => {
    setStatus(null);
    setError(null);
    setIsPolling(false);
    setIsCancelling(false);
    jobIdRef.current = null;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Auto-poll when job is active
  useEffect(() => {
    const currentJobId = jobIdRef.current;
    if (!currentJobId || !status) return;

    if (status.state === 'completed' || status.state === 'failed') {
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      return;
    }

    if (status.state === 'queued' || status.state === 'active') {
      setIsPolling(true);

      // Poll every 2 seconds
      pollingIntervalRef.current = setInterval(async () => {
        try {
          await getStatus(currentJobId);
        } catch (err) {
          console.error('Error polling catalog import status:', err);
        }
      }, 2000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [status, getStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    startImport,
    cancelImport,
    getStatus,
    getActiveImports,
    previewHeaders,
    reset,
    status,
    isPolling,
    isStarting,
    isCancelling,
    error,
  };
}
