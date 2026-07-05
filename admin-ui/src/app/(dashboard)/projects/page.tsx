'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { fetchApi, fetcher } from '../../../lib/api';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

type ProjectRow = {
  id?: string;
  name: string;
  description?: string | null;
  status?: string | null;
  sort_order?: number | null;
};

export default function ProjectsPage() {
  const { data: projects, mutate } = useSWR<ProjectRow[]>('/api/groups?limit=100', fetcher);
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });
  const [editingItem, setEditingItem] = useState<ProjectRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá project này?')) return;
    try {
      await fetchApi(`/api/groups/${id}`, { method: 'DELETE' });
      setToast({ show: true, msg: 'Xoá thành công.', type: 'success' });
      mutate();
    } catch {
      setToast({ show: true, msg: 'Lỗi khi xoá.', type: 'error' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      if (isCreating) {
        await fetchApi('/api/groups', {
          method: 'POST',
          body: JSON.stringify({ name: editingItem.name.trim() }),
        });
      } else {
        if (!editingItem.id) return;
        await fetchApi(`/api/groups/${editingItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: editingItem.name.trim(),
          }),
        });
      }
      setToast({ show: true, msg: 'Lưu thành công.', type: 'success' });
      setEditingItem(null);
      setIsCreating(false);
      mutate();
    } catch {
      setToast({ show: true, msg: 'Lưu thất bại.', type: 'error' });
    }
  };

  const displayProjects: ProjectRow[] = projects || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Projects</Typography>
          <Typography variant="body2" color="text.secondary">Chỉ là nhóm quản lý để gom topics và campaigns con.</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setIsCreating(true);
            setEditingItem({ name: '' });
          }}
        >
          Tạo project
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Tên project</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayProjects.map((project) => (
                <TableRow key={project.id || project.name} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{project.id}</Typography>
                  </TableCell>
                  <TableCell>{project.status || 'active'}</TableCell>
                  <TableCell align="right">
                    <IconButton color="info" onClick={() => { setIsCreating(false); setEditingItem(project); }} title="Sửa">
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => project.id && handleDelete(project.id)} title="Xoá">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {displayProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">Chưa có project nào.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleSave}>
          <DialogTitle>{isCreating ? 'Tạo project' : 'Sửa project'}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <TextField
                label="Tên project"
                fullWidth
                required
                value={editingItem?.name || ''}
                onChange={(e) => editingItem && setEditingItem({ ...editingItem, name: e.target.value })}
                helperText="Project chỉ để quản lý, không cần source/target link."
              />
              <TextField
                label="Ghi chú"
                fullWidth
                multiline
                minRows={3}
                value={editingItem?.description || ''}
                onChange={(e) => editingItem && setEditingItem({ ...editingItem, description: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingItem(null)}>Huỷ</Button>
            <Button type="submit" variant="contained">Lưu</Button>
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
