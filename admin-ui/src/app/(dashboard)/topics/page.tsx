'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetchApi, fetcher } from '../../../lib/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import { detectTelegramIntent, parseTelegramLink, suggestTelegramTitle, type TelegramLinkParse } from '../../../lib/telegram-link';
import TelegramPasteDialog from '../../../components/TelegramPasteDialog';

type GroupRow = { id: string; name: string };
type TopicRow = {
  id: string;
  group_id: string;
  name: string;
  source_topic_id?: number | null;
  target_topic_id?: number | null;
  target_link_seed?: string | null;
  sort_order?: number | null;
};

export default function TopicsPage() {
  const { data: groups } = useSWR('/api/groups?limit=100', fetcher);
  const { data: topics, mutate } = useSWR('/api/topics?limit=200', fetcher);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [editingTopic, setEditingTopic] = useState<TopicRow | null>(null);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [topicForm, setTopicForm] = useState({ name: '', source_topic_id: '', target_topic_id: '', target_link_seed: '' });
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });

  const displayGroups: GroupRow[] = groups || [];
  const displayTopics = useMemo(() => {
    const rows: TopicRow[] = topics || [];
    if (!selectedGroupId) return rows;
    return rows.filter((topic) => topic.group_id === selectedGroupId);
  }, [topics, selectedGroupId]);

  const selectedTopic = displayTopics.find((topic) => topic.id === selectedTopicId) || displayTopics[0] || null;
  const topicSeedParse = useMemo(() => parseTelegramLink(topicForm.target_link_seed), [topicForm.target_link_seed]);
  const autoName = useMemo(() => {
    if (topicSeedParse.chatSlug && topicSeedParse.kind !== 'unknown') {
      return topicSeedParse.topicId ? `${topicSeedParse.chatSlug}-${topicSeedParse.topicId}` : topicSeedParse.chatSlug;
    }
    return '';
  }, [topicSeedParse.chatSlug, topicSeedParse.kind, topicSeedParse.topicId]);

  const notify = (msg: string, type: 'success' | 'error') => setToast({ show: true, msg, type });
  const updateEditingTopic = (patch: Partial<TopicRow>) => {
    setEditingTopic((current) => current ? { ...current, ...patch } : current);
  };

  const createTopic = async () => {
    if (!selectedGroupId || !topicForm.name.trim()) return;
    try {
      await fetchApi(`/api/topics/groups/${selectedGroupId}`, {
        method: 'POST',
        body: JSON.stringify({
          name: topicForm.name,
          target_link_seed: topicForm.target_link_seed || null,
        }),
      });
      setTopicForm({ name: '', source_topic_id: '', target_topic_id: '', target_link_seed: '' });
      setTopicDialogOpen(false);
      await mutate();
      notify('Đã tạo topic mới.', 'success');
    } catch {
      notify('Không thể tạo topic.', 'error');
    }
  };

  const updateTopicField = (field: keyof typeof topicForm, value: string) => {
    setTopicForm((current) => ({ ...current, [field]: value }));
    if (field === 'target_link_seed' && !topicForm.name.trim()) {
      const parsed = parseTelegramLink(value);
      if (parsed.chatSlug) {
        setTopicForm((current) => ({ ...current, name: parsed.topicId ? `${parsed.chatSlug}-${parsed.topicId}` : (parsed.chatSlug || '') }));
      }
    }
  };

  const handlePasteApply = (payload: {
    parsed: TelegramLinkParse;
    title?: string;
    targetLink?: string;
    sourceStartLink?: string;
    sourceEndLink?: string;
    targetLinkSeed?: string;
  }) => {
    const intent = detectTelegramIntent(payload.parsed);
    if (intent === 'topic-seed' || payload.targetLinkSeed) {
      setTopicForm((current) => ({
        ...current,
        target_link_seed: payload.targetLinkSeed || payload.parsed.normalized,
        name: current.name.trim() ? current.name : (payload.title || suggestTelegramTitle(payload.parsed, 'Topic')),
      }));
      return;
    }
    if (payload.sourceStartLink || intent === 'source') {
      setTopicForm((current) => ({
        ...current,
        name: current.name.trim() ? current.name : (payload.title || suggestTelegramTitle(payload.parsed, 'Topic')),
        target_link_seed: current.target_link_seed.trim() ? current.target_link_seed : (payload.targetLinkSeed || payload.parsed.normalized),
      }));
      return;
    }
    setTopicForm((current) => ({
      ...current,
      target_link_seed: payload.targetLinkSeed || payload.parsed.normalized,
      name: current.name.trim() ? current.name : (payload.title || suggestTelegramTitle(payload.parsed, 'Topic')),
    }));
  };

  const saveTopic = async () => {
    if (!editingTopic) return;
    try {
      await fetchApi(`/api/topics/${editingTopic.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingTopic.name,
          target_link_seed: editingTopic.target_link_seed || null,
          sort_order: editingTopic.sort_order ?? 0,
        }),
      });
      setEditingTopic(null);
      await mutate();
      notify('Đã lưu thay đổi topic.', 'success');
    } catch {
      notify('Không thể cập nhật topic.', 'error');
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá topic này?')) return;
    try {
      await fetchApi(`/api/topics/${topicId}`, { method: 'DELETE' });
      await mutate();
      notify('Đã xoá topic.', 'success');
    } catch {
      notify('Không thể xoá topic.', 'error');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Topics</Typography>
          <Typography variant="body2" color="text.secondary">Quản lý topic và tạo campaign thật từ topic đã chọn.</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => setPasteDialogOpen(true)}>Paste & detect</Button>
          <Button variant="outlined" onClick={() => setTopicDialogOpen(true)} startIcon={<AddIcon />}>Tạo topic</Button>
        </Box>
      </Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Filter theo group</Typography>
            <TextField select fullWidth value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} label="Group">
              <MenuItem value="">Tất cả</MenuItem>
              {displayGroups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
            </TextField>
          </Card>
          <Card>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Topic</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {displayTopics.map((topic) => (
                    <TableRow key={topic.id} hover selected={selectedTopicId === topic.id} onClick={() => setSelectedTopicId(topic.id)}>
                      <TableCell>
                        <Typography sx={{ fontWeight: 600 }}>{topic.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{topic.id}</Typography>
                        <Box sx={{ mt: 1 }}><Chip size="small" label={`Group ${topic.group_id}`} /></Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingTopic(topic); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteTopic(topic.id); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>Topic workspace</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedTopic ? `Đang chọn ${selectedTopic.name}` : 'Chọn một topic để xem thông tin.'}
            </Typography>
            <Alert severity="info" variant="outlined">
              Topics chỉ giữ tên và target link seed. Builder campaign đã được tách sang màn Campaign để tránh lẫn luồng.
            </Alert>
      </Card>
    </Grid>
  </Grid>

  <Dialog open={topicDialogOpen} onClose={() => setTopicDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Tạo topic mới</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField select label="Group" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} fullWidth>
            {displayGroups.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </TextField>
          <TextField
            label="Tên topic"
            value={topicForm.name}
            onChange={e => setTopicForm({ ...topicForm, name: e.target.value })}
            fullWidth
            helperText={topicSeedParse.ok ? `Auto-detect: ${topicSeedParse.label}` : 'Đặt tên topic rõ ràng, hoặc dán target link seed để gợi ý.'}
          />
          <TextField
            label="Target link seed"
            value={topicForm.target_link_seed}
            onChange={e => updateTopicField('target_link_seed', e.target.value)}
            fullWidth
            helperText={topicSeedParse.detail}
            error={Boolean(topicForm.target_link_seed.trim() && !topicSeedParse.ok)}
          />
          {topicForm.target_link_seed.trim() && (
            <Alert severity={topicSeedParse.ok ? 'info' : 'error'} variant="outlined">
              {topicSeedParse.ok
                ? `Parser nhận diện: ${topicSeedParse.label}${topicSeedParse.topicId ? `, topic ${topicSeedParse.topicId}` : ''}.`
                : `Link seed không hợp lệ: ${topicSeedParse.detail}`}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopicDialogOpen(false)}>Huỷ</Button>
          <Button onClick={createTopic} variant="contained">Lưu topic</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editingTopic} onClose={() => setEditingTopic(null)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa topic</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Tên topic"
            value={editingTopic?.name || ''}
            onChange={e => updateEditingTopic({ name: e.target.value })}
            fullWidth
          />
          <TextField label="Target link seed" value={editingTopic?.target_link_seed || ''} onChange={e => updateEditingTopic({ target_link_seed: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTopic(null)}>Huỷ</Button>
          <Button onClick={saveTopic} variant="contained">Lưu topic</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.show} autoHideDuration={2800} onClose={() => setToast({ ...toast, show: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.type} variant="filled" sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>

      <TelegramPasteDialog
        open={pasteDialogOpen}
        mode="topic"
        onClose={() => setPasteDialogOpen(false)}
        onApply={handlePasteApply}
      />
    </Box>
  );
}
