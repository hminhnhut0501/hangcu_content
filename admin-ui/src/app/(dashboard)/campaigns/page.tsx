'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { fetcher, fetchApi } from '../../../lib/api';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Grid from "@mui/material/Grid";
import CardContent from "@mui/material/CardContent";
import AddIcon from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

import SendIcon from '@mui/icons-material/Send';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GroupsIcon from '@mui/icons-material/Groups';

export default function CampaignsPage() {
  const { data: campaigns, error, isLoading, mutate } = useSWR('/api/campaigns?limit=100', fetcher);
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({ show: false, msg: '', type: 'success' });
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleRun = async (id: string) => {
    try {
      await fetchApi(`/api/campaigns/${id}/run`, { method: 'POST' });
      setToast({ show: true, msg: 'Đã đưa chiến dịch vào hàng đợi chạy!', type: 'success' });
      mutate();
    } catch (err) {
      setToast({ show: true, msg: 'Lỗi khi chạy chiến dịch.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá chiến dịch này?')) return;
    try {
      await fetchApi(`/api/campaigns/${id}`, { method: 'DELETE' });
      setToast({ show: true, msg: 'Xoá thành công.', type: 'success' });
      mutate();
    } catch (err) {
      setToast({ show: true, msg: 'Lỗi khi xoá.', type: 'error' });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi(`/api/campaigns/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editingItem.title,
          target_link: editingItem.target_link,
          schedule_enabled: editingItem.schedule_enabled,
        })
      });
      setToast({ show: true, msg: 'Cập nhật thành công.', type: 'success' });
      setEditingItem(null);
      mutate();
    } catch (err) {
      setToast({ show: true, msg: 'Cập nhật thất bại.', type: 'error' });
    }
  };

  const mockCampaigns = [
    { id: 'camp_1', title: 'Chiến dịch Auto Post Telegram', target_link: 'https://t.me/channel1', status: 'active', schedule_enabled: true },
    { id: 'camp_2', title: 'Chiến dịch Forward Tin Tức', target_link: 'https://t.me/news', status: 'draft', schedule_enabled: false },
    { id: 'camp_3', title: 'Khuyến mãi cuối tuần', target_link: 'https://t.me/deals', status: 'active', schedule_enabled: true },
  ];

  const displayCampaigns = (!campaigns || error) ? mockCampaigns : campaigns;

  const topStats = [
    { label: 'CAMPAIGN', value: displayCampaigns.length, color: '#0ea5e9', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', bgcolor: '#e0f2fe', icon: <SendIcon sx={{ color: '#fff' }} /> },
    { label: 'ĐANG CHẠY', value: displayCampaigns.filter((c:any) => c.status === 'active').length, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', bgcolor: '#ede9fe', icon: <PlayCircleIcon sx={{ color: '#fff' }} /> },
    { label: 'ĐÃ GỬI', value: 0, color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', bgcolor: '#fef3c7', icon: <DoneAllIcon sx={{ color: '#fff' }} /> },
    { label: 'PREVIEW NHẬN', value: 314, color: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)', bgcolor: '#eff6ff', icon: <GroupsIcon sx={{ color: '#fff' }} /> },
  ];

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
        Dashboard vận hành: nhóm nhận link, đơn hàng, coupon, sale và nội dung bot.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {topStats.map((stat, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
            <Card sx={{ 
              borderRadius: 4, 
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', 
              border: '1px solid rgba(226, 232, 240, 0.8)',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                borderColor: stat.color,
              }
            }}>
              <Box sx={{ width: '100%', height: '4px', background: stat.gradient }} />
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ 
                    width: 44, 
                    height: 44, 
                    borderRadius: '12px', 
                    background: stat.gradient, 
                    boxShadow: `0 4px 10px ${stat.color}40`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#64748b', letterSpacing: 0.5 }}>
                    {stat.label}
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 900, color: '#0f172a' }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ borderRadius: 3, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>Danh sách campaign</Typography>
              <Typography variant="body2" color="text.secondary">Tạo campaign mới hoặc bấm tên campaign để xem danh sách người nhận và trạng thái từng người.</Typography>
            </Box>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => {
                setIsCreating(true);
                setEditingItem({ title: '', target_link: '' });
              }}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', px: 3, bgcolor: '#0088ff' }}
            >
              Tạo campaign
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label="Preview: 314 người" size="small" sx={{ bgcolor: '#f1f5f9', fontWeight: 'bold' }} />
            <Chip label={`Active: ${displayCampaigns.filter((c:any) => c.status === 'active').length}`} size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 'bold' }} />
            <Chip label="Hết hạn: 0" size="small" sx={{ bgcolor: '#ffedd5', color: '#9a3412', fontWeight: 'bold' }} />
            <Chip label="Chưa mua: 233" size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 'bold' }} />
          </Box>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>CAMPAIGN</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>TỆP</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>TRẠNG THÁI</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b' }}>LỊCH GỬI</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>THAO TÁC</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayCampaigns.map((camp: any) => (
                <TableRow key={camp.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>{camp.title || 'No title'}</Typography>
                    <Typography variant="caption" color="text.secondary">{camp.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {camp.target_link || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={camp.status} 
                      size="small"
                      sx={{ 
                        bgcolor: camp.status === 'active' ? '#dcfce7' : '#f1f5f9',
                        color: camp.status === 'active' ? '#166534' : '#475569',
                        fontWeight: 'bold',
                        fontSize: '0.7rem'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={camp.schedule_enabled ? 'Đã lên lịch' : 'Gửi ngay'} 
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="primary" sx={{ mr: 1 }} onClick={() => setEditingItem(camp)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(camp.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {(!displayCampaigns || displayCampaigns.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" variant="body2">Chưa có dữ liệu. Bấm nút thêm mới để tạo.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleSaveEdit}>
          <DialogTitle>Sửa chiến dịch</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              <TextField 
                label="Tên chiến dịch" 
                fullWidth 
                value={editingItem?.title || ''}
                onChange={e => setEditingItem({...editingItem, title: e.target.value})}
              />
              <TextField 
                label="Target Link" 
                fullWidth 
                value={editingItem?.target_link || ''}
                onChange={e => setEditingItem({...editingItem, target_link: e.target.value})}
              />
              <FormControlLabel 
                control={
                  <Switch 
                    checked={editingItem?.schedule_enabled || false}
                    onChange={e => setEditingItem({...editingItem, schedule_enabled: e.target.checked})}
                  />
                } 
                label="Bật lịch gửi tự động" 
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingItem(null)}>Huỷ</Button>
            <Button type="submit" variant="contained">Lưu thay đổi</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar 
        open={toast.show} 
        autoHideDuration={3000} 
        onClose={() => setToast({ ...toast, show: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.type} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
