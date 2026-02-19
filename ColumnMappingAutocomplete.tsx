import { useState, useMemo } from 'react';
import {
  Autocomplete,
  Box,
  Chip,
  Paper,
  TextField,
  type AutocompleteRenderOptionState,
  type FilterOptionsState,
} from '@mui/material';
import { ColumnMappingKind, MappingOptionGroup, MAPPING_LABELS } from './types';

/** Flat option used by the Autocomplete. */
export interface MappingOption {
  kind: ColumnMappingKind;
  label: string;
  group: string;
}

interface ColumnMappingAutocompleteProps {
  value: ColumnMappingKind;
  onChange: (value: ColumnMappingKind) => void;
  optionGroups: MappingOptionGroup[];
  disabled?: boolean;
}

/** Build a flat list of MappingOption from grouped option arrays. */
function buildOptions(groups: MappingOptionGroup[]): MappingOption[] {
  const options: MappingOption[] = [];
  for (const g of groups) {
    for (const kind of g.options) {
      if (kind === 'ignore') continue; // handled separately
      options.push({ kind, label: MAPPING_LABELS[kind], group: g.group });
    }
  }

  return options;
}

const IGNORE_OPTION: MappingOption = {
  kind: 'ignore',
  label: MAPPING_LABELS.ignore,
  group: 'Other',
};

/**
 * Searchable Autocomplete for column mapping with grouped options and
 * category filter chips.  Designed to handle 40+ mapping options
 * without overwhelming the user.
 */
export default function ColumnMappingAutocomplete({
  value,
  onChange,
  optionGroups,
  disabled = false,
}: ColumnMappingAutocompleteProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const allOptions = useMemo(() => buildOptions(optionGroups), [optionGroups]);
  const categories = useMemo(
    () => [...new Set(optionGroups.map((g) => g.group).filter((g) => g !== 'Other'))],
    [optionGroups],
  );

  // Resolve the currently selected option (or fall back to Ignore)
  const selectedOption = useMemo(
    () => allOptions.find((o) => o.kind === value) ?? IGNORE_OPTION,
    [allOptions, value],
  );

  /** Custom filter: search by label + kind, respect activeCategory chip. */
  const filterOptions = (
    options: MappingOption[],
    state: FilterOptionsState<MappingOption>,
  ): MappingOption[] => {
    const query = state.inputValue.toLowerCase().trim();

    let filtered = options.filter((o) => {
      if (o.kind === 'ignore') return false; // appended at the end always
      const matchesCategory = !activeCategory || o.group === activeCategory;
      if (!matchesCategory) return false;
      if (!query) return true;

      return o.label.toLowerCase().includes(query) || o.kind.toLowerCase().includes(query);
    });

    // Always append Ignore at the bottom
    filtered = [...filtered, IGNORE_OPTION];

    return filtered;
  };

  /** Custom Paper with category filter chips at the top. */
  const CustomPaper = (props: React.HTMLAttributes<HTMLElement>) => (
    <Paper {...props} elevation={8} sx={{ borderRadius: 2 }}>
      {/* Category filter chips */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          px: 1.5,
          pt: 1.5,
          pb: 0.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Chip
          label="All"
          size="small"
          variant={activeCategory === null ? 'filled' : 'outlined'}
          color={activeCategory === null ? 'primary' : 'default'}
          onClick={() => setActiveCategory(null)}
          sx={{ fontSize: 12 }}
        />
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            size="small"
            variant={activeCategory === cat ? 'filled' : 'outlined'}
            color={activeCategory === cat ? 'primary' : 'default'}
            onClick={() => setActiveCategory((prev) => (prev === cat ? null : cat))}
            sx={{ fontSize: 12 }}
          />
        ))}
      </Box>
      {props.children}
    </Paper>
  );

  return (
    <Autocomplete<MappingOption, false, true, false>
      size="small"
      disableClearable
      openOnFocus
      value={selectedOption}
      options={allOptions}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, val) => option.kind === val.kind}
      filterOptions={filterOptions}
      onChange={(_event, newValue) => {
        if (newValue) onChange(newValue.kind);
      }}
      onClose={() => setActiveCategory(null)}
      disabled={disabled}
      PaperComponent={CustomPaper}
      renderOption={(
        props: React.HTMLAttributes<HTMLLIElement>,
        option: MappingOption,
        _state: AutocompleteRenderOptionState,
      ) => {
        const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string };

        return (
          <li
            key={key}
            {...rest}
            style={{
              ...(option.kind === 'ignore' ? { color: '#d32f2f', fontWeight: 500 } : {}),
            }}
          >
            {option.label}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search..."
          sx={{
            minWidth: 220,
            '& .MuiInputBase-root': {
              ...(value === 'ignore' && {
                color: 'error.main',
              }),
            },
          }}
        />
      )}
      sx={{ minWidth: 220 }}
    />
  );
}
