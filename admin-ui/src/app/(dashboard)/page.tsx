'use client';

import React from 'react';
import useSWR from 'swr';
import { fetcher } from '../../lib/api';
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";

import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CategoryIcon from '@mui/icons-material/Category';
import SendIcon from '@mui/icons-material/Send';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import ShieldIcon from '@mui/icons-material/Shield';
import MemoryIcon from '@mui/icons-material/Memory';
import UpdateIcon from '@mui/icons-material/Update';

type HealthSnapshot = {
  ok: boolean;
  ts?: string;
  worker?: { worker_id?: string; ts?: string; status?: string; detail?: Record<string, unknown> } | null;
  scheduler?: { worker_id?: string; ts?: string; status?: string; detail?: Record<string, unknown> } | null;
  counts?: {
    groups?: number;
    topics?: number;
    campaigns?: number;
    accounts?: number;
    pending_jobs?: number;
    running_jobs?: number;
    recent_events?: number;
    recent_jobs?: number;
  };
  safety?: {
    active_accounts?: number;
    paused_accounts?: number;
    risky_accounts?: number;
    daily_limit_exceeded?: number;
  };
};

export default function Dashboard() {
  const [now, setNow] = React.useState(() => Date.now());
  const { data, error, isLoading } = useSWR('/api/dashboard/summary', fetcher, { refreshInterval: 30000 });
  const { data: health } = useSWR<HealthSnapshot>('/api/internal/health', fetcher, { refreshInterval: 15000 });

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }

  const summaryData = data && !error ? data : {
    groups: 0,
    topics: 0,
    campaigns: 0,
    pending_jobs: 0,
    running_jobs: 0,
    failed_jobs: 0,
  };

  const stats = [
    { label: 'TỔNG DỰ ÁN', value: summaryData.groups, color: '#0ea5e9', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', bgcolor: '#e0f2fe', icon: <FolderOpenIcon sx={{ color: '#fff' }} /> },
    { label: 'TOPICS / THƯ MỤC', value: summaryData.topics, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', bgcolor: '#ede9fe', icon: <CategoryIcon sx={{ color: '#fff' }} /> },
    { label: 'TỔNG CHIẾN DỊCH', value: summaryData.campaigns, color: '#f59e0b', gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', bgcolor: '#fef3c7', icon: <SendIcon sx={{ color: '#fff' }} /> },
    { label: 'ĐANG CHỜ (PENDING)', value: summaryData.pending_jobs, color: '#64748b', gradient: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)', bgcolor: '#f1f5f9', icon: <HourglassEmptyIcon sx={{ color: '#fff' }} /> },
    { label: 'ĐANG CHẠY (RUNNING)', value: summaryData.running_jobs, color: '#10b981', gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', bgcolor: '#dcfce7', icon: <PlayArrowIcon sx={{ color: '#fff' }} /> },
    { label: 'THẤT BẠI (FAILED)', value: summaryData.failed_jobs, color: '#ef4444', gradient: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)', bgcolor: '#fee2e2', icon: <ErrorOutlineIcon sx={{ color: '#fff' }} /> },
  ];

  const workerStatus = String(health?.worker?.status || 'unknown');
  const schedulerStatus = String(health?.scheduler?.status || 'unknown');
  const pendingJobs = Number(health?.counts?.pending_jobs || 0);
  const runningJobs = Number(health?.counts?.running_jobs || 0);
  const workerHeartbeatTs = health?.worker?.ts ? Date.parse(health.worker.ts) : Number.NaN;
  const workerHeartbeatAgeMs = Number.isFinite(workerHeartbeatTs) ? now - workerHeartbeatTs : Number.POSITIVE_INFINITY;
  const workerHeartbeatFresh = workerHeartbeatAgeMs >= 0 && workerHeartbeatAgeMs <= 60000;
  const workerHeartbeatAgeLabel = Number.isFinite(workerHeartbeatAgeMs)
    ? `${Math.max(0, Math.round(workerHeartbeatAgeMs / 1000))}s ago`
    : 'unknown';
  const workerBadge = (() => {
    if (!workerHeartbeatFresh) return 'down';
    if (workerStatus === 'busy' || workerStatus === 'running' || runningJobs > 0) return 'alive';
    if (pendingJobs === 0 && runningJobs === 0) return 'no job';
    return 'idle';
  })();
  const workerBadgeReason = (() => {
    if (!workerHeartbeatFresh) {
      return `Heartbeat stale (${workerHeartbeatAgeLabel}), pending ${pendingJobs}, running ${runningJobs}.`;
    }
    if (workerStatus === 'busy' || workerStatus === 'running' || runningJobs > 0) {
      return `Worker is actively processing jobs. Last heartbeat ${workerHeartbeatAgeLabel}, pending ${pendingJobs}, running ${runningJobs}.`;
    }
    if (pendingJobs === 0 && runningJobs === 0) {
      return `Worker heartbeat is fresh, but there are no queued or running jobs. Last heartbeat ${workerHeartbeatAgeLabel}.`;
    }
    return `Worker heartbeat is fresh. Pending ${pendingJobs}, running ${runningJobs}.`;
  })();
  const statusTone = (value: string): 'default' | 'error' | 'info' | 'success' | 'warning' => {
    if (value === 'busy' || value === 'running') return 'success';
    if (value === 'idle') return 'info';
    if (value === 'error') return 'error';
    return 'default';
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
        Tổng quan vận hành
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Trạng thái thật từ backend, không còn số liệu demo.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
        <UpdateIcon fontSize="inherit" />
        Health live refresh tự động từ /api/internal/health
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={idx}>
            <Card sx={{ 
              borderRadius: 4, 
              boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', 
              border: '1px solid rgba(226, 232, 240, 0.8)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                borderColor: stat.color,
              }
            }}>
              <Box sx={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '4px', 
                background: stat.gradient 
              }} />
              <CardContent sx={{ p: 3, pt: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: '12px', 
                    background: stat.gradient,
                    boxShadow: `0 4px 10px ${stat.color}40`,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b', letterSpacing: 1.2 }}>
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

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ borderRadius: 4, border: '1px solid rgba(226, 232, 240, 0.8)', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)' }}>
                  <MemoryIcon sx={{ color: '#fff' }} />
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: '#64748b' }}>HEALTH LIVE</Typography>
                  <Typography variant="body2" color="text.secondary">Worker, scheduler, queue và account safety</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip
                  label={`Worker: ${workerBadge}`}
                  color={workerBadge === 'down' ? 'error' : workerBadge === 'alive' ? 'success' : workerBadge === 'idle' ? 'info' : 'default'}
                  variant="filled"
                />
                <Chip label={`worker raw: ${workerStatus}`} color={statusTone(workerStatus)} variant="outlined" />
                <Chip label={`scheduler: ${schedulerStatus}`} color={statusTone(schedulerStatus)} />
                <Chip label={`accounts: ${health?.counts?.accounts ?? 0}`} variant="outlined" />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                {workerBadgeReason}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 2 }}>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Pending jobs</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{pendingJobs}</Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Running jobs</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{runningJobs}</Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Active accounts</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{health?.safety?.active_accounts ?? 0}</Typography>
                </Box>
                <Box sx={{ p: 2, borderRadius: 3, bgcolor: '#f8fafc' }}>
                  <Typography variant="caption" color="text.secondary">Paused / risky</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>{(health?.safety?.paused_accounts ?? 0) + (health?.safety?.risky_accounts ?? 0)}</Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                <ShieldIcon fontSize="small" />
                <Typography variant="body2">
                  Worker heartbeat {workerHeartbeatFresh ? 'còn sống' : 'quá hạn'} · cập nhật lúc {health?.worker?.ts ? new Date(health.worker.ts).toLocaleString('vi-VN', { hour12: false }) : 'chưa có dữ liệu'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
