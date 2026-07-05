'use client';

import React from 'react';
import useSWR from 'swr';
import { fetchApi, fetcher } from '../../../lib/api';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import type { SelectChangeEvent } from '@mui/material/Select';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import TopicIcon from '@mui/icons-material/Topic';
import SendIcon from '@mui/icons-material/Send';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import ScheduleIcon from '@mui/icons-material/Schedule';

type ProjectRow = {
  id?: string;
  name: string;
  description?: string | null;
  status?: string | null;
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
  schedule_slots?: string | null;
  last_run_at?: string | null;
  last_msg_id?: number | null;
  last_target_post_id?: number | null;
  total_sent_count?: number | null;
  next_send_at?: string | null;
  created_at?: string | null;
};

type RunRow = {
  id: string;
  status?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  result?: Record<string, unknown> | null;
};

type JobRow = {
  id: string;
  job_type?: string | null;
  status?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  locked_by?: string | null;
  account_id?: string | null;
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
};

type LogRow = {
  id: number;
  created_at: string;
  level: string;
  code: string;
  message: string;
  campaign_id?: string | null;
  payload?: Record<string, unknown> | null;
};

type PreflightResponse = {
  ok: boolean;
  campaign_id: string;
  issues?: Array<{ code: string; message: string }>;
  warnings?: Array<{ code: string; message: string }>;
  checks?: Array<{ key: string; label: string; ok: boolean }>;
  campaign?: {
    title?: string | null;
    status?: string | null;
    run_mode?: string | null;
    source_start_link?: string | null;
    source_end_link?: string | null;
    target_link?: string | null;
    batch_size?: number | null;
    delay_min?: number | null;
    delay_max?: number | null;
    follow_latest?: boolean | null;
    last_msg_id?: number | null;
    next_send_at?: string | null;
    topic?: { id?: string | null; name?: string | null; target_link_seed?: string | null };
    project?: { id?: string | null; name?: string | null };
    account_pool?: { eligible?: number; total?: number; reasons?: Record<string, unknown> };
  };
};

type PreviewResponse = {
  ok: boolean;
  campaign_id: string;
  run_mode?: string | null;
  batch_size?: number | null;
  delay_min?: number | null;
  delay_max?: number | null;
  cursor_last_msg_id?: number | null;
  summary?: {
    source?: string | null;
    target?: string | null;
    next_cursor?: number | null;
    project_name?: string | null;
    topic_name?: string | null;
  };
  preview?: Array<{
    step: number;
    source?: string | null;
    target?: string | null;
    cursor?: number | null;
    delay_window?: { min?: number; max?: number };
    caption_mode?: string | null;
  }>;
};

const statusTone = (value?: string | null): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  const key = String(value || '').toLowerCase();
  if (['active', 'enabled', 'success', 'sent', 'done'].includes(key)) return 'success';
  if (['failed', 'error', 'inactive', 'paused', 'blocked'].includes(key)) return 'error';
  if (['queued', 'scheduled', 'pending'].includes(key)) return 'warning';
  if (['running', 'sleeping'].includes(key)) return 'info';
  return 'default';
};

const formatIso = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN', { hour12: false }) : '-');

