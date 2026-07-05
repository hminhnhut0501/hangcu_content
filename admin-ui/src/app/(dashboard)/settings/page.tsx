'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { fetchApi, fetcher } from '../../../lib/api';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import SaveIcon from '@mui/icons-material/Save';
import SyncIcon from '@mui/icons-material/Sync';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import ScienceIcon from '@mui/icons-material/Science';
import BugReportIcon from '@mui/icons-material/BugReport';

type AccountRow = {
  id: string;
  name: string;
  phone?: string | null;
  api_id?: number | null;
  api_hash?: string | null;
  session_ref?: string | null;
  is_active?: boolean | null;
  status?: string | null;
  risk_status?: string | null;
  risk_reason?: string | null;
  daily_job_limit?: number | null;
  daily_job_count?: number | null;
  quota_source?: string | null;
  last_checked_at?: string | null;
  last_error?: string | null;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const { data: accounts, isLoading, mutate } = useSWR<AccountRow[]>('/api/accounts', fetcher);
  const [tabValue, setTabValue] = useState(0);
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'error' | 'warning' }>({ show: false, msg: '', type: 'success' });
  const [selectedAccount, setSelectedAccount] = useState<AccountRow | null>(null);
  const [schemaReport, setSchemaReport] = useState<{
    ok?: boolean;
    missing?: Record<string, string[]>;
    extra?: Record<string, string[]>;
    suggested_migrations?: { table: string; column: string; sql: string }[];
  } | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    api_id: '',
    api_hash: '',
    session_ref: '',
    daily_job_limit: 30,
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const notify = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, msg, type });
  };

  const refresh = async () => {
    return await mutate();
  };

  const createOrUpdateAccount = async () => {
    try {
      if (selectedAccount?.id) {
        await fetchApi(`/api/accounts/${selectedAccount.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: trimmedName,
            phone: form.phone || null,
            api_id: form.api_id ? Number(form.api_id) : null,
            api_hash: form.api_hash || null,
            session_ref: form.session_ref || null,
            is_active: Boolean(selectedAccount.is_active),
            daily_job_limit: Number(form.daily_job_limit || 30),
          }),
        });
        await refresh();
        notify('Đã cập nhật account.', 'success');
      } else {
        await fetchApi('/api/accounts', {
          method: 'POST',
          body: JSON.stringify({
            name: trimmedName,
            phone: form.phone || null,
            api_id: form.api_id ? Number(form.api_id) : null,
            api_hash: form.api_hash || null,
            session_ref: form.session_ref || null,
            is_active: false,
            daily_job_limit: Number(form.daily_job_limit || 30),
          }),
        });
        await refresh();
        notify('Đã tạo account.', 'success');
      }
      setSelectedAccount(null);
      setForm({ name: '', phone: '', api_id: '', api_hash: '', session_ref: '', daily_job_limit: 30 });
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không thể lưu account.', 'error');
    }
  };

  const loadAccountToForm = (account?: AccountRow | null) => {
    if (!account) {
      setSelectedAccount(null);
      setForm({ name: '', phone: '', api_id: '', api_hash: '', session_ref: '', daily_job_limit: 30 });
      return;
    }
    setSelectedAccount(account);
      setForm({
        name: account.name || '',
        phone: account.phone || '',
        api_id: account.api_id ? String(account.api_id) : '',
        api_hash: account.api_hash || '',
        session_ref: account.session_ref || '',
        daily_job_limit: Number(account.daily_job_limit ?? 30),
      });
  };

  const testAccount = async (account: AccountRow) => {
    try {
      const res = await fetchApi(`/api/accounts/${account.id}/test`, { method: 'POST' });
      notify(res.ok ? res.message || 'Account OK' : res.message || 'Test failed', res.ok ? 'success' : 'warning');
      await refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không test được account.', 'error');
    }
  };

  const resumeAccount = async (account: AccountRow) => {
    try {
      const res = await fetchApi(`/api/accounts/${account.id}/resume`, { method: 'POST' });
      const payload = res as {
        row?: AccountRow | null;
        before?: AccountRow | null;
        current?: AccountRow | null;
        error?: string | null;
      } | undefined;
      const resumedRow = payload?.row || null;
      const before = payload?.before || null;
      const current = payload?.current || null;
      const debugMessage = resumedRow?.is_active
        ? 'Đã resume account.'
        : `Resume chưa đổi trạng thái. before=${String(before?.is_active ?? 'n/a')} current=${String(current?.is_active ?? 'n/a')} row=${String(resumedRow?.is_active ?? 'n/a')}${payload?.error ? ` error=${payload.error}` : ''}`;
      notify(debugMessage, resumedRow?.is_active ? 'success' : 'warning');
      if (resumedRow) {
        setSelectedAccount(prev => (prev?.id === account.id ? resumedRow : prev));
      }
      await refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không thể resume account.', 'error');
    }
  };

  const pauseAccount = async (account: AccountRow) => {
    try {
      await fetchApi(`/api/accounts/${account.id}/pause?reason=manual_pause`, { method: 'POST' });
      notify('Đã pause account.', 'warning');
      await refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không thể pause account.', 'error');
    }
  };

  const normalizeQuota = async (account: AccountRow) => {
    try {
      await fetchApi(`/api/accounts/${account.id}/normalize-quota`, { method: 'POST' });
      notify('Đã normalize quota về 30.', 'success');
      await refresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không thể normalize quota.', 'error');
    }
  };

  const runSchemaReconcile = async () => {
    setSchemaLoading(true);
    try {
      const res = await fetchApi('/api/admin/schema/reconcile');
      setSchemaReport(res as typeof schemaReport);
      const missingTables = Object.keys((res as { missing?: Record<string, string[]> }).missing || {});
      notify(missingTables.length ? `Schema reconcile xong, thiếu ở ${missingTables.join(', ')}` : 'Schema reconcile xong, không thiếu cột chính.', missingTables.length ? 'warning' : 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Không chạy được schema reconcile.', 'error');
    } finally {
      setSchemaLoading(false);
    }
  };

  const exportSchemaReport = async () => {
    if (!schemaReport) {
      notify('Chưa có schema report để export.', 'warning');
      return;
    }
    const text = JSON.stringify(schemaReport, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      notify('Đã copy schema reconciliation report.', 'success');
    } catch {
      notify(text, 'warning');
    }
  };

  const activeCount = (accounts || []).filter(a => a.is_active && (a.risk_status || 'active') === 'active').length;
  const pausedCount = (accounts || []).filter(a => (a.risk_status || '') === 'paused' || !a.is_active).length;
  const trimmedName = form.name.trim();
  const canCreateAccount = trimmedName.length > 0;
  const getQuotaSourceLabel = (account?: AccountRow | null) => (account?.quota_source || 'default') === 'backend' ? 'backend' : 'default';
  const getQuotaDebugText = (account?: AccountRow | null) => {
    if (!account) return '';
    const source = getQuotaSourceLabel(account);
    const limit = Number(account.daily_job_limit || 0);
    const count = Number(account.daily_job_count || 0);
    const effectiveLimit = limit > 0 ? limit : 30;
    return `source=${source} limit=${effectiveLimit} count=${count}`;
  };

  const getAccountBlockReason = (account: AccountRow) => {
    const riskStatus = String(account.risk_status || 'active').toLowerCase();
    const isActive = Boolean(account.is_active);
    const dailyLimit = Number(account.daily_job_limit || 0);
    const dailyCount = Number(account.daily_job_count || 0);
    if (!isActive) return 'Inactive';
    if (riskStatus === 'paused') return 'Paused';
    if (riskStatus && riskStatus !== 'active') return 'Risky';
    if (dailyLimit > 0 && dailyCount >= dailyLimit) return 'Quota reached';
    return 'Available';
  };

  const getAccountBlockTone = (reason: string): 'default' | 'error' | 'warning' | 'success' => {
    if (reason === 'Available') return 'success';
    if (reason === 'Quota reached') return 'warning';
    return 'error';
  };

  const selectedBackendQuota = selectedAccount?.daily_job_limit;
  const selectedQuotaLoadedFromBackend = selectedAccount ? selectedBackendQuota !== null && selectedBackendQuota !== undefined : false;
  const selectedQuotaValue = Number(form.daily_job_limit || 0);
  const isQuotaMismatch = (account: AccountRow) => (Number(account.daily_job_limit || 0) <= 0) || (account.quota_source || 'default') !== 'backend';

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
        Hệ thống & Tài khoản
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Console an toàn account, trạng thái risk và thông số vận hành.
      </Typography>

      <Card sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="Tài khoản Telegram" sx={{ fontWeight: 'medium' }} />
            <Tab label="Cấu hình hệ thống" sx={{ fontWeight: 'medium' }} />
          </Tabs>
        </Box>

        <CustomTabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1.2fr 0.8fr' }, gap: 3 }}>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Accounts</Typography>
                <Chip label={`active ${activeCount}`} size="small" color="success" variant="outlined" />
                <Chip label={`paused ${pausedCount}`} size="small" color="warning" variant="outlined" />
                <Button sx={{ ml: 'auto' }} size="small" onClick={() => mutate()} startIcon={<SyncIcon />}>Refresh</Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Risk</TableCell>
                      <TableCell>Quota</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <CircularProgress size={20} />
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && (accounts || []).map((account) => (
                      <TableRow key={account.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{account.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{account.phone || account.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={account.is_active ? 'Account đang bật' : 'Account đang tắt'} arrow>
                            <Chip size="small" label={account.is_active ? 'active' : 'inactive'} color={account.is_active ? 'success' : 'default'} />
                          </Tooltip>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            is_active={String(Boolean(account.is_active))}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const reason = getAccountBlockReason(account);
                            return (
                              <>
                                <Tooltip title={`risk_status=${account.risk_status || 'active'}`} arrow>
                                  <Chip
                                    size="small"
                                    label={account.risk_status || 'active'}
                                    color={(account.risk_status || 'active') === 'paused' ? 'warning' : (account.risk_status || 'active') === 'active' ? 'success' : 'error'}
                                    sx={{ mr: 1 }}
                                  />
                                </Tooltip>
                                <Tooltip title={`Chặn campaign: ${reason}`} arrow>
                                  <Chip
                                    size="small"
                                    label={reason}
                                    color={getAccountBlockTone(reason)}
                                    variant={reason === 'Available' ? 'outlined' : 'filled'}
                                  />
                                </Tooltip>
                                <Tooltip title={getQuotaDebugText(account)} arrow>
                                  <Chip
                                    size="small"
                                    label={`Quota source: ${getQuotaSourceLabel(account)}`}
                                    color={getQuotaSourceLabel(account) === 'backend' ? 'success' : 'warning'}
                                    variant="outlined"
                                    sx={{ ml: 1 }}
                                  />
                                </Tooltip>
                              </>
                            );
                          })()}
                          {account.risk_reason && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, maxWidth: 240, display: 'block' }}>
                              {account.risk_reason}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, maxWidth: 240, display: 'block' }}>
                            {`Effective quota ${Number(account.daily_job_count || 0)} / ${Number(account.daily_job_limit || 30)}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{account.daily_job_count || 0} / {account.daily_job_limit || 0}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={() => loadAccountToForm(account)}>Edit</Button>
                          <Button size="small" startIcon={<ScienceIcon />} onClick={() => testAccount(account)}>Test</Button>
                          {isQuotaMismatch(account) && (
                            <Button size="small" color="info" onClick={() => normalizeQuota(account)}>Normalize quota</Button>
                          )}
                          {account.is_active ? (
                            <Button size="small" color="warning" startIcon={<PauseCircleIcon />} onClick={() => pauseAccount(account)}>Pause</Button>
                          ) : (
                            <Button size="small" color="success" startIcon={<PlayCircleIcon />} onClick={() => resumeAccount(account)}>Resume</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!isLoading && (accounts || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">Chưa có Telegram account nào.</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            <Card variant="outlined" sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                {selectedAccount ? `Edit: ${selectedAccount.name}` : 'Add Telegram account'}
              </Typography>
              {selectedAccount && (
                <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.25)' }}>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                    {selectedQuotaLoadedFromBackend
                      ? `Loaded from backend · quota source: backend (${selectedBackendQuota})`
                      : 'Loaded from backend · quota source: default 30'}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                    Effective quota: {selectedQuotaValue > 0 ? selectedQuotaValue : 30}
                  </Typography>
                  {isQuotaMismatch(selectedAccount) && (
                    <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
                      Quota đang lệch so với backend. Bấm Normalize quota để đưa daily_job_limit về giá trị hợp lệ.
                    </Alert>
                  )}
                </Box>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Tên hiển thị"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  error={trimmedName.length === 0}
                  helperText={trimmedName.length === 0 ? 'Tên hiển thị không được để trống.' : ' '}
                  fullWidth
                />
                <TextField label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} fullWidth />
                <TextField label="API ID" value={form.api_id} onChange={e => setForm({ ...form, api_id: e.target.value })} fullWidth />
                <TextField label="API HASH" value={form.api_hash} onChange={e => setForm({ ...form, api_hash: e.target.value })} fullWidth />
                <TextField label="Session String" value={form.session_ref} onChange={e => setForm({ ...form, session_ref: e.target.value })} fullWidth multiline minRows={3} />
                <TextField
                  label="Daily job limit"
                  type="number"
                  value={form.daily_job_limit}
                  onChange={e => setForm({ ...form, daily_job_limit: Number(e.target.value) })}
                  helperText={selectedAccount
                    ? (selectedQuotaLoadedFromBackend
                      ? `Optional override from backend; current value ${selectedBackendQuota ?? 30}`
                      : 'Backend chưa trả quota hợp lệ, sẽ fallback 30')
                    : 'Default new account value = 30'}
                  fullWidth
                />
                {selectedAccount && (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Tooltip title={getQuotaDebugText(selectedAccount)} arrow>
                      <Chip
                        size="small"
                        label={`Quota source: ${getQuotaSourceLabel(selectedAccount)}`}
                        color={getQuotaSourceLabel(selectedAccount) === 'backend' ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </Tooltip>
                    <Chip
                      size="small"
                      label={`Effective quota: ${Number(selectedAccount.daily_job_limit || 30)}`}
                      variant="outlined"
                    />
                  </Box>
                )}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={createOrUpdateAccount}
                    disabled={!canCreateAccount}
                  >
                    {selectedAccount ? 'Save changes' : 'Create account'}
                  </Button>
                  <Button variant="outlined" onClick={() => loadAccountToForm(null)}>Reset</Button>
                </Box>
              </Box>
            </Card>
          </Box>
        </CustomTabPanel>

        <CustomTabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 680 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
              Thiết lập vận hành an toàn. Các giá trị này sẽ được worker và scheduler đọc từ backend settings.
            </Typography>
            <Card variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <BugReportIcon fontSize="small" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Schema reconciliation
                </Typography>
                <Button sx={{ ml: 'auto' }} size="small" onClick={runSchemaReconcile} disabled={schemaLoading} startIcon={<SyncIcon />}>
                  {schemaLoading ? 'Checking...' : 'Check schema'}
                </Button>
                <Button size="small" onClick={exportSchemaReport} disabled={!schemaReport} variant="outlined">
                  Export report
                </Button>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Đọc schema thật từ backend và liệt kê cột thiếu so với code/migration.
              </Typography>
              {schemaReport && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Missing tables: {Object.keys(schemaReport.missing || {}).length}
                  </Typography>
                  {Object.entries(schemaReport.missing || {}).map(([table, columns]) => (
                    <Box key={table} sx={{ p: 1, borderRadius: 1, border: '1px solid rgba(148,163,184,0.25)' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{table}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Missing: {columns.join(', ')}
                      </Typography>
                    </Box>
                  ))}
                  {(schemaReport.suggested_migrations || []).length > 0 && (
                    <Box sx={{ mt: 1, p: 1.5, borderRadius: 1, bgcolor: 'rgba(15,23,42,0.55)' }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                        Suggested migrations
                      </Typography>
                      <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
                        {(schemaReport.suggested_migrations || []).map(item => item.sql).join('\n')}
                      </Box>
                    </Box>
                  )}
                  {Object.keys(schemaReport.missing || {}).length === 0 && (
                    <Typography variant="body2" color="success.main">
                      Không thiếu cột nào trong bộ schema đã khai báo.
                    </Typography>
                  )}
                </Box>
              )}
            </Card>
            <TextField label="Độ trễ giữa các bài viết (Delay)" type="number" defaultValue={30} helperText="Chờ giữa các lần gửi để giảm rủi ro flood." fullWidth />
            <TextField label="Giới hạn bài viết / ngày" type="number" defaultValue={100} helperText="Giới hạn công việc theo account." fullWidth />
            <TextField label="Quản trị viên nhận thông báo (Chat ID)" type="text" defaultValue="678912345" helperText="Nơi nhận cảnh báo risk." fullWidth />
            <Box sx={{ mt: 1 }}>
              <Button variant="contained" startIcon={<SaveIcon />}>Lưu cấu hình</Button>
            </Box>
          </Box>
        </CustomTabPanel>
      </Card>

      <Snackbar open={toast.show} autoHideDuration={3200} onClose={() => setToast({ ...toast, show: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.type} variant="filled" sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
