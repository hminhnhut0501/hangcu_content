'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher, fetchApi } from '../../../lib/api';
import { detectTelegramIntent, parseTelegramLink, suggestTelegramTitle, type TelegramLinkParse } from '../../../lib/telegram-link';
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
import StateChip from '../../../components/StateChip';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import Grid from "@mui/material/Grid";
import CardContent from "@mui/material/CardContent";
import AddIcon from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TelegramPasteDialog from '../../../components/TelegramPasteDialog';

import SendIcon from '@mui/icons-material/Send';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import GroupsIcon from '@mui/icons-material/Groups';

type CampaignRow = {
  id: string;
  title: string;
  target_link?: string | null;
  caption?: string | null;
  status?: string | null;
  schedule_enabled?: boolean | null;
  schedule_slots?: string | null;
};

type TopicRow = {
  id: string;
  name: string;
};

type RunRow = {
  id: string;
  status?: string | null;
  last_error?: string | null;
  created_at?: string | null;
};

type JobRow = {
  id: string;
  status?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
};

function CampaignFlowState({ campaignId, campaignStatus }: { campaignId: string; campaignStatus?: string | null }) {
  const { data: runs } = useSWR<RunRow[]>(`/api/runs/campaigns/${campaignId}?limit=3`, fetcher);
  const { data: jobs } = useSWR<JobRow[]>(`/api/runs/jobs?campaign_id=${campaignId}&limit=3`, fetcher);
  const latestRun = runs?.[0];
  const latestJob = jobs?.[0];
  const runStatus = String(latestRun?.status || '').toLowerCase();
  const jobStatus = String(latestJob?.status || '').toLowerCase();

  const flow = React.useMemo(() => {
    if (runStatus === 'failed' || jobStatus === 'failed') {
      return { label: 'Failed', color: 'error' as const, note: latestRun?.last_error || latestJob?.last_error || 'Job failed' };
    }
    if (jobStatus === 'running' || runStatus === 'running') {
      return { label: 'Running', color: 'info' as const, note: 'Worker đang xử lý job này' };
    }
    if (jobStatus === 'pending' && campaignStatus === 'queued') {
      return { label: 'Waiting worker', color: 'warning' as const, note: 'Đã queue, đang chờ worker claim job' };
    }
    if (runStatus === 'success' || jobStatus === 'success') {
      return { label: 'Sent', color: 'success' as const, note: 'Đã gửi xong' };
    }
    if (campaignStatus === 'queued' || campaignStatus === 'scheduled') {
      return { label: 'Queued', color: 'warning' as const, note: 'Đã vào queue, chờ worker hoặc scheduler' };
    }
    return { label: 'Waiting worker', color: 'default' as const, note: 'Chưa có job rõ ràng' };
  }, [campaignStatus, jobStatus, latestJob?.last_error, latestRun?.last_error, runStatus]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <StateChip
        label={flow.label}
        tone={flow.color}
        outlined={flow.label === 'Waiting worker'}
        tooltip={flow.note}
      />
      <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 260, display: 'block' }}>
        {flow.note}
      </Typography>
    </Box>
  );
}

