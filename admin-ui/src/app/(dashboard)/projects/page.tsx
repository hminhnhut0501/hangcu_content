'use client';

import React from 'react';
import useSWR from 'swr';
import { fetchApi, fetcher } from '../../../lib/api';
import { detectTelegramIntent, parseTelegramLink, suggestTelegramTitle, type TelegramLinkParse } from '../../../lib/telegram-link';
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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import TelegramPasteDialog from '../../../components/TelegramPasteDialog';

type ProjectRow = {
  id?: string;
  name: string;
  description?: string | null;
  status?: string | null;
  sort_order?: number | null;
  auto_enabled?: boolean | null;
  auto_slots?: string | null;
  auto_pick_count?: number | null;
  auto_strategy?: string | null;
};

type TopicRow = {
  id: string;
  group_id: string;
  name: string;
  target_link_seed?: string | null;
  status?: string | null;
  sort_order?: number | null;
};

type CampaignRow = {
  id: string;
  group_id?: string | null;
  topic_id: string;
  title: string;
  source_start_link?: string | null;
  target_link?: string | null;
  caption?: string | null;
  status?: string | null;
  enabled?: boolean | null;
  schedule_enabled?: boolean | null;
  last_run_at?: string | null;
  last_msg_id?: number | null;
  created_at?: string | null;
};

type CampaignRunRow = {
  id: string;
  status?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  finished_at?: string | null;
  result?: Record<string, unknown> | null;
};

type QueueJobRow = {
  id: string;
  job_type?: string | null;
  status?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  locked_at?: string | null;
  locked_by?: string | null;
  next_retry_at?: string | null;
  account_id?: string | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
};

type TopicDraft = {
  name: string;
  target_link_seed: string;
};

type CampaignDraft = {
  title: string;
  source_start_link: string;
  caption: string;
};

type ProjectAutoStatus = {
  ok: boolean;
  error?: string;
  group?: {
    name?: string | null;
    auto_enabled?: boolean | null;
    auto_slots?: string[];
    auto_pick_count?: number | null;
    auto_strategy?: string | null;
    auto_next_run_at?: string | null;
    auto_last_run_at?: string | null;
    auto_last_slot_key?: string | null;
    auto_last_result?: string | null;
    auto_last_error?: string | null;
  };
  campaign_count?: number;
  selected_campaign_ids?: string[];
  selected_topics?: string[];
  next_preview?: Array<{
    campaign_id?: string | null;
    topic_id?: string | null;
    title?: string | null;
    last_msg_id?: number | null;
    next_send_at?: string | null;
  }>;
};

type WorkspaceModelSummary = {
  ok: boolean;
  ui_rule?: string;
  model?: Record<string, { table?: string; canonical?: string; role?: string; summary?: string }>;
  flow?: Array<{ from?: string; to?: string; relation?: string }>;
};

const statusTone = (value?: string | null): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  const key = String(value || '').toLowerCase();
  if (['active', 'enabled', 'success', 'sent', 'done'].includes(key)) return 'success';
  if (['failed', 'error', 'inactive', 'paused', 'blocked'].includes(key)) return 'error';
  if (['queued', 'scheduled', 'pending'].includes(key)) return 'warning';
  if (['running', 'dripping', 'sleeping'].includes(key)) return 'info';
  return 'default';
};

const formatIso = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN', { hour12: false }) : '-');

