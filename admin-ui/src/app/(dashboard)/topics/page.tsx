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
type CampaignForm = {
  title: string;
  target_link: string;
  caption: string;
  source_start_link: string;
  source_end_link: string;
  follow_latest: boolean;
  group_mode: string;
  order_mode: string;
  batch_size: number;
  delay_min: number;
  delay_max: number;
  schedule_enabled: boolean;
  schedule_slots: string;
};


export default function TopicsPage() {
  const { data: groups } = useSWR('/api/groups?limit=100', fetcher);
  const { data: topics, mutate } = useSWR('/api/topics?limit=200', fetcher);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [editingTopic, setEditingTopic] = useState<TopicRow | null>(null);
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [campaignTopicId, setCampaignTopicId] = useState('');
  const [topicForm, setTopicForm] = useState({ name: '', source_topic_id: '', target_topic_id: '', target_link_seed: '' });
  const [campaignForm, setCampaignForm] = useState<CampaignForm>({
    title: '',
    target_link: '',
    caption: '',
    source_start_link: '',
    source_end_link: '',
    follow_latest: true,
    group_mode: 'keep',
    order_mode: 'auto',
    batch_size: 1,
    delay_min: 1,
    delay_max: 7,
    schedule_enabled: false,
    schedule_slots: '',
  });
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' as 'success' | 'error' });

  const displayGroups: GroupRow[] = groups || [];
  const displayTopics = useMemo(() => {
    const rows: TopicRow[] = topics || [];
    if (!selectedGroupId) return rows;
    return rows.filter((topic) => topic.group_id === selectedGroupId);
  }, [topics, selectedGroupId]);

  const selectedTopic = displayTopics.find((topic) => topic.id === selectedTopicId) || displayTopics[0] || null;
  const topicSeedParse = useMemo(() => parseTelegramLink(topicForm.target_link_seed), [topicForm.target_link_seed]);
  const campaignTargetParse = useMemo(() => parseTelegramLink(campaignForm.target_link), [campaignForm.target_link]);
  const campaignSourceStartParse = useMemo(() => parseTelegramLink(campaignForm.source_start_link), [campaignForm.source_start_link]);
  const campaignSourceEndParse = useMemo(() => parseTelegramLink(campaignForm.source_end_link), [campaignForm.source_end_link]);
  const autoName = useMemo(() => {
    if (topicSeedParse.chatSlug && topicSeedParse.kind !== 'unknown') {
      return topicSeedParse.topicId ? `${topicSeedParse.chatSlug}-${topicSeedParse.topicId}` : topicSeedParse.chatSlug;
    }
    if (campaignTargetParse.chatSlug && campaignTargetParse.kind !== 'unknown') {
      return campaignTargetParse.topicId ? `${campaignTargetParse.chatSlug}-${campaignTargetParse.topicId}` : campaignTargetParse.chatSlug;
    }
    return '';
  }, [campaignTargetParse.chatSlug, campaignTargetParse.kind, campaignTargetParse.topicId, topicSeedParse.chatSlug, topicSeedParse.kind, topicSeedParse.topicId]);

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
          source_topic_id: topicForm.source_topic_id ? Number(topicForm.source_topic_id) : null,
          target_topic_id: topicForm.target_topic_id ? Number(topicForm.target_topic_id) : null,
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

  const updateCampaignField = (field: keyof CampaignForm, value: string | number | boolean) => {
    setCampaignForm((current) => ({ ...current, [field]: value } as CampaignForm));
    if (field === 'target_link' && typeof value === 'string' && !campaignForm.title.trim()) {
      const parsed = parseTelegramLink(value);
      if (parsed.chatSlug) {
        setCampaignForm((current) => ({ ...current, title: parsed.topicId ? `Campaign ${parsed.chatSlug}-${parsed.topicId}` : `Campaign ${parsed.chatSlug}` }));
      }
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

  const handlePasteAndDetect = () => {
    const pasted = window.prompt('Dán link Telegram vào đây');
    if (!pasted) return;
    const parsed = parseTelegramLink(pasted);
    if (!parsed.ok) {
      notify(parsed.detail, 'error');
      return;
    }
    const intent = detectTelegramIntent(parsed);
    if (intent === 'topic-seed') {
      setTopicForm((current) => ({
        ...current,
        target_link_seed: parsed.normalized,
        name: current.name.trim() ? current.name : suggestTelegramTitle(parsed, 'Topic'),
      }));
    } else if (intent === 'source') {
      setCampaignForm((current) => ({
        ...current,
        source_start_link: current.source_start_link.trim() ? current.source_start_link : parsed.normalized,
        title: current.title.trim() ? current.title : suggestTelegramTitle(parsed, 'Campaign'),
      }));
    } else {
      setCampaignForm((current) => ({
        ...current,
        target_link: current.target_link.trim() ? current.target_link : parsed.normalized,
        title: current.title.trim() ? current.title : suggestTelegramTitle(parsed, 'Campaign'),
      }));
    }
  };

  const saveTopic = async () => {
    if (!editingTopic) return;
    try {
      await fetchApi(`/api/topics/${editingTopic.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingTopic.name,
          source_topic_id: editingTopic.source_topic_id ? Number(editingTopic.source_topic_id) : null,
          target_topic_id: editingTopic.target_topic_id ? Number(editingTopic.target_topic_id) : null,
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

  const createCampaign = async () => {
    if (!campaignTopicId || !campaignForm.title.trim()) return;
    try {
      await fetchApi(`/api/campaigns/topics/${campaignTopicId}`, {
        method: 'POST',
        body: JSON.stringify({
          title: campaignForm.title,
          target_link: campaignForm.target_link || null,
          caption: campaignForm.caption || null,
          source_start_link: campaignForm.source_start_link || null,
          source_end_link: campaignForm.source_end_link || null,
          follow_latest: campaignForm.follow_latest,
          group_mode: campaignForm.group_mode,
          order_mode: campaignForm.order_mode,
          batch_size: Number(campaignForm.batch_size || 1),
          delay_min: Number(campaignForm.delay_min || 1),
          delay_max: Number(campaignForm.delay_max || 7),
          schedule_enabled: campaignForm.schedule_enabled,
          schedule_slots: campaignForm.schedule_slots,
        }),
      });
      setCampaignDialogOpen(false);
      setCampaignForm({
        title: '',
        target_link: '',
        caption: '',
        source_start_link: '',
        source_end_link: '',
        follow_latest: true,
        group_mode: 'keep',
        order_mode: 'auto',
        batch_size: 1,
        delay_min: 1,
        delay_max: 7,
        schedule_enabled: false,
        schedule_slots: '',
      });
      notify('Đã tạo campaign.', 'success');
    } catch {
      notify('Không thể tạo campaign.', 'error');
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
          <Button variant="outlined" onClick={handlePasteAndDetect}>Paste & detect</Button>
          <Button variant="outlined" onClick={() => setTopicDialogOpen(true)} startIcon={<AddIcon />}>Tạo topic</Button>
          <Button variant="contained" onClick={() => setCampaignDialogOpen(true)} startIcon={<SendIcon />}>Tạo campaign</Button>
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
              {selectedTopic ? `Đang chọn ${selectedTopic.name}` : 'Chọn một topic để tiếp tục tạo campaign.'}
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                if (selectedTopic) {
                  setCampaignTopicId(selectedTopic.id);
                  setCampaignDialogOpen(true);
                }
              }}
              disabled={!selectedTopic}
            >
              Tạo campaign cho topic này
            </Button>
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
          <TextField label="Source topic id" value={topicForm.source_topic_id} onChange={e => setTopicForm({ ...topicForm, source_topic_id: e.target.value })} fullWidth />
          <TextField label="Target topic id" value={topicForm.target_topic_id} onChange={e => setTopicForm({ ...topicForm, target_topic_id: e.target.value })} fullWidth />
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
          <TextField label="Source topic id" value={editingTopic?.source_topic_id || ''} onChange={e => updateEditingTopic({ source_topic_id: e.target.value ? Number(e.target.value) : null })} fullWidth />
          <TextField label="Target topic id" value={editingTopic?.target_topic_id || ''} onChange={e => updateEditingTopic({ target_topic_id: e.target.value ? Number(e.target.value) : null })} fullWidth />
          <TextField label="Target link seed" value={editingTopic?.target_link_seed || ''} onChange={e => updateEditingTopic({ target_link_seed: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTopic(null)}>Huỷ</Button>
          <Button onClick={saveTopic} variant="contained">Lưu topic</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={campaignDialogOpen} onClose={() => setCampaignDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Tạo campaign mới</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField select label="Topic đích" value={campaignTopicId} onChange={e => setCampaignTopicId(e.target.value)} fullWidth>
            {displayTopics.map((topic) => <MenuItem key={topic.id} value={topic.id}>{topic.name}</MenuItem>)}
          </TextField>
          <TextField label="Tên campaign" value={campaignForm.title} onChange={e => setCampaignForm({ ...campaignForm, title: e.target.value })} fullWidth />
          <TextField
            label="Target link"
            value={campaignForm.target_link}
            onChange={e => updateCampaignField('target_link', e.target.value)}
            fullWidth
            helperText={campaignTargetParse.detail}
            error={Boolean(campaignForm.target_link.trim() && !campaignTargetParse.ok)}
          />
          {campaignForm.target_link.trim() && (
            <Alert severity={campaignTargetParse.kind === 'channel' || campaignTargetParse.kind === 'group' ? 'info' : 'warning'} variant="outlined">
              {campaignTargetParse.kind === 'message' && 'Target đang là message link. Nếu bạn muốn target là channel/group, link này đang lệch loại.'}
              {campaignTargetParse.kind === 'topic' && 'Target đang là topic/thread. Hãy chắc đây là đích bạn muốn, không phải source message.'}
              {campaignTargetParse.kind === 'channel' || campaignTargetParse.kind === 'group' ? 'Target là root channel/group, phù hợp nếu bạn muốn đích là kênh hoặc group.' : campaignTargetParse.detail}
            </Alert>
          )}
          {campaignForm.target_link.trim() && (
            <Alert severity={campaignTargetParse.ok ? 'info' : 'error'} variant="outlined">
              {campaignTargetParse.ok
                ? `Target nhận diện: ${campaignTargetParse.label}${campaignTargetParse.topicId ? ` / topic ${campaignTargetParse.topicId}` : ''}.`
                : `Target link sai format: ${campaignTargetParse.detail}`}
            </Alert>
          )}
          <TextField label="Caption" value={campaignForm.caption} onChange={e => setCampaignForm({ ...campaignForm, caption: e.target.value })} fullWidth multiline minRows={3} />
          <TextField
            label="Source start link"
            value={campaignForm.source_start_link}
            onChange={e => updateCampaignField('source_start_link', e.target.value)}
            fullWidth
            helperText={campaignSourceStartParse.detail}
            error={Boolean(campaignForm.source_start_link.trim() && !campaignSourceStartParse.ok)}
          />
          <TextField
            label="Source end link"
            value={campaignForm.source_end_link}
            onChange={e => updateCampaignField('source_end_link', e.target.value)}
            fullWidth
            helperText={campaignSourceEndParse.detail}
            error={Boolean(campaignForm.source_end_link.trim() && !campaignSourceEndParse.ok)}
          />
          {(campaignTargetParse.issues.length > 0 || campaignSourceStartParse.issues.length > 0 || campaignSourceEndParse.issues.length > 0) && (
            <Alert severity="error" variant="outlined">
              Link topic/group đang lệch format. Cứu bằng cách dán link t.me chuẩn có message id hoặc topic id tương ứng.
            </Alert>
          )}
          {autoName && !campaignForm.title.trim() && (
            <Alert severity="info" variant="outlined">
              Gợi ý auto-fill title: {autoName}
            </Alert>
          )}
          <TextField label="Batch size" type="number" value={campaignForm.batch_size} onChange={e => setCampaignForm({ ...campaignForm, batch_size: Number(e.target.value) })} fullWidth />
          <TextField label="Delay min" type="number" value={campaignForm.delay_min} onChange={e => setCampaignForm({ ...campaignForm, delay_min: Number(e.target.value) })} fullWidth />
          <TextField label="Delay max" type="number" value={campaignForm.delay_max} onChange={e => setCampaignForm({ ...campaignForm, delay_max: Number(e.target.value) })} fullWidth />
          <TextField label="Schedule slots" value={campaignForm.schedule_slots} onChange={e => setCampaignForm({ ...campaignForm, schedule_slots: e.target.value })} fullWidth placeholder="09:00,13:30" />
          <TextField select label="Group mode" value={campaignForm.group_mode} onChange={e => setCampaignForm({ ...campaignForm, group_mode: e.target.value })} fullWidth>
            <MenuItem value="keep">keep</MenuItem>
            <MenuItem value="merge">merge</MenuItem>
            <MenuItem value="rotate">rotate</MenuItem>
          </TextField>
          <TextField select label="Order mode" value={campaignForm.order_mode} onChange={e => setCampaignForm({ ...campaignForm, order_mode: e.target.value })} fullWidth>
            <MenuItem value="auto">auto</MenuItem>
            <MenuItem value="newest">newest</MenuItem>
            <MenuItem value="oldest">oldest</MenuItem>
          </TextField>
          <TextField select label="Follow latest" value={campaignForm.follow_latest ? 'true' : 'false'} onChange={e => setCampaignForm({ ...campaignForm, follow_latest: e.target.value === 'true' })} fullWidth>
            <MenuItem value="true">Bật</MenuItem>
            <MenuItem value="false">Tắt</MenuItem>
          </TextField>
          <TextField select label="Auto schedule" value={campaignForm.schedule_enabled ? 'true' : 'false'} onChange={e => setCampaignForm({ ...campaignForm, schedule_enabled: e.target.value === 'true' })} fullWidth>
            <MenuItem value="true">Bật</MenuItem>
            <MenuItem value="false">Tắt</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignDialogOpen(false)}>Huỷ</Button>
          <Button onClick={createCampaign} variant="contained">Lưu campaign</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.show} autoHideDuration={2800} onClose={() => setToast({ ...toast, show: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.type} variant="filled" sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