export default function CampaignsPage() {
  const { data: campaigns, error, isLoading, mutate } = useSWR('/api/campaigns?limit=100', fetcher);
  const { data: topics } = useSWR('/api/topics?limit=200', fetcher);
  const [toast, setToast] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({ show: false, msg: '', type: 'success' });
  const [editingItem, setEditingItem] = useState<CampaignRow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
  const [campaignMode, setCampaignMode] = useState<'auto' | 'direct_relay' | 'source_to_topic' | 'topic_to_topic' | 'watch_latest'>('auto');
  const [createForm, setCreateForm] = useState({
    topic_id: '',
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
  const [smartLink, setSmartLink] = useState('');

  const smartLinkParse = useMemo(() => parseTelegramLink(smartLink), [smartLink]);
  const targetParse = useMemo(() => parseTelegramLink(createForm.target_link), [createForm.target_link]);
  const sourceStartParse = useMemo(() => parseTelegramLink(createForm.source_start_link), [createForm.source_start_link]);
  const sourceEndParse = useMemo(() => parseTelegramLink(createForm.source_end_link), [createForm.source_end_link]);
  const smartLinkIntent = useMemo(() => detectTelegramIntent(smartLinkParse), [smartLinkParse]);
  const modeGuide = useMemo(() => {
    switch (campaignMode) {
      case 'direct_relay':
        return {
          title: 'Direct relay',
          body: 'Dán target/channel/group đích vào Target Link. Source optional nếu muốn bám thêm luồng nguồn.',
          color: 'info' as const,
        };
      case 'source_to_topic':
        return {
          title: 'Source to topic',
          body: 'Target Link sẽ được hiểu như topic/topic seed. Phù hợp khi cần gửi từ nguồn sang topic cụ thể.',
          color: 'warning' as const,
        };
      case 'topic_to_topic':
        return {
          title: 'Topic to topic',
          body: 'Dùng khi cần map topic sang topic khác, ưu tiên dán link topic seed ở mục phù hợp.',
          color: 'info' as const,
        };
      case 'watch_latest':
        return {
          title: 'Watch latest',
          body: 'Bám source và theo dõi bài mới, ưu tiên Source start/end link.',
          color: 'success' as const,
        };
      default:
        return {
          title: 'Auto detect',
          body: 'Parser sẽ tự đoán target/source/topic từ link bạn dán rồi đẩy vào field phù hợp.',
          color: 'info' as const,
        };
    }
  }, [campaignMode]);

  const applySmartLink = (mode: 'target' | 'source-start' | 'source-end') => {
    if (!smartLinkParse.normalized) return;
    if (mode === 'target') {
      setCreateForm((current) => ({ ...current, target_link: smartLinkParse.normalized }));
      return;
    }
    if (mode === 'source-start') {
      setCreateForm((current) => ({ ...current, source_start_link: smartLinkParse.normalized }));
      return;
    }
    setCreateForm((current) => ({ ...current, source_end_link: smartLinkParse.normalized }));
  };

  const applySuggestedCampaignTitle = () => {
    const suggested = suggestTelegramTitle(smartLinkParse, 'Campaign');
    if (!suggested) return;
    setCreateForm((current) => current.title.trim() ? current : { ...current, title: suggested });
  };

  const handlePasteApply = (payload: {
    parsed: TelegramLinkParse;
    role: 'auto' | 'source' | 'target' | 'topic';
    title?: string;
    targetLink?: string;
    sourceStartLink?: string;
    sourceEndLink?: string;
    targetLinkSeed?: string;
  }) => {
    setIsCreating(true);
    if (payload.role === 'topic' || payload.targetLinkSeed) {
      setCampaignMode('source_to_topic');
      setCreateForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : (payload.title || suggestTelegramTitle(payload.parsed, 'Campaign')),
        target_link: payload.targetLinkSeed || payload.parsed.normalized,
      }));
      return;
    }
    if (payload.role === 'source') {
      setCampaignMode('watch_latest');
      setCreateForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : (payload.title || suggestTelegramTitle(payload.parsed, 'Campaign')),
        source_start_link: payload.sourceStartLink || payload.parsed.normalized,
      }));
      return;
    }
    setCampaignMode('direct_relay');
    setCreateForm((current) => ({
      ...current,
      title: current.title.trim() ? current.title : (payload.title || suggestTelegramTitle(payload.parsed, 'Campaign')),
      target_link: payload.targetLink || payload.parsed.normalized,
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá chiến dịch này?')) return;
    try {
      await fetchApi(`/api/campaigns/${id}`, { method: 'DELETE' });
      setToast({ show: true, msg: 'Xoá thành công.', type: 'success' });
      mutate();
    } catch {
      setToast({ show: true, msg: 'Lỗi khi xoá.', type: 'error' });
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      await fetchApi(`/api/campaigns/${id}/run`, { method: 'POST' });
      setToast({ show: true, msg: 'Đã đưa campaign vào queue.', type: 'success' });
      mutate();
    } catch (err) {
      setToast({ show: true, msg: err instanceof Error ? err.message : 'Không thể run campaign.', type: 'error' });
    }
  };

  const updateEditingItem = (patch: Partial<CampaignRow>) => {
    setEditingItem((current) => current ? { ...current, ...patch } : current);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await fetchApi(`/api/campaigns/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editingItem.title,
          target_link: editingItem.target_link,
          caption: editingItem.caption,
          schedule_enabled: editingItem.schedule_enabled,
          schedule_slots: editingItem.schedule_slots || '',
        })
      });
      setToast({ show: true, msg: 'Cập nhật thành công.', type: 'success' });
      setEditingItem(null);
      mutate();
    } catch {
      setToast({ show: true, msg: 'Cập nhật thất bại.', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.topic_id) {
      setToast({ show: true, msg: 'Vui lòng chọn topic.', type: 'error' });
      return;
    }
    try {
      await fetchApi(`/api/campaigns/topics/${createForm.topic_id}`, {
        method: 'POST',
        body: JSON.stringify({
          title: createForm.title,
          target_link: createForm.target_link || null,
          caption: createForm.caption || null,
          source_start_link: createForm.source_start_link || null,
          source_end_link: createForm.source_end_link || null,
          follow_latest: createForm.follow_latest,
          group_mode: createForm.group_mode,
          order_mode: createForm.order_mode,
          batch_size: Number(createForm.batch_size || 1),
          delay_min: Number(createForm.delay_min || 1),
          delay_max: Number(createForm.delay_max || 7),
          schedule_enabled: createForm.schedule_enabled,
          schedule_slots: createForm.schedule_slots || '',
        })
      });
      setToast({ show: true, msg: 'Tạo campaign thành công.', type: 'success' });
      setIsCreating(false);
      setSmartLink('');
      setCreateForm({
        topic_id: '',
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
      mutate();
    } catch {
      setToast({ show: true, msg: 'Tạo campaign thất bại.', type: 'error' });
    }
  };

  const displayCampaigns: CampaignRow[] = campaigns || [];
  const activeCampaigns = displayCampaigns.filter((c) => ['active', 'scheduled', 'queued', 'running'].includes(String(c.status || '')));
  const scheduledCampaigns = displayCampaigns.filter((c) => Boolean(c.schedule_enabled));

  const topStats = [
    { label: 'CAMPAIGN', value: displayCampaigns.length, color: '#0ea5e9', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', bgcolor: '#e0f2fe', icon: <SendIcon sx={{ color: '#fff' }} /> },
    { label: 'ĐANG CHẠY', value: activeCampaigns.length, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', bgcolor: '#ede9fe', icon: <PlayCircleIcon sx={{ color: '#fff' }} /> },
    { label: 'ĐÃ LÊN LỊCH', value: scheduledCampaigns.length, color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', bgcolor: '#fef3c7', icon: <DoneAllIcon sx={{ color: '#fff' }} /> },
    { label: 'TOPICS', value: topics?.length || 0, color: '#3b82f6', gradient: 'linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)', bgcolor: '#eff6ff', icon: <GroupsIcon sx={{ color: '#fff' }} /> },
  ];

  return (
    <Box>
      <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
        Campaign builder chính đã được gom vào <strong>Dự án</strong>. Màn này chỉ còn là entry phụ để chạy thử nhanh.
      </Alert>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
        Campaign workspace vận hành thật từ backend.
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
                setSmartLink('');
                setCampaignMode('auto');
                setCreateForm({
                  topic_id: (topics && topics[0]?.id) || '',
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
                }}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold', px: 3, bgcolor: '#0088ff' }}
            >
              Tạo campaign
            </Button>
            <Button variant="outlined" onClick={() => setPasteDialogOpen(true)}>Paste & detect</Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label={`Campaign: ${displayCampaigns.length}`} size="small" sx={{ bgcolor: '#f1f5f9', fontWeight: 'bold' }} />
            <Chip label={`Scheduled: ${scheduledCampaigns.length}`} size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 'bold' }} />
            <Chip label={`Topics: ${topics?.length || 0}`} size="small" sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold' }} />
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">Đang tải campaign...</Typography>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && displayCampaigns.map((camp) => (
                <TableRow key={camp.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>{camp.title || 'No title'}</Typography>
                    <Typography variant="caption" color="text.secondary">{camp.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {camp.target_link || '-'}
                    </Typography>
                    {camp.caption && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {camp.caption}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <CampaignFlowState campaignId={camp.id} campaignStatus={camp.status} />
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
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ mr: 1, textTransform: 'none' }}
                      onClick={() => handleRunNow(camp.id)}
                    >
                      Run ngay
                    </Button>
                    <IconButton size="small" color="primary" sx={{ mr: 1 }} onClick={() => setEditingItem(camp)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(camp.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && displayCampaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary" variant="body2">
                      {error ? 'Không tải được campaign.' : 'Chưa có dữ liệu. Bấm nút thêm mới để tạo.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={isCreating || !!editingItem} onClose={() => { setEditingItem(null); setIsCreating(false); }} fullWidth maxWidth="sm">
        <form onSubmit={isCreating ? handleCreate : handleSaveEdit}>
          <DialogTitle>{isCreating ? 'Tạo campaign' : 'Sửa chiến dịch'}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              {isCreating && (
                <TextField
                  select
                  label="Topic"
                  fullWidth
                  value={createForm.topic_id}
                  onChange={e => setCreateForm({ ...createForm, topic_id: e.target.value })}
                >
                  {(topics || []).map((topic: TopicRow) => (
                    <MenuItem key={topic.id} value={topic.id}>{topic.name}</MenuItem>
                  ))}
                </TextField>
              )}
              {isCreating && (
                <TextField
                  select
                  label="Campaign mode"
                  fullWidth
                  value={campaignMode}
                  onChange={e => setCampaignMode(e.target.value as typeof campaignMode)}
                  helperText="Auto sẽ tự gợi ý theo link bạn dán."
                >
                  <MenuItem value="auto">Auto detect</MenuItem>
                  <MenuItem value="direct_relay">Direct relay</MenuItem>
                  <MenuItem value="source_to_topic">Source to topic</MenuItem>
                  <MenuItem value="topic_to_topic">Topic to topic</MenuItem>
                  <MenuItem value="watch_latest">Watch latest</MenuItem>
                  </TextField>
              )}
              {isCreating && (
                <Alert severity={modeGuide.color} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{modeGuide.title}</Typography>
                  <Typography variant="body2">{modeGuide.body}</Typography>
                </Alert>
              )}
              {isCreating && (
                <Card variant="outlined" sx={{ borderRadius: 3, borderColor: smartLinkParse.ok && smartLinkParse.normalized ? 'success.main' : 'divider' }}>
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Smart Telegram link</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Dán link bất kỳ để parser tự nhận diện channel, group, topic, message.
                        </Typography>
                      </Box>
                      <Chip
                        label={smartLinkParse.ok ? `Detected: ${smartLinkParse.label}` : 'Waiting for link'}
                        color={smartLinkParse.ok ? 'success' : 'default'}
                        variant={smartLinkParse.ok ? 'filled' : 'outlined'}
                        size="small"
                      />
                    </Box>
                    <TextField
                      label="Paste Telegram link"
                      fullWidth
                      value={smartLink}
                      onChange={(e) => setSmartLink(e.target.value)}
                      placeholder="https://t.me/channel/123 hoặc @channel"
                      helperText={smartLinkParse.detail}
                    />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={smartLinkParse.kind} size="small" variant="outlined" />
                      {smartLinkParse.chatSlug && <Chip label={`chat: ${smartLinkParse.chatSlug}`} size="small" variant="outlined" />}
                      {smartLinkParse.messageId && <Chip label={`message: ${smartLinkParse.messageId}`} size="small" variant="outlined" />}
                      {smartLinkParse.topicId && <Chip label={`topic: ${smartLinkParse.topicId}`} size="small" variant="outlined" />}
                    </Box>
                    {smartLinkParse.issues.length > 0 && (
                      <Alert severity="warning" variant="outlined">
                        {smartLinkParse.issues.join(' ')}
                      </Alert>
                    )}
                    {smartLinkParse.suggestions.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {smartLinkParse.suggestions.join(' ')}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button size="small" variant="outlined" onClick={applySuggestedCampaignTitle} disabled={!smartLinkParse.ok || !smartLinkParse.chatSlug}>
                        Auto title
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => applySmartLink('target')} disabled={!smartLinkParse.ok}>
                        Apply to Target
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => applySmartLink('source-start')} disabled={!smartLinkParse.ok}>
                        Apply to Source Start
                      </Button>
                      <Button size="small" variant="outlined" onClick={() => applySmartLink('source-end')} disabled={!smartLinkParse.ok}>
                        Apply to Source End
                      </Button>
                    </Box>
                    <Alert severity={smartLinkIntent === 'unknown' ? 'warning' : 'info'} variant="outlined">
                      {smartLinkIntent === 'target' && 'Link này hợp với target/root channel-group. Nếu là source message hoặc topic, hãy dùng đúng ô source/topic.'}
                      {smartLinkIntent === 'source' && 'Link này hợp với source/message. Nếu bạn định làm target channel/group, hãy kiểm tra lại.'}
                      {smartLinkIntent === 'topic-seed' && 'Link này có vẻ là topic/thread seed. Dùng cho topic hoặc campaign bám topic là hợp nhất.'}
                      {smartLinkIntent === 'unknown' && 'Chưa đủ dữ liệu để map vai trò. Hãy dán link đầy đủ t.me hoặc @username.'}
                    </Alert>
                  </CardContent>
                </Card>
              )}
              <TextField 
                label="Tên chiến dịch" 
                fullWidth 
                value={isCreating ? createForm.title : (editingItem?.title || '')}
                onChange={e => isCreating ? setCreateForm({ ...createForm, title: e.target.value }) : updateEditingItem({ title: e.target.value })}
              />
              <TextField 
                label="Target Link" 
                fullWidth 
                value={isCreating ? createForm.target_link : (editingItem?.target_link || '')}
                onChange={e => isCreating ? setCreateForm({ ...createForm, target_link: e.target.value }) : updateEditingItem({ target_link: e.target.value })}
                helperText={isCreating ? `${targetParse.label}: ${targetParse.detail}` : undefined}
                error={Boolean(isCreating && createForm.target_link.trim() && !targetParse.ok)}
              />
              {isCreating ? (
                <>
                  <TextField label="Caption" fullWidth multiline minRows={3} value={createForm.caption} onChange={e => setCreateForm({ ...createForm, caption: e.target.value })} />
                  <TextField
                    label="Source start link"
                    fullWidth
                    value={createForm.source_start_link}
                    onChange={e => setCreateForm({ ...createForm, source_start_link: e.target.value })}
                    helperText={sourceStartParse.ok ? `${sourceStartParse.label}: ${sourceStartParse.detail}` : sourceStartParse.detail}
                    error={Boolean(createForm.source_start_link.trim() && !sourceStartParse.ok)}
                  />
                  <TextField
                    label="Source end link"
                    fullWidth
                    value={createForm.source_end_link}
                    onChange={e => setCreateForm({ ...createForm, source_end_link: e.target.value })}
                    helperText={sourceEndParse.ok ? `${sourceEndParse.label}: ${sourceEndParse.detail}` : sourceEndParse.detail}
                    error={Boolean(createForm.source_end_link.trim() && !sourceEndParse.ok)}
                  />
                  {(targetParse.issues.length > 0 || sourceStartParse.issues.length > 0 || sourceEndParse.issues.length > 0) && (
                    <Alert severity="warning" variant="outlined">
                      Có link chưa khớp kiểu Telegram mà campaign đang cần. Hãy kiểm tra lại target/source trước khi tạo.
                    </Alert>
                  )}
                  <TextField label="Batch size" type="number" fullWidth value={createForm.batch_size} onChange={e => setCreateForm({ ...createForm, batch_size: Number(e.target.value) })} />
                  <TextField label="Delay min" type="number" fullWidth value={createForm.delay_min} onChange={e => setCreateForm({ ...createForm, delay_min: Number(e.target.value) })} />
                  <TextField label="Delay max" type="number" fullWidth value={createForm.delay_max} onChange={e => setCreateForm({ ...createForm, delay_max: Number(e.target.value) })} />
                  <TextField label="Schedule slots" fullWidth value={createForm.schedule_slots} onChange={e => setCreateForm({ ...createForm, schedule_slots: e.target.value })} placeholder="09:00,13:30" />
                  <TextField select label="Group mode" fullWidth value={createForm.group_mode} onChange={e => setCreateForm({ ...createForm, group_mode: e.target.value })}>
                    <MenuItem value="keep">keep</MenuItem>
                    <MenuItem value="merge">merge</MenuItem>
                    <MenuItem value="rotate">rotate</MenuItem>
                  </TextField>
                  <TextField select label="Order mode" fullWidth value={createForm.order_mode} onChange={e => setCreateForm({ ...createForm, order_mode: e.target.value })}>
                    <MenuItem value="auto">auto</MenuItem>
                    <MenuItem value="newest">newest</MenuItem>
                    <MenuItem value="oldest">oldest</MenuItem>
                  </TextField>
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={createForm.follow_latest}
                        onChange={e => setCreateForm({ ...createForm, follow_latest: e.target.checked })}
                      />
                    } 
                    label="Follow latest" 
                  />
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={createForm.schedule_enabled}
                        onChange={e => setCreateForm({ ...createForm, schedule_enabled: e.target.checked })}
                      />
                    } 
                    label="Bật lịch gửi tự động" 
                  />
                </>
              ) : (
                <>
                  <TextField label="Caption" fullWidth multiline minRows={3} value={editingItem?.caption || ''} onChange={e => updateEditingItem({ caption: e.target.value })} />
                  <TextField label="Schedule slots" fullWidth value={editingItem?.schedule_slots || ''} onChange={e => updateEditingItem({ schedule_slots: e.target.value })} placeholder="09:00,13:30" />
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={editingItem?.schedule_enabled || false}
                        onChange={e => updateEditingItem({ schedule_enabled: e.target.checked })}
                      />
                    } 
                    label="Bật lịch gửi tự động" 
                  />
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setEditingItem(null); setIsCreating(false); }}>Huỷ</Button>
            <Button type="submit" variant="contained">{isCreating ? 'Tạo mới' : 'Lưu thay đổi'}</Button>
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

      <TelegramPasteDialog
        open={pasteDialogOpen}
        mode="campaign"
        onClose={() => setPasteDialogOpen(false)}
        onApply={handlePasteApply}
      />
    </Box>
  );
}