export default function DripPage() {
  const { data: projects } = useSWR<ProjectRow[]>('/api/groups?limit=100', fetcher);
  const { data: topics } = useSWR<TopicRow[]>('/api/topics?limit=200', fetcher);
  const { data: campaigns } = useSWR<CampaignRow[]>('/api/campaigns?limit=100', fetcher);
  const [selectedCampaignId, setSelectedCampaignId] = React.useState<string>('');
  const projectList = projects || [];
  const topicList = topics || [];
  const campaignList = campaigns || [];

  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');

  const selectedProject = React.useMemo(
    () => projectList.find((project) => project.id === selectedProjectId) || projectList[0] || null,
    [projectList, selectedProjectId],
  );

  const projectTopics = React.useMemo(
    () => selectedProject
      ? topicList
        .filter((topic) => topic.group_id === selectedProject.id)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
      : [],
    [selectedProject, topicList],
  );

  const projectCampaigns = React.useMemo(
    () => selectedProject
      ? campaignList.filter((campaign) => campaign.group_id === selectedProject.id)
      : [],
    [campaignList, selectedProject],
  );

  const selectedCampaign = React.useMemo(
    () => projectCampaigns.find((campaign) => campaign.id === selectedCampaignId) || projectCampaigns[0] || null,
    [projectCampaigns, selectedCampaignId],
  );

  const activeCampaigns = projectCampaigns.filter((campaign) => ['queued', 'running', 'scheduled', 'active'].includes(String(campaign.status || '').toLowerCase()));
  const projectSummary = React.useMemo(() => ({
    topics: projectTopics.length,
    campaigns: projectCampaigns.length,
    active: activeCampaigns.length,
  }), [activeCampaigns.length, projectCampaigns.length, projectTopics.length]);

  React.useEffect(() => {
    if (!selectedProject && projectList[0]?.id) {
      setSelectedProjectId(projectList[0].id!);
    }
  }, [projectList, selectedProject]);

  React.useEffect(() => {
    if (!projectCampaigns.length) {
      setSelectedCampaignId('');
      return;
    }
    if (!projectCampaigns.some((campaign) => campaign.id === selectedCampaignId)) {
      setSelectedCampaignId(projectCampaigns[0].id);
    }
  }, [projectCampaigns, selectedCampaignId]);

  const projectOptions = projectList.map((project) => ({
    label: project.name,
    value: project.id || '',
  }));

  const reusableFields = [
    'Project container',
    'Topic target seed',
    'Campaign child source',
    'Cursor last_msg_id',
    'next_send_at',
    'schedule_slots',
    'total_sent_count',
    'status',
  ];

  const runDripCampaign = async (campaignId: string) => {
    await fetchApi(`/api/campaigns/${campaignId}/run?mode=drip`, { method: 'POST' });
  };

  const CampaignObservability = ({ campaign }: { campaign: CampaignRow }) => {
    const { data: runs } = useSWR<RunRow[]>(`/api/runs/campaigns/${campaign.id}?limit=5`, fetcher, { refreshInterval: 5000 });
    const { data: jobs } = useSWR<JobRow[]>(`/api/runs/jobs?campaign_id=${campaign.id}&limit=5`, fetcher, { refreshInterval: 5000 });
    const { data: logs } = useSWR<LogRow[]>(`/api/logs?entity_type=campaign&entity_id=${campaign.id}&limit=10`, fetcher, { refreshInterval: 5000 });
    const latestRun = runs?.[0];
    const latestJob = jobs?.[0];
    const latestLog = logs?.[0];
    const runStatus = String(latestRun?.status || '').toLowerCase();
    const jobStatus = String(latestJob?.status || '').toLowerCase();
    const campaignStatus = String(campaign.status || '').toLowerCase();
    const state = (() => {
      if (jobStatus === 'failed' || runStatus === 'failed' || campaignStatus.includes('lỗi')) return { label: 'Failed', color: 'error' as const };
      if (jobStatus === 'running' || runStatus === 'running' || campaignStatus.includes('running')) return { label: 'Running', color: 'info' as const };
      if (jobStatus === 'pending' || campaignStatus === 'queued' || campaignStatus === 'scheduled') return { label: 'Queued', color: 'warning' as const };
      if (campaignStatus.includes('sleep')) return { label: 'Sleeping', color: 'secondary' as const };
      if (jobStatus === 'success' || runStatus === 'success' || campaignStatus === 'done') return { label: 'Sent', color: 'success' as const };
      return { label: 'Waiting worker', color: 'default' as const };
    })();
    const accountLabel = String(
      latestJob?.account_id
        || (latestJob?.result as Record<string, unknown> | undefined)?.account_id
        || (latestJob?.payload as Record<string, unknown> | undefined)?.account_id
        || '-',
    );
    const lastMsgId = Number(
      (latestJob?.result as Record<string, unknown> | undefined)?.last_msg_id
        ?? (latestJob?.payload as Record<string, unknown> | undefined)?.last_msg_id
        ?? (latestRun?.result as Record<string, unknown> | undefined)?.last_msg_id
        ?? (campaign.last_msg_id || 0),
    );
    const nextSendAt = campaign.next_send_at || String((latestRun?.result as Record<string, unknown> | undefined)?.next_send_at || '');

    const timeline = [
      latestJob && {
        key: `job-${latestJob.id}`,
        ts: latestJob.started_at || latestJob.created_at || '',
        title: `Job ${latestJob.status || 'unknown'}`,
        detail: [latestJob.job_type || '', latestJob.last_error || '', latestJob.locked_by ? `locked_by=${latestJob.locked_by}` : '', accountLabel !== '-' ? `account=${accountLabel}` : ''].filter(Boolean).join(' · '),
      },
      latestRun && {
        key: `run-${latestRun.id}`,
        ts: latestRun.started_at || latestRun.created_at || '',
        title: `Run ${latestRun.status || 'unknown'}`,
        detail: latestRun.last_error || JSON.stringify(latestRun.result || {}),
      },
      latestLog && {
        key: `log-${latestLog.id}`,
        ts: latestLog.created_at || '',
        title: `Log ${latestLog.level || 'info'} · ${latestLog.code || ''}`,
        detail: latestLog.message || '',
      },
    ].filter(Boolean) as Array<{ key: string; ts: string; title: string; detail: string }>;

    return (
      <Card sx={{ p: 2.5, borderRadius: 4, mt: 3, border: '1px solid rgba(148, 163, 184, 0.15)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Chi tiết job gần nhất
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Merged timeline từ runs, jobs và logs của campaign child đang chọn.
            </Typography>
          </Box>
          <Chip label={state.label} color={state.color} variant="filled" sx={{ borderRadius: 999 }} />
        </Box>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
              <Typography variant="caption" color="text.secondary">Account</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, wordBreak: 'break-all' }}>{accountLabel}</Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
              <Typography variant="caption" color="text.secondary">Last message</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{Number.isFinite(lastMsgId) && lastMsgId > 0 ? `#${lastMsgId}` : '-'}</Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
              <Typography variant="caption" color="text.secondary">Next ETA</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, wordBreak: 'break-all' }}>{nextSendAt || '-'}</Typography>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'grid', gap: 1, mt: 2 }}>
          {timeline.length > 0 ? timeline.map((item) => (
            <Card key={item.key} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.ts ? new Date(item.ts).toLocaleString('vi-VN', { hour12: false }) : '-'}
                  </Typography>
                </Box>
                <Chip label="timeline" size="small" variant="outlined" sx={{ borderRadius: 999 }} />
              </Box>
              {item.detail && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {item.detail}
                </Typography>
              )}
            </Card>
          )) : (
            <Alert severity="info" variant="outlined">
              Chưa có run/job/log nào cho campaign này.
            </Alert>
          )}
        </Box>
      </Card>
    );
  };

  const CampaignPreflight = ({ campaign }: { campaign: CampaignRow }) => {
    const { data: preflight } = useSWR<PreflightResponse>(`/api/campaigns/${campaign.id}/preflight`, fetcher, { refreshInterval: 10000 });
    const { data: preview } = useSWR<PreviewResponse>(`/api/campaigns/${campaign.id}/preview`, fetcher, { refreshInterval: 10000 });
    const issues = preflight?.issues || [];
    const warnings = preflight?.warnings || [];
    const checks = preflight?.checks || [];
    return (
      <Card sx={{ p: 2.5, borderRadius: 4, mt: 3, border: '1px solid rgba(148, 163, 184, 0.15)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Preflight và Preview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Chỉ đọc trước khi chạy. Dùng để biết campaign này đang thiếu gì và Drip sẽ đi theo flow nào.
            </Typography>
          </Box>
          <Chip label={preflight?.ok ? 'Ready' : 'Blocked'} color={preflight?.ok ? 'success' : 'error'} variant="filled" sx={{ borderRadius: 999 }} />
        </Box>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ p: 1.75, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                Checks
              </Typography>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {checks.map((item) => (
                  <Alert key={item.key} severity={item.ok ? 'success' : 'warning'} variant="outlined">
                    {item.label}
                  </Alert>
                ))}
                {!checks.length && (
                  <Alert severity="info" variant="outlined">Chưa có preflight data.</Alert>
                )}
              </Box>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ p: 1.75, height: '100%' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                Issues / warnings
              </Typography>
              <Box sx={{ display: 'grid', gap: 1 }}>
                {issues.map((item) => (
                  <Alert key={item.code} severity="error" variant="filled">{item.message}</Alert>
                ))}
                {warnings.map((item) => (
                  <Alert key={item.code} severity="warning" variant="outlined">{item.message}</Alert>
                ))}
                {!issues.length && !warnings.length && (
                  <Alert severity="success" variant="outlined">Không thấy blocker nào ở preflight.</Alert>
                )}
              </Box>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Card variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Source</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>{preflight?.campaign?.source_start_link || preview?.summary?.source || '-'}</Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Card variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Target</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, wordBreak: 'break-word' }}>{preflight?.campaign?.target_link || preview?.summary?.target || '-'}</Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Card variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Cursor</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>{preview?.cursor_last_msg_id || preflight?.campaign?.last_msg_id || 0}</Typography>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 3 }}>
            <Card variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Batch / delay</Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {preview?.batch_size || preflight?.campaign?.batch_size || 1} / {preview?.delay_min || preflight?.campaign?.delay_min || 1}-{preview?.delay_max || preflight?.campaign?.delay_max || 7}
              </Typography>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ display: 'grid', gap: 1, mt: 2 }}>
          {(preview?.preview || []).length > 0 ? preview!.preview!.map((item) => (
            <Card key={item.step} variant="outlined" sx={{ p: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Step #{item.step}</Typography>
                <Chip label={item.caption_mode || 'keep'} size="small" variant="outlined" />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                source: {item.source || '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                target: {item.target || '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                cursor: {item.cursor ?? '-'} · delay: {item.delay_window?.min ?? '-'}-{item.delay_window?.max ?? '-'}s
              </Typography>
            </Card>
          )) : (
            <Alert severity="info" variant="outlined">
              Chưa có preview data.
            </Alert>
          )}
        </Box>
      </Card>
    );
  };

  return (
    <Box>
      <Card sx={{
        mb: 3,
        p: 2.5,
        borderRadius: 4,
        border: '1px solid rgba(148, 163, 184, 0.18)',
        background: 'linear-gradient(135deg, rgba(168,85,247,0.14), rgba(15,23,42,0.35) 55%, rgba(59,130,246,0.10))',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="overline" sx={{ letterSpacing: 1.6, fontWeight: 800, color: 'text.secondary' }}>
              DRIP WORKSPACE
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Drip
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Reuse model hiện tại: Project - Topic - Campaign child. Không tạo schema Drip riêng ở phase này.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`Projects: ${projectList.length}`} color="info" variant="outlined" icon={<FolderOpenIcon />} />
            <Chip label={`Topics: ${topicList.length}`} variant="outlined" icon={<TopicIcon />} />
            <Chip label={`Active campaigns: ${activeCampaigns.length}`} color="success" variant="outlined" icon={<SendIcon />} />
          </Box>
        </Box>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 2.5, borderRadius: 4, border: '1px solid rgba(148, 163, 184, 0.15)' }}>
            <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: 1.1 }}>
              Reuse selector
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5, mb: 2 }}>
              Chọn project Drip
            </Typography>
            <Select
              fullWidth
              value={selectedProjectId}
              onChange={(e: SelectChangeEvent) => setSelectedProjectId(e.target.value)}
              displayEmpty
              size="small"
            >
              <MenuItem value="">
                <em>Chọn project</em>
              </MenuItem>
              {projectOptions.map((item) => (
                <MenuItem key={item.value} value={item.value}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
              Map Drip vào model hiện tại
            </Typography>
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Chip label="Project = container" variant="outlined" />
              <Chip label="Topic = target / destination" variant="outlined" />
              <Chip label="Campaign child = luồng Drip thật" variant="outlined" />
              <Chip label="Run / Job / Events = timeline thật" variant="outlined" />
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <QueryStatsIcon color="info" />
                <Typography variant="overline" sx={{ display: 'block', mt: 1, fontWeight: 800, color: 'text.secondary' }}>
                  Runtime reuse
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                  runs / jobs / events
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                  Drip sẽ dùng chung queue, worker và timeline của hệ thống hiện tại.
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <ScheduleIcon color="warning" />
                <Typography variant="overline" sx={{ display: 'block', mt: 1, fontWeight: 800, color: 'text.secondary' }}>
                  Scheduler reuse
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                  next_send_at
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                  Lịch Drip sẽ gắn vào campaign child thay vì tạo hệ scheduler riêng.
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <SendIcon color="success" />
                <Typography variant="overline" sx={{ display: 'block', mt: 1, fontWeight: 800, color: 'text.secondary' }}>
                  Cursor reuse
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                  last_msg_id
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                  Drip tiếp tục từ cursor hiện tại để không quét lại từ đầu.
                </Typography>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
                <TopicIcon color="secondary" />
                <Typography variant="overline" sx={{ display: 'block', mt: 1, fontWeight: 800, color: 'text.secondary' }}>
                  Model reuse
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                  topic / campaign child
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
                  Không tách schema mới ở phase này, chỉ dùng đúng model hiện tại.
                </Typography>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mt: 3, p: 2.5, borderRadius: 4, border: '1px solid rgba(148, 163, 184, 0.15)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Project hiện tại
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {selectedProject ? selectedProject.name : 'Chưa chọn project nào.'}
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Auto scheduler</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {selectedProject?.auto_enabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Slots: {selectedProject?.auto_slots || '-'}
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Topics</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {projectTopics.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Topic là đích vận hành, campaign child sẽ inherit target.
                  </Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary">Campaign child</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {projectCampaigns.length}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Campaign child là luồng Drip thật.
                  </Typography>
                </Card>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mt: 3, borderRadius: 4, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
            Topics và campaign child của project
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reuse đúng data model hiện tại, chưa tạo schema Drip riêng.
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Topic</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Target seed</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Campaign child</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Cursor</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedProject ? projectTopics.map((topic) => {
                const topicCampaigns = projectCampaigns.filter((campaign) => campaign.topic_id === topic.id);
                return (
                  <React.Fragment key={topic.id}>
                    <TableRow>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700 }}>{topic.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{topic.id}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {topic.target_link_seed || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={`${topicCampaigns.length} campaign`} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          Topic target reused by campaign child
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={topic.status || 'active'} variant="outlined" />
                      </TableCell>
                    </TableRow>
                    {topicCampaigns.map((campaign) => (
                      <TableRow
                        key={campaign.id}
                        hover
                        selected={selectedCampaign?.id === campaign.id}
                        onClick={() => setSelectedCampaignId(campaign.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell sx={{ pl: 4 }}>
                          <Typography sx={{ fontWeight: 700 }}>{campaign.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{campaign.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                            {campaign.source_start_link || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {campaign.total_sent_count || 0} sent
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {campaign.last_msg_id || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Chip size="small" label={campaign.status || 'draft'} color={statusTone(campaign.status)} variant="outlined" sx={{ borderRadius: 999 }} />
                            <Typography variant="caption" color="text.secondary">
                              Next: {formatIso(campaign.next_send_at)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Target post: {campaign.last_target_post_id || 0}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label="Run drip"
                              color="success"
                              variant="outlined"
                              sx={{ cursor: 'pointer', borderRadius: 999 }}
                              onClick={() => runDripCampaign(campaign.id)}
                            />
                            <Chip
                              label="Drip mode"
                              variant="filled"
                              color="info"
                              sx={{ borderRadius: 999 }}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography color="text.secondary">Chọn một project để xem topics và campaign child.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {selectedCampaign && (
        <CampaignObservability campaign={selectedCampaign} />
      )}

      {selectedCampaign && (
        <CampaignPreflight campaign={selectedCampaign} />
      )}

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Các field Drip reuse ngay
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Những field này đã nằm trong model hiện tại hoặc có thể map thẳng vào campaign child.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {reusableFields.map((field) => (
                <Chip key={field} label={field} variant="outlined" />
              ))}
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ p: 2.5, borderRadius: 4, height: '100%', border: '1px solid rgba(148, 163, 184, 0.15)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
              Phase 2 output
            </Typography>
            <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
              Drip đã được đặt lên đúng model hiện tại: project làm container, topic làm đích, campaign child làm luồng chạy.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, lineHeight: 1.7 }}>
              Phase này chưa thêm runtime riêng. Mục tiêu chỉ là đảm bảo Drip bám đúng dữ liệu thật đang có, để các phase sau gắn queue/worker/observability/scheduler vào mà không phải đập lại model.
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
