'use client';

import React, { useMemo, useState } from 'react';
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
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { detectTelegramIntent, parseTelegramLink, suggestTelegramTitle, type TelegramLinkParse } from '../../../lib/telegram-link';

type GroupRow = {
  id?: string;
  name: string;
  source_link?: string | null;
  target_link?: string | null;
  auto_enabled?: boolean | null;
};

export default function ProjectsPage() {
  const { data: groups, mutate } = useSWR<GroupRow[]>('/api/groups?limit=100', fetcher);
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({ show: false, msg: '', type: 'success' });
  const [editingItem, setEditingItem] = useState<GroupRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');

  const linkParse = useMemo(() => parseTelegramLink(linkDraft), [linkDraft]);
  const sourceParse = useMemo(() => parseTelegramLink(editingItem?.source_link || ''), [editingItem?.source_link]);
  const targetParse = useMemo(() => parseTelegramLink(editingItem?.target_link || ''), [editingItem?.target_link]);
  const pastedIntent = useMemo(() => detectTelegramIntent(linkParse), [linkParse]);

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá dự án này?')) return;
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
        await fetchApi(`/api/groups`, {
          method: 'POST',
          body: JSON.stringify({
            name: editingItem.name,
            source_link: editingItem.source_link,
            target_link: editingItem.target_link,
          })
        });
      } else {
        if (!editingItem.id) return;
        await fetchApi(`/api/groups/${editingItem.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: editingItem.name,
            source_link: editingItem.source_link,
            target_link: editingItem.target_link,
            auto_enabled: editingItem.auto_enabled,
          })
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

  const displayGroups: GroupRow[] = groups || [];
  const autoName = useMemo(() => {
    if (linkParse.chatSlug && linkParse.kind !== 'unknown') {
      return linkParse.topicId ? `${linkParse.chatSlug}-${linkParse.topicId}` : linkParse.chatSlug;
    }
    return '';
  }, [linkParse.chatSlug, linkParse.kind, linkParse.topicId]);

  const handlePasteAndDetect = () => {
    const pasted = window.prompt('Dán link Telegram vào đây');
    if (!pasted) return;
    const parsed = parseTelegramLink(pasted);
    if (!parsed.ok) {
      setToast({ show: true, msg: parsed.detail, type: 'error' });
      return;
    }
    setIsCreating(true);
    setLinkDraft(parsed.normalized);
    setEditingItem((current) => ({
      id: current?.id,
      name: current?.name?.trim() ? current.name : suggestTelegramTitle(parsed, 'Project'),
      source_link: (detectTelegramIntent(parsed) === 'source' ? parsed.normalized : current?.source_link) || parsed.normalized,
      target_link: (detectTelegramIntent(parsed) === 'target' ? parsed.normalized : current?.target_link) || parsed.normalized,
      auto_enabled: current?.auto_enabled ?? false,
    }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Dự án & Kênh
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={handlePasteAndDetect}>Paste & detect</Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => {
              setIsCreating(true);
              setLinkDraft('');
              setEditingItem({ name: '', source_link: '', target_link: '' });
            }}
          >
            Thêm Dự án
          </Button>
        </Box>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Tên dự án</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Nguồn (Source)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Đích (Target)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Auto Push</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayGroups.map((group) => (
                <TableRow key={group.id || group.name} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{group.name || 'No name'}</Typography>
                    <Typography variant="caption" color="text.secondary">{group.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.source_link || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.target_link || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={group.auto_enabled ? 'Bật' : 'Tắt'} 
                      size="small"
                      color={group.auto_enabled ? 'info' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color="info" onClick={() => {
                      setIsCreating(false);
                      setEditingItem(group);
                    }} title="Sửa">
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => group.id && handleDelete(group.id)} title="Xoá">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {(!displayGroups || displayGroups.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">Chưa có dự án nào.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={!!editingItem} onClose={() => setEditingItem(null)} fullWidth maxWidth="sm">
        <form onSubmit={handleSave}>
          <DialogTitle>{isCreating ? 'Thêm Dự án mới' : 'Sửa Dự án'}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              <TextField 
                label="Tên dự án" 
                fullWidth 
                required
                value={editingItem?.name || ''}
                onChange={e => editingItem && setEditingItem({ ...editingItem, name: e.target.value })}
                helperText={autoName ? `Auto-detect gợi ý: ${autoName}` : 'Tên dự án nên mô tả rõ group/channel.'}
              />
              <TextField 
                label="Nguồn (Source Link)" 
                fullWidth 
                value={editingItem?.source_link || ''}
                onChange={e => editingItem && setEditingItem({ ...editingItem, source_link: e.target.value })}
                helperText={sourceParse.detail}
                error={Boolean(editingItem?.source_link?.trim() && !sourceParse.ok)}
              />
              <TextField 
                label="Đích (Target Link)" 
                fullWidth 
                value={editingItem?.target_link || ''}
                onChange={e => editingItem && setEditingItem({ ...editingItem, target_link: e.target.value })}
                helperText={targetParse.detail}
                error={Boolean(editingItem?.target_link?.trim() && !targetParse.ok)}
              />
              {(editingItem?.source_link?.trim() && !sourceParse.ok || editingItem?.target_link?.trim() && !targetParse.ok) && (
                <Alert severity="error" variant="outlined">
                  Link dự án đang sai format Telegram hoặc không đủ thông tin để xác định channel/group/topic. Hãy dán link chuẩn t.me.
                </Alert>
              )}
              {linkDraft && (
                <Alert severity={pastedIntent === 'unknown' ? 'warning' : 'info'} variant="outlined">
                  {pastedIntent === 'target' && 'Paste này hợp với đích (channel/group/root).'}
                  {pastedIntent === 'source' && 'Paste này hợp với nguồn (message/topic).'}
                  {pastedIntent === 'topic-seed' && 'Paste này có vẻ là topic seed.'}
                  {pastedIntent === 'unknown' && 'Chưa map được vai trò link này.'}
                </Alert>
              )}
              {!isCreating && (
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={editingItem?.auto_enabled || false}
                      onChange={e => editingItem && setEditingItem({ ...editingItem, auto_enabled: e.target.checked })}
                    />
                  } 
                  label="Tự động Push (Auto Push)" 
                />
              )}
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
