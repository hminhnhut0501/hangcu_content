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

type TopicDraft = {
  name: string;
  target_link_seed: string;
};

type CampaignDraft = {
  title: string;
  source_start_link: string;
  caption: string;
};

export default function ProjectsPage() {
  const { data: projects, mutate: mutateProjects } = useSWR<ProjectRow[]>('/api/groups?limit=100', fetcher);
  const { data: topics, mutate: mutateTopics } = useSWR<TopicRow[]>('/api/topics?limit=200', fetcher);
  const { data: campaigns, mutate: mutateCampaigns } = useSWR<CampaignRow[]>('/api/campaigns?limit=100', fetcher);

  const [toast, setToast] = React.useState<{ show: boolean; msg: string; type: 'success' | 'error' }>({ show: false, msg: '', type: 'success' });
  const [workspaceOpen, setWorkspaceOpen] = React.useState(false);
  const [workspaceMode, setWorkspaceMode] = React.useState<'create' | 'edit'>('create');
  const [workspaceProject, setWorkspaceProject] = React.useState<ProjectRow>({ name: '', description: '' });
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = React.useState<string>('');
  const [topicDraft, setTopicDraft] = React.useState<TopicDraft>({ name: '', target_link_seed: '' });
  const [campaignDraft, setCampaignDraft] = React.useState<CampaignDraft>({ title: '', source_start_link: '', caption: '' });
  const [topicEdit, setTopicEdit] = React.useState<TopicRow | null>(null);
  const [campaignEdit, setCampaignEdit] = React.useState<CampaignRow | null>(null);
  const [pasteTarget, setPasteTarget] = React.useState<'topic' | 'campaign' | null>(null);
  const [pasteDialogOpen, setPasteDialogOpen] = React.useState(false);

  const displayProjects: ProjectRow[] = projects || [];
  const displayTopics: TopicRow[] = topics || [];
  const displayCampaigns: CampaignRow[] = campaigns || [];

  const selectedProject = React.useMemo(
    () => displayProjects.find((project) => project.id === selectedProjectId) || null,
    [displayProjects, selectedProjectId],
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

  React.useEffect(() => {
    if (!workspaceOpen) return;
    if (workspaceMode === 'create') return;
    if (!selectedProjectId) return;
    if (!selectedTopicId && projectTopics[0]?.id) {
      setSelectedTopicId(projectTopics[0].id);
    }
  }, [projectTopics, selectedProjectId, selectedTopicId, workspaceMode, workspaceOpen]);

  const notify = (msg: string, type: 'success' | 'error') => setToast({ show: true, msg, type });

  const openCreateProject = () => {
    setWorkspaceMode('create');
    setWorkspaceProject({ name: '', description: '' });
    setSelectedProjectId('');
    setSelectedTopicId('');
    setWorkspaceOpen(true);
  };

  const openProjectWorkspace = (project: ProjectRow) => {
    setWorkspaceMode('edit');
    setWorkspaceProject(project);
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
          body: JSON.stringify({ name: workspaceProject.name.trim() }),
        });
        notify('Đã tạo dự án mới.', 'success');
      } else if (workspaceProject.id) {
        await fetchApi(`/api/groups/${workspaceProject.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: workspaceProject.name.trim(),
            description: workspaceProject.description || null,
          }),
        });
        notify('Đã cập nhật dự án.', 'success');
      }
      await mutateProjects();
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Dự án</Typography>
          <Typography variant="body2" color="text.secondary">
            Một màn quản lý duy nhất cho project, topic đích và campaign con.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateProject}>
          Tạo dự án
        </Button>
      </Box>

      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
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
                  <TableCell>{project.status || 'active'}</TableCell>
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
                    <Typography color="text.secondary">Chưa có project nào.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={workspaceOpen} onClose={closeWorkspace} fullWidth maxWidth="lg">
        <DialogTitle sx={{ pb: 1 }}>
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
                        <TableCell>Trạng thái</TableCell>
                        <TableCell align="right">Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedTopic ? topicCampaigns.map((campaign) => (
                        <TableRow key={campaign.id} hover>
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
                            <Chip size="small" label={campaign.status || 'draft'} />
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