export default function ProjectsPage() {
  const { data: projects, mutate: mutateProjects } = useSWR<ProjectRow[]>('/api/groups?limit=100', fetcher);
  const { data: topics, mutate: mutateTopics } = useSWR<TopicRow[]>('/api/topics?limit=200', fetcher);
  const { data: campaigns, mutate: mutateCampaigns } = useSWR<CampaignRow[]>('/api/campaigns?limit=100', fetcher);
  const { data: modelSummary } = useSWR<WorkspaceModelSummary>('/api/internal/model', fetcher);

  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const [workspaceMode, setWorkspaceMode] = React.useState<'create' | 'edit'>('create');
  const [workspaceProject, setWorkspaceProject] = React.useState<ProjectRow>({
    name: '',
    description: '',
    auto_enabled: false,
    auto_slots: '',
    auto_pick_count: 1,
    auto_strategy: 'round_robin',
  });
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = React.useState<string>('');
  const [topicDraft, setTopicDraft] = React.useState<TopicDraft>({ name: '', target_link_seed: '' });
  const [campaignDraft, setCampaignDraft] = React.useState<CampaignDraft>({ title: '', source_start_link: '', caption: '' });
  const [topicEdit, setTopicEdit] = React.useState<TopicRow | null>(null);
  const [campaignEdit, setCampaignEdit] = React.useState<CampaignRow | null>(null);
  const [pasteTarget, setPasteTarget] = React.useState<'topic' | 'campaign' | null>(null);
  const [pasteDialogOpen, setPasteDialogOpen] = React.useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>('');

  const displayProjects: ProjectRow[] = projects || [];
  const displayTopics: TopicRow[] = topics || [];
  const displayCampaigns: CampaignRow[] = campaigns || [];

  const selectedProject = React.useMemo(
    () => displayProjects.find((project) => project.id === selectedProjectId) || null,
    [displayProjects, selectedProjectId],
  );
  const { data: autoStatus, mutate: mutateAutoStatus } = useSWR<ProjectAutoStatus>(
    workspaceOpen && selectedProjectId ? `/api/groups/${selectedProjectId}/auto/status` : null,
    fetcher,
    { refreshInterval: workspaceOpen ? 8000 : 0 },
  );

  const projectTopics = React.useMemo(() => {
    if (!selectedProjectId) return [];
    return displayTopics
      .filter((topic) => topic.group_id === selectedProjectId)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [displayTopics, selectedProjectId]);

  const selectedTopic = React.useMemo(
    () => projectTopics.find((topic) => topic.id === selectedTopicId) || projectTopics[0] || null,
    [projectTopics, selectedTopicId],
  );

  const topicCampaigns = React.useMemo(() => {
    if (!selectedTopic) return [];
    return displayCampaigns
      .filter((campaign) => campaign.topic_id === selectedTopic.id)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [displayCampaigns, selectedTopic]);

  const selectedCampaign = React.useMemo(
    () => topicCampaigns.find((campaign) => campaign.id === selectedCampaignId) || topicCampaigns[0] || null,
    [selectedCampaignId, topicCampaigns],
  );

  const projectStats = React.useMemo(() => ({
    projects: displayProjects.length,
    topics: projectTopics.length,
    campaigns: topicCampaigns.length,
    autoEnabled: Boolean(autoStatus?.group?.auto_enabled),
  }), [autoStatus?.group?.auto_enabled, displayProjects.length, projectTopics.length, topicCampaigns.length]);

  React.useEffect(() => {
    if (!workspaceOpen) return;
    if (workspaceMode === 'create') return;
    if (!selectedProjectId) return;
    if (!selectedTopicId && projectTopics[0]?.id) {
      setSelectedTopicId(projectTopics[0].id);
    }
  }, [projectTopics, selectedProjectId, selectedTopicId, workspaceMode, workspaceOpen]);

  React.useEffect(() => {
    if (!selectedTopic) return;
    if (!topicCampaigns.length) {
      setSelectedCampaignId('');
      return;
    }
    if (!topicCampaigns.some((campaign) => campaign.id === selectedCampaignId)) {
      setSelectedCampaignId(topicCampaigns[0].id);
    }
  }, [selectedCampaignId, selectedTopic, topicCampaigns]);

  const notify = (msg: string, type: 'success' | 'error') => setToast({ show: true, msg, type });

  const getLatestField = (job?: QueueJobRow, run?: CampaignRunRow) => {
    const jobResult = (job?.result || {}) as Record<string, unknown>;
    const runResult = (run?.result || {}) as Record<string, unknown>;
    const value = jobResult.last_msg_id ?? runResult.last_msg_id ?? jobResult.message_id ?? runResult.message_id;
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  const getAccountLabel = (job?: QueueJobRow, run?: CampaignRunRow) => {
    const jobResult = (job?.result || {}) as Record<string, unknown>;
    const runResult = (run?.result || {}) as Record<string, unknown>;
    return String(
      job?.account_id
        || jobResult.account_id
        || runResult.account_id
        || '-',
    );
  };

  const CampaignObservability = ({ campaignId, campaignStatus }: { campaignId: string; campaignStatus?: string | null }) => {
    const { data: runs } = useSWR<CampaignRunRow[]>(`/api/runs/campaigns/${campaignId}?limit=3`, fetcher, { refreshInterval: 5000 });
    const { data: jobs } = useSWR<QueueJobRow[]>(`/api/runs/jobs?campaign_id=${campaignId}&limit=3`, fetcher, { refreshInterval: 5000 });
    const latestRun = runs?.[0];
    const latestJob = jobs?.[0];
    const runStatus = String(latestRun?.status || '').toLowerCase();
    const jobStatus = String(latestJob?.status || '').toLowerCase();
    const sentMsgId = getLatestField(latestJob, latestRun);
    const accountLabel = getAccountLabel(latestJob, latestRun);
    const errorText = latestJob?.last_error || latestRun?.last_error || '';

    const flow = React.useMemo(() => {
      if (runStatus === 'failed' || jobStatus === 'failed') {
        return { label: 'Failed', color: 'error' as const, note: errorText || 'Job failed' };
      }
      if (jobStatus === 'running' || runStatus === 'running') {
        return { label: 'Running', color: 'info' as const, note: 'Worker đang xử lý campaign này' };
      }
      if (jobStatus === 'pending' && campaignStatus === 'queued') {
        return { label: 'Waiting worker', color: 'warning' as const, note: 'Đã queue, đang chờ worker claim job' };
      }
      if (runStatus === 'success' || jobStatus === 'success') {
        const messageText = sentMsgId ? `Đã gửi tới message #${sentMsgId}` : 'Đã gửi xong';
        return {
          label: 'Sent',
          color: 'success' as const,
          note: accountLabel !== '-' ? `${messageText} · account ${accountLabel}` : messageText,
        };
      }
      if (campaignStatus === 'queued' || campaignStatus === 'scheduled') {
        return { label: 'Queued', color: 'warning' as const, note: 'Đã vào queue, chờ worker hoặc scheduler' };
      }
      return { label: 'Waiting worker', color: 'default' as const, note: 'Chưa có job rõ ràng' };
    }, [accountLabel, campaignStatus, errorText, jobStatus, latestRun?.last_error, runStatus, sentMsgId]);

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, minWidth: 260 }}>
        <Chip
          label={flow.label}
          size="small"
          color={flow.color}
          variant={flow.label === 'Waiting worker' ? 'outlined' : 'filled'}
          sx={{ width: 'fit-content', fontSize: '0.7rem', fontWeight: 800 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
          {flow.note}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
          Account: {accountLabel}
          {sentMsgId ? ` · Last message: #${sentMsgId}` : ''}
        </Typography>
      </Box>
    );
  };

  const CampaignTimelinePanel = ({ campaign }: { campaign: CampaignRow }) => {
    const { data: runs } = useSWR<CampaignRunRow[]>(`/api/runs/campaigns/${campaign.id}?limit=10`, fetcher, { refreshInterval: 5000 });
    const { data: jobs } = useSWR<QueueJobRow[]>(`/api/runs/jobs?campaign_id=${campaign.id}&limit=10`, fetcher, { refreshInterval: 5000 });
    const latestRun = runs?.[0];
    const latestJob = jobs?.[0];

    const timeline = React.useMemo(() => {
      const runItems = (runs || []).map((run) => ({
        key: `run-${run.id}`,
        ts: run.created_at || '',
        title: `Run ${String(run.status || 'unknown')}`,
        badge: String(run.status || 'unknown'),
        tone:
          String(run.status || '').toLowerCase() === 'success' ? 'success' :
          String(run.status || '').toLowerCase() === 'failed' ? 'error' :
          String(run.status || '').toLowerCase() === 'queued' ? 'warning' :
          String(run.status || '').toLowerCase() === 'running' ? 'info' : 'default',
        detail: run.last_error || (run.result ? JSON.stringify(run.result) : ''),
      }));
      const jobItems = (jobs || []).map((job) => {
        const result = (job.result || {}) as Record<string, unknown>;
        const payload = (job.payload || {}) as Record<string, unknown>;
        const accountId = String(job.account_id || result.account_id || payload.account_id || '').trim();
        const lastMsg = Number(result.last_msg_id ?? payload.last_msg_id ?? result.message_id ?? payload.message_id);
        const details = [
          job.last_error || '',
          accountId ? `account ${accountId}` : '',
          Number.isFinite(lastMsg) && lastMsg > 0 ? `message #${lastMsg}` : '',
          job.started_at ? `started ${job.started_at}` : '',
          job.finished_at ? `finished ${job.finished_at}` : '',
          job.locked_by ? `locked by ${job.locked_by}` : '',
        ].filter(Boolean);
        return {
          key: `job-${job.id}`,
          ts: job.created_at || job.started_at || '',
          title: `Job ${String(job.status || 'unknown')}${job.job_type ? ` · ${job.job_type}` : ''}`,
          badge: String(job.status || 'unknown'),
          tone:
            String(job.status || '').toLowerCase() === 'running' ? 'info' :
            String(job.status || '').toLowerCase() === 'failed' ? 'error' :
            String(job.status || '').toLowerCase() === 'pending' ? 'warning' :
            String(job.status || '').toLowerCase() === 'success' || String(job.status || '').toLowerCase() === 'done' ? 'success' : 'default',
          detail: details.join(' · '),
        };
      });
      return [...jobItems, ...runItems]
        .sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')))
        .slice(0, 8);
    }, [jobs, runs]);

    const latestAccount = String(
      latestJob?.account_id
        || (latestJob?.result as Record<string, unknown> | undefined)?.account_id
        || (latestJob?.payload as Record<string, unknown> | undefined)?.account_id
        || '-',
    );
    const latestMsg = Number(
      (latestJob?.result as Record<string, unknown> | undefined)?.last_msg_id
        ?? (latestJob?.payload as Record<string, unknown> | undefined)?.last_msg_id
        ?? (latestJob?.result as Record<string, unknown> | undefined)?.message_id
        ?? (latestJob?.payload as Record<string, unknown> | undefined)?.message_id
        ?? 0,
    );

    return (
      <Card sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.25)', bgcolor: 'rgba(15, 23, 42, 0.35)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Chi tiết job gần nhất</Typography>
            <Typography variant="body2" color="text.secondary">
              Timeline thật từ queue_jobs và campaign_runs của campaign này.
            </Typography>
          </Box>
          <Chip label={campaign.status || 'draft'} size="small" variant="outlined" />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
          <Card variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Source</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
              {campaign.source_start_link || '-'}
            </Typography>
          </Card>
          <Card variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Target</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, wordBreak: 'break-all' }}>
              {campaign.target_link || selectedTopic?.target_link_seed || '-'}
            </Typography>
          </Card>
          <Card variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="caption" color="text.secondary">Account / message</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {latestAccount !== '-' ? latestAccount : 'Chưa có account'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {Number.isFinite(latestMsg) && latestMsg > 0 ? `Last message #${latestMsg}` : 'Chưa có message id'}
            </Typography>
          </Card>
        </Box>

        <Box sx={{ display: 'grid', gap: 1 }}>
          {timeline.length > 0 ? timeline.map((item) => (
            <Card key={item.key} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.ts ? new Date(item.ts).toLocaleString('vi-VN', { hour12: false }) : 'unknown time'}
                  </Typography>
                </Box>
                <Chip label={item.badge} size="small" color={item.tone as 'default' | 'success' | 'error' | 'info' | 'warning'} variant="outlined" />
              </Box>
              {item.detail && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {item.detail}
                </Typography>
              )}
            </Card>
          )) : (
            <Alert severity="info" variant="outlined">
              Chưa có job/run nào cho campaign này.
            </Alert>
          )}
        </Box>
      </Card>
    );
  };

  const openCreateProject = () => {
    setWorkspaceMode('create');
    setWorkspaceProject({
      name: '',
      description: '',
      auto_enabled: false,
      auto_slots: '',
      auto_pick_count: 1,
      auto_strategy: 'round_robin',
    });
    setSelectedProjectId('');
    setSelectedTopicId('');
    setWorkspaceOpen(true);
  };

  const openProjectWorkspace = (project: ProjectRow) => {
    setWorkspaceMode('edit');
    setWorkspaceProject({
      ...project,
      auto_enabled: Boolean(project.auto_enabled),
      auto_slots: project.auto_slots || '',
      auto_pick_count: Number(project.auto_pick_count || 1),
      auto_strategy: project.auto_strategy || 'round_robin',
    });
    setSelectedProjectId(project.id || '');
    setSelectedTopicId('');
    setTopicDraft({ name: '', target_link_seed: '' });
    setCampaignDraft({ title: '', source_start_link: '', caption: '' });
    setWorkspaceOpen(true);
  };

  const closeWorkspace = () => {
    setWorkspaceOpen(false);
    setTopicEdit(null);
    setCampaignEdit(null);
    setPasteDialogOpen(false);
    setPasteTarget(null);
  };

  const handleProjectSave = async () => {
    if (!workspaceProject.name.trim()) {
      notify('Tên dự án không được để trống.', 'error');
      return;
    }
    try {
      if (workspaceMode === 'create') {
        await fetchApi('/api/groups', {
          method: 'POST',
          body: JSON.stringify({
            name: workspaceProject.name.trim(),
            auto_enabled: Boolean(workspaceProject.auto_enabled),
            auto_slots: workspaceProject.auto_slots || '',
            auto_pick_count: Number(workspaceProject.auto_pick_count || 1),
            auto_strategy: workspaceProject.auto_strategy || 'round_robin',
          }),
        });
        notify('Đã tạo dự án mới.', 'success');
      } else if (workspaceProject.id) {
        await fetchApi(`/api/groups/${workspaceProject.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: workspaceProject.name.trim(),
            description: workspaceProject.description || null,
            auto_enabled: Boolean(workspaceProject.auto_enabled),
            auto_slots: workspaceProject.auto_slots || '',
            auto_pick_count: Number(workspaceProject.auto_pick_count || 1),
            auto_strategy: workspaceProject.auto_strategy || 'round_robin',
          }),
        });
        notify('Đã cập nhật dự án.', 'success');
      }
      await mutateProjects();
      await mutateAutoStatus();
      closeWorkspace();
    } catch {
      notify('Không thể lưu dự án.', 'error');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá project này?')) return;
    try {
      await fetchApi(`/api/groups/${id}`, { method: 'DELETE' });
      notify('Đã xoá dự án.', 'success');
      await mutateProjects();
      await mutateAutoStatus();
      if (selectedProjectId === id) closeWorkspace();
    } catch {
      notify('Lỗi khi xoá dự án.', 'error');
    }
  };

  const handleTopicPasteApply = (payload: {
    parsed: TelegramLinkParse;
    role: 'auto' | 'source' | 'target' | 'topic';
    title?: string;
    targetLinkSeed?: string;
  }) => {
    const intent = detectTelegramIntent(payload.parsed);
    const title = payload.title || suggestTelegramTitle(payload.parsed, 'Topic');
    if (payload.role === 'topic' || payload.targetLinkSeed || intent === 'topic-seed') {
      setTopicDraft((current) => ({
        ...current,
        name: current.name.trim() ? current.name : title,
        target_link_seed: payload.targetLinkSeed || payload.parsed.normalized,
      }));
    }
  };

  const createTopic = async () => {
    if (!selectedProjectId) return;
    if (!topicDraft.name.trim()) {
      notify('Tên topic không được để trống.', 'error');
      return;
    }
    try {
      await fetchApi(`/api/topics/groups/${selectedProjectId}`, {
        method: 'POST',
        body: JSON.stringify({
          name: topicDraft.name.trim(),
          target_link_seed: topicDraft.target_link_seed || null,
        }),
      });
      notify('Đã tạo topic.', 'success');
      setTopicDraft({ name: '', target_link_seed: '' });
      await mutateTopics();
    } catch {
      notify('Không thể tạo topic.', 'error');
    }
  };

  const saveTopic = async () => {
    if (!topicEdit) return;
    try {
      await fetchApi(`/api/topics/${topicEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: topicEdit.name.trim(),
          target_link_seed: topicEdit.target_link_seed || null,
          sort_order: topicEdit.sort_order ?? 0,
        }),
      });
      notify('Đã lưu topic.', 'success');
      setTopicEdit(null);
      await mutateTopics();
    } catch {
      notify('Không thể lưu topic.', 'error');
    }
  };

  const deleteTopic = async (topicId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá topic này?')) return;
    try {
      await fetchApi(`/api/topics/${topicId}`, { method: 'DELETE' });
      notify('Đã xoá topic.', 'success');
      await mutateTopics();
    } catch {
      notify('Không thể xoá topic.', 'error');
    }
  };

  const openTopicPaste = () => {
    setPasteTarget('topic');
    setPasteDialogOpen(true);
  };

  const openCampaignPaste = () => {
    setPasteTarget('campaign');
    setPasteDialogOpen(true);
  };

  const handleCampaignPasteApply = (payload: {
    parsed: TelegramLinkParse;
    role: 'auto' | 'source' | 'target' | 'topic';
    title?: string;
    targetLink?: string;
    sourceStartLink?: string;
    sourceEndLink?: string;
  }) => {
    const title = payload.title || suggestTelegramTitle(payload.parsed, 'Campaign');
    if (payload.role === 'source') {
      setCampaignDraft((current) => ({
        ...current,
        title: current.title.trim() ? current.title : title,
        source_start_link: payload.sourceStartLink || payload.parsed.normalized,
      }));
      return;
    }
    setCampaignDraft((current) => ({
      ...current,
      title: current.title.trim() ? current.title : title,
      source_start_link: payload.sourceStartLink || payload.parsed.normalized,
    }));
  };

  const createCampaign = async () => {
    if (!selectedTopic) {
      notify('Hãy chọn topic trước khi tạo campaign.', 'error');
      return;
    }
    if (!campaignDraft.title.trim()) {
      notify('Tên campaign không được để trống.', 'error');
      return;
    }
    try {
      await fetchApi(`/api/campaigns/topics/${selectedTopic.id}`, {
        method: 'POST',
        body: JSON.stringify({
          title: campaignDraft.title.trim(),
          source_start_link: campaignDraft.source_start_link || null,
          caption: campaignDraft.caption || null,
          schedule_enabled: false,
        }),
      });
      notify('Đã tạo campaign con.', 'success');
      setCampaignDraft({ title: '', source_start_link: '', caption: '' });
      await mutateCampaigns();
    } catch {
      notify('Không thể tạo campaign.', 'error');
    }
  };

  const handleRunCampaign = async (id: string, mode: 'single' | 'full' = 'full') => {
    try {
      await fetchApi(`/api/campaigns/${id}/run?mode=${mode}`, { method: 'POST' });
      notify(mode === 'single' ? 'Đã queue gửi 1 tin.' : 'Đã queue gửi đến hết.', 'success');
      await mutateCampaigns();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không thể chạy campaign.', 'error');
    }
  };

  const handleRunAutoNow = async () => {
    if (!workspaceProject.id) {
      notify('Hãy lưu project trước khi chạy auto.', 'error');
      return;
    }
    try {
      await fetchApi(`/api/groups/${workspaceProject.id}/auto/run`, { method: 'POST' });
      notify('Đã trigger auto drip cho project.', 'success');
      await Promise.all([mutateProjects(), mutateAutoStatus()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không thể trigger auto.', 'error');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xoá campaign này?')) return;
    try {
      await fetchApi(`/api/campaigns/${id}`, { method: 'DELETE' });
      notify('Đã xoá campaign.', 'success');
      await mutateCampaigns();
    } catch {
      notify('Không thể xoá campaign.', 'error');
    }
  };

  const handleCampaignEditSave = async () => {
    if (!campaignEdit) return;
    try {
      await fetchApi(`/api/campaigns/${campaignEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: campaignEdit.title.trim(),
          source_start_link: campaignEdit.source_start_link || null,
          caption: campaignEdit.caption || null,
        }),
      });
      notify('Đã lưu campaign.', 'success');
      setCampaignEdit(null);
      await mutateCampaigns();
    } catch {
      notify('Không thể lưu campaign.', 'error');
    }
  };

  return (
    <Box>
      <Card sx={{
        mb: 3,
        p: 2.5,
        borderRadius: 4,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: 'linear-gradient(135deg, rgba(2,132,199,0.18), rgba(15,23,42,0.35) 55%, rgba(16,185,129,0.12))',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 1.6, fontWeight: 800, color: 'text.secondary' }}>
              WORKSPACE
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>Dự án</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Một màn quản lý duy nhất cho project, topic đích và campaign con.
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateProject} sx={{ borderRadius: 999, px: 2.5 }}>
            Tạo dự án
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
          <Chip label={`Projects: ${projectStats.projects}`} variant="outlined" />
          <Chip label={`Topics: ${projectStats.topics}`} variant="outlined" />
          <Chip label={`Campaigns: ${projectStats.campaigns}`} variant="outlined" />
          <Chip label={`Auto: ${projectStats.autoEnabled ? 'on' : 'off'}`} color={projectStats.autoEnabled ? 'success' : 'default'} variant="filled" />
        </Box>
        {modelSummary?.ok && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 1.25, mt: 2 }}>
            {Object.entries(modelSummary.model || {}).slice(0, 4).map(([key, item]) => (
              <Card key={key} variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.34)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 900, letterSpacing: 1 }}>
                  {key}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.25 }}>
                  {item.canonical || item.table}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {item.summary}
                </Typography>
              </Card>
            ))}
          </Box>
        )}
      </Card>

      <Card sx={{ overflow: 'hidden', borderRadius: 4 }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(148, 163, 184, 0.08)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Tên project</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Mô tả</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayProjects.map((project) => (
                <TableRow key={project.id || project.name} hover sx={{ cursor: 'pointer' }} onClick={() => openProjectWorkspace(project)}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 600 }}>{project.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{project.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {project.description || 'Chưa có mô tả'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={project.status || 'active'} size="small" color={statusTone(project.status)} variant="outlined" />
                  </TableCell>
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <IconButton color="primary" onClick={() => openProjectWorkspace(project)} title="Mở">
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => project.id && handleDeleteProject(project.id)} title="Xoá">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {displayProjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">Chưa có project nào. Bấm “Tạo dự án” để bắt đầu.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={workspaceOpen}
        onClose={closeWorkspace}
        fullWidth
        maxWidth="lg"
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 4,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, bgcolor: 'rgba(148, 163, 184, 0.05)' }}>
          {workspaceMode === 'create' ? 'Tạo project' : `Project: ${workspaceProject.name || 'Chưa đặt tên'}`}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 3, pt: 2 }}>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Thông tin dự án</Typography>
            <TextField
              label="Tên project"
              fullWidth
              required
              value={workspaceProject.name}
              onChange={(e) => setWorkspaceProject((current) => ({ ...current, name: e.target.value }))}
              helperText="Project chỉ để gom topic và campaign con."
            />
            <TextField
              label="Mô tả"
              fullWidth
              multiline
              minRows={2}
              value={workspaceProject.description || ''}
              onChange={(e) => setWorkspaceProject((current) => ({ ...current, description: e.target.value }))}
            />
          </Box>

          <Divider />

          <Box sx={{ display: 'grid', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Auto scheduler</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={Boolean(workspaceProject.auto_enabled)}
                  onChange={(e) => setWorkspaceProject((current) => ({ ...current, auto_enabled: e.target.checked }))}
                />
              }
              label="Bật auto gửi ở cấp project"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Khung giờ gửi"
                value={workspaceProject.auto_slots || ''}
                onChange={(e) => setWorkspaceProject((current) => ({ ...current, auto_slots: e.target.value }))}
                fullWidth
                helperText="Ví dụ: 09:00,13:30,20:15"
              />
              <TextField
                label="Mỗi lượt chọn bao nhiêu campaign"
                type="number"
                value={workspaceProject.auto_pick_count || 1}
                onChange={(e) => setWorkspaceProject((current) => ({ ...current, auto_pick_count: Number(e.target.value || 1) }))}
                fullWidth
              />
            </Box>
            <TextField
              select
              label="Thứ tự gửi"
              value={workspaceProject.auto_strategy || 'round_robin'}
              onChange={(e) => setWorkspaceProject((current) => ({ ...current, auto_strategy: e.target.value }))}
              fullWidth
              helperText="Scheduler sẽ đi tuần tự theo topic/campaign con hoặc theo chiến lược chọn."
            >
              <MenuItem value="round_robin">Round robin theo topic</MenuItem>
              <MenuItem value="newest">Campaign mới nhất</MenuItem>
              <MenuItem value="oldest">Campaign cũ nhất</MenuItem>
              <MenuItem value="least_recent">Campaign ít chạy nhất</MenuItem>
              <MenuItem value="priority">Ưu tiên theo trạng thái</MenuItem>
            </TextField>
            <Card variant="outlined" sx={{ p: 1.75, bgcolor: 'rgba(15, 23, 42, 0.35)', borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Auto status</Typography>
              {autoStatus?.ok ? (
                <Box sx={{ display: 'grid', gap: 1, mt: 1 }}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label={autoStatus.group?.auto_enabled ? 'Enabled' : 'Disabled'} color={autoStatus.group?.auto_enabled ? 'success' : 'default'} size="small" />
                    <Chip label={`Campaigns: ${autoStatus.campaign_count || 0}`} size="small" variant="outlined" />
                    <Chip label={`Selected: ${(autoStatus.selected_campaign_ids || []).length}`} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Next run: {formatIso(autoStatus.group?.auto_next_run_at)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last result: {autoStatus.group?.auto_last_result || '-'}{autoStatus.group?.auto_last_error ? ` · ${autoStatus.group.auto_last_error}` : ''}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Topics: {(autoStatus.selected_topics || []).join(', ') || '-'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                    {(autoStatus.next_preview || []).map((item) => (
                      <Chip
                        key={item.campaign_id}
                        size="small"
                        variant="outlined"
                        label={`${item.title || item.campaign_id || 'campaign'} · #${item.last_msg_id || 0}`}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
                  {autoStatus?.error || 'Chưa có auto status.'}
                </Alert>
              )}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>
                <Button variant="contained" onClick={handleRunAutoNow} disabled={!workspaceProject.id} sx={{ borderRadius: 999 }}>
                  Run auto now
                </Button>
                <Button variant="outlined" onClick={() => mutateAutoStatus()} disabled={!workspaceProject.id} sx={{ borderRadius: 999 }}>
                  Refresh status
                </Button>
              </Box>
            </Card>
          </Box>

          <Divider />

          {workspaceMode === 'edit' && (
            <>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Topics</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" onClick={openTopicPaste}>Paste & detect</Button>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={createTopic}
                      disabled={!selectedProjectId || !topicDraft.name.trim()}
                    >
                      Tạo topic
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Tên topic"
                    value={topicDraft.name}
                    onChange={(e) => setTopicDraft((current) => ({ ...current, name: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Link đích / target seed"
                    value={topicDraft.target_link_seed}
                    onChange={(e) => setTopicDraft((current) => ({ ...current, target_link_seed: e.target.value }))}
                    fullWidth
                  />
                </Box>
                <Alert severity="info" variant="outlined">
                  Dán link message đích để tự nhận diện topic. Campaign con sẽ lấy target từ topic này.
                </Alert>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Topic</TableCell>
                        <TableCell>Target</TableCell>
                        <TableCell>Campaign</TableCell>
                        <TableCell align="right">Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projectTopics.map((topic) => {
                        const campaignCount = displayCampaigns.filter((campaign) => campaign.topic_id === topic.id).length;
                        const isSelected = selectedTopic?.id === topic.id;
                        return (
                          <TableRow key={topic.id} hover selected={isSelected} onClick={() => setSelectedTopicId(topic.id)} sx={{ cursor: 'pointer' }}>
                            <TableCell>
                              <Typography sx={{ fontWeight: 600 }}>{topic.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{topic.id}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {topic.target_link_seed || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip size="small" label={`${campaignCount} campaign`} />
                            </TableCell>
                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                              <IconButton size="small" onClick={() => setTopicEdit(topic)} title="Đổi tên">
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => deleteTopic(topic.id)} title="Xoá">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {projectTopics.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">Chưa có topic nào trong project này.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Divider />

              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Campaign con</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button variant="outlined" onClick={openCampaignPaste}>Paste & detect</Button>
                    <Button
                      variant="outlined"
                      startIcon={<SendIcon />}
                      onClick={createCampaign}
                      disabled={!selectedTopic || !campaignDraft.title.trim()}
                    >
                      Tạo campaign
                    </Button>
                  </Box>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Topic đích"
                    value={selectedTopic?.name || ''}
                    fullWidth
                    disabled
                    helperText="Campaign sẽ gửi vào topic đã chọn bên trái."
                  />
                  <TextField
                    label="Tên campaign"
                    value={campaignDraft.title}
                    onChange={(e) => setCampaignDraft((current) => ({ ...current, title: e.target.value }))}
                    fullWidth
                  />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  <TextField
                    label="Source link"
                    value={campaignDraft.source_start_link}
                    onChange={(e) => setCampaignDraft((current) => ({ ...current, source_start_link: e.target.value }))}
                    fullWidth
                  />
                  <TextField
                    label="Target link"
                    value={selectedTopic?.target_link_seed || ''}
                    fullWidth
                    disabled
                    helperText={selectedTopic?.target_link_seed ? 'Target được tự lấy từ topic.' : 'Topic chưa có target link seed.'}
                  />
                </Box>
                <TextField
                  label="Caption"
                  value={campaignDraft.caption}
                  onChange={(e) => setCampaignDraft((current) => ({ ...current, caption: e.target.value }))}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Campaign</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Observability</TableCell>
                        <TableCell align="right">Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedTopic ? topicCampaigns.map((campaign) => (
                        <TableRow
                          key={campaign.id}
                          hover
                          selected={selectedCampaign?.id === campaign.id}
                          onClick={() => setSelectedCampaignId(campaign.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>
                            <Typography sx={{ fontWeight: 600 }}>{campaign.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{campaign.id}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {campaign.source_start_link || campaign.target_link || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <CampaignObservability campaignId={campaign.id} campaignStatus={campaign.status} />
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handleRunCampaign(campaign.id, 'single')}>
                              Gửi 1 tin
                            </Button>
                            <Button size="small" variant="contained" sx={{ mr: 1 }} onClick={() => handleRunCampaign(campaign.id, 'full')}>
                              Gửi 1 lượt đến hết
                            </Button>
                            <IconButton size="small" onClick={() => setCampaignEdit(campaign)} title="Sửa">
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteCampaign(campaign.id)} title="Xoá">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">Chọn một topic để xem campaign con.</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {selectedCampaign && (
                  <CampaignTimelinePanel campaign={selectedCampaign} />
                )}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          {workspaceMode === 'edit' && selectedProject?.id && (
            <Button color="error" onClick={() => handleDeleteProject(selectedProject.id!)}>Xoá project</Button>
          )}
          <Button onClick={closeWorkspace}>Huỷ</Button>
          <Button onClick={handleProjectSave} variant="contained">{workspaceMode === 'create' ? 'Tạo' : 'Lưu'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!topicEdit} onClose={() => setTopicEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>Rename topic</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Tên topic"
            value={topicEdit?.name || ''}
            onChange={(e) => topicEdit && setTopicEdit({ ...topicEdit, name: e.target.value })}
            fullWidth
          />
          <TextField
            label="Target link seed"
            value={topicEdit?.target_link_seed || ''}
            onChange={(e) => topicEdit && setTopicEdit({ ...topicEdit, target_link_seed: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopicEdit(null)}>Huỷ</Button>
          <Button onClick={saveTopic} variant="contained">Lưu</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!campaignEdit} onClose={() => setCampaignEdit(null)} fullWidth maxWidth="sm">
        <DialogTitle>Chỉnh campaign</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Tên campaign"
            value={campaignEdit?.title || ''}
            onChange={(e) => campaignEdit && setCampaignEdit({ ...campaignEdit, title: e.target.value })}
            fullWidth
          />
          <TextField
            label="Source start link"
            value={campaignEdit?.source_start_link || ''}
            onChange={(e) => campaignEdit && setCampaignEdit({ ...campaignEdit, source_start_link: e.target.value })}
            fullWidth
          />
          <TextField
            label="Caption"
            value={campaignEdit?.caption || ''}
            onChange={(e) => campaignEdit && setCampaignEdit({ ...campaignEdit, caption: e.target.value })}
            fullWidth
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCampaignEdit(null)}>Huỷ</Button>
          <Button onClick={handleCampaignEditSave} variant="contained">Lưu</Button>
        </DialogActions>
      </Dialog>

      <TelegramPasteDialog
        open={pasteDialogOpen}
        mode={pasteTarget === 'topic' ? 'topic' : 'campaign'}
        onClose={() => setPasteDialogOpen(false)}
        onApply={pasteTarget === 'topic' ? handleTopicPasteApply : handleCampaignPasteApply}
      />

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
