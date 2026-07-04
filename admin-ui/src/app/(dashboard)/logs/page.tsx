'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '../../../lib/api';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Chip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
type LogRow = {
  id: number;
  created_at: string;
  level: string;
  code: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
};

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString('vi-VN', { hour12: false });
  } catch {
    return value;
  }
}

export default function LogsPage() {
  const { data, isLoading, error } = useSWR<LogRow[]>('/api/logs?limit=100', fetcher);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const displayLogs = (data || []).filter((log) => {
    if (levelFilter !== 'ALL' && String(log.level || '').toUpperCase() !== levelFilter) return false;
    if (search) {
      const haystack = [log.message, log.code, log.entity_type, log.entity_id].join(' ').toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const getLevelColor = (level: string): ChipProps['color'] => {
    switch (level) {
      case 'ERROR': return 'error';
      case 'WARNING': return 'warning';
      case 'INFO': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Nhật ký hoạt động
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Dữ liệu thật từ `content_events`.
          </Typography>
        </Box>
      </Box>

      <Card sx={{ mb: 3, p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField 
          label="Tìm kiếm log" 
          variant="outlined" 
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1 }}
          slotProps={{
            input: {
              endAdornment: <SearchIcon color="action" />
            }
          }}
        />
        <TextField
          select
          label="Mức độ (Level)"
          size="small"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          sx={{ width: 150 }}
        >
          <MenuItem value="ALL">Tất cả</MenuItem>
          <MenuItem value="INFO">Thông báo (INFO)</MenuItem>
          <MenuItem value="WARNING">Cảnh báo (WARN)</MenuItem>
          <MenuItem value="ERROR">Lỗi (ERROR)</MenuItem>
        </TextField>
        <IconButton color="primary">
          <FilterListIcon />
        </IconButton>
      </Card>

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Thời gian</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Mức độ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Thực thể (Entity)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Thông điệp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">Đang tải logs...</Typography>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && displayLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" color="text.secondary">{formatTime(log.created_at)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={String(log.level || '').toUpperCase()} 
                      size="small" 
                      color={getLevelColor(log.level)} 
                      variant="outlined"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ bgcolor: '#e2e8f0', px: 1, py: 0.5, borderRadius: 1 }}>
                      {(log.entity_type || 'system') + (log.entity_id ? `:${log.entity_id}` : '')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.message}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && displayLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">
                      {error ? 'Không tải được nhật ký.' : 'Không có nhật ký nào phù hợp.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
