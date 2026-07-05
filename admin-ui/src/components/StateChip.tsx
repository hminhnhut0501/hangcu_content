'use client';

import React from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

type StateTone = 'success' | 'warning' | 'error' | 'info' | 'default';

type Props = {
  label: string;
  tone?: StateTone;
  tooltip?: string;
  outlined?: boolean;
  compact?: boolean;
};

export default function StateChip({ label, tone = 'default', tooltip, outlined = false, compact = false }: Props) {
  const chip = (
    <Chip
      label={label}
      color={tone}
      size={compact ? 'small' : 'small'}
      variant={outlined ? 'outlined' : 'filled'}
      sx={{
        borderRadius: 999,
        fontWeight: 800,
        letterSpacing: 0.2,
        '& .MuiChip-label': {
          px: compact ? 1 : 1.25,
        },
      }}
    />
  );

  if (!tooltip) return chip;
  return <Tooltip title={tooltip} arrow>{chip}</Tooltip>;
}
