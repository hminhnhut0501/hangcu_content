'use client';

import React, { useState } from 'react';
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
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

// MOCK DATA for previewing UI since backend is down
const mockLogs = [
  { id: 1, timestamp: '2026-07-04 14:05:00', level: 'ERROR', message: 'Failed to post message to target group (Telegram flood wait)', entity: 'camp_1' },
  { id: 2, timestamp: '2026-07-04 13:30:15', level: 'INFO', message: 'Successfully forwarded 5 messages to Crypto VIP', entity: 'proj_2' },
  { id: 3, timestamp: '2026-07-04 12:00:00', level: 'WARNING', message: 'Rate limit approaching, delayed next post by 60s', entity: 'camp_3' },
  { id: 4, timestamp: '2026-07-04 10:15:30', level: 'INFO', message: 'Started background worker', entity: 'system' },
];

export default function LogsPage() {
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const displayLogs = mockLogs.filter(log => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getLevelColor = (level: string) => {
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
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Nhật ký hoạt động
        </Typography>
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
              {displayLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" color="text.secondary">{log.timestamp}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.level} 
                      size="small" 
                      color={getLevelColor(log.level) as any} 
                      variant="outlined"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ bgcolor: '#e2e8f0', px: 1, py: 0.5, borderRadius: 1 }}>
                      {log.entity}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{log.message}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {displayLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">Không tìm thấy nhật ký nào phù hợp.</Typography>
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
