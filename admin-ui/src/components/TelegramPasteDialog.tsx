'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { detectTelegramIntent, parseTelegramLink, suggestTelegramTitle, type TelegramLinkParse } from '../lib/telegram-link';

type PasteMode = 'campaign' | 'topic' | 'project';

type Props = {
  open: boolean;
  mode: PasteMode;
  onClose: () => void;
  onApply: (payload: {
    parsed: TelegramLinkParse;
    title?: string;
    targetLink?: string;
    sourceStartLink?: string;
    sourceEndLink?: string;
    targetLinkSeed?: string;
    projectName?: string;
  }) => void;
};

export default function TelegramPasteDialog({ open, mode, onClose, onApply }: Props) {
  const [draft, setDraft] = React.useState('');
  const parsed = React.useMemo(() => parseTelegramLink(draft), [draft]);
  const intent = React.useMemo(() => detectTelegramIntent(parsed), [parsed]);

  React.useEffect(() => {
    if (open) setDraft('');
  }, [open]);

  const resolvePayload = () => {
    if (!parsed.ok) return null;
    const title = suggestTelegramTitle(parsed, mode === 'project' ? 'Project' : mode === 'topic' ? 'Topic' : 'Campaign');
    if (mode === 'topic') {
      return {
        parsed,
        title,
        targetLinkSeed: parsed.normalized,
      };
    }
    if (mode === 'project') {
      return {
        parsed,
        projectName: title,
        sourceStartLink: intent === 'source' ? parsed.normalized : undefined,
        targetLink: intent === 'target' ? parsed.normalized : undefined,
      };
    }
    return {
      parsed,
      title,
      targetLink: intent === 'target' ? parsed.normalized : undefined,
      sourceStartLink: intent === 'source' ? parsed.normalized : undefined,
      sourceEndLink: intent === 'source' ? parsed.normalized : undefined,
    };
  };

  const payload = resolvePayload();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Paste & detect</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Dán link Telegram một lần, parser sẽ nhận diện loại link và tự đổ sang field phù hợp.
          </Typography>
          <TextField
            autoFocus
            label="Telegram link"
            fullWidth
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://t.me/channel/123 hoặc @channel"
            helperText={parsed.detail}
            error={Boolean(draft.trim() && !parsed.ok)}
          />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={parsed.kind} size="small" variant="outlined" />
            {parsed.chatSlug && <Chip label={`chat: ${parsed.chatSlug}`} size="small" variant="outlined" />}
            {parsed.messageId && <Chip label={`message: ${parsed.messageId}`} size="small" variant="outlined" />}
            {parsed.topicId && <Chip label={`topic: ${parsed.topicId}`} size="small" variant="outlined" />}
          </Box>
          {parsed.issues.length > 0 && (
            <Alert severity="warning" variant="outlined">
              {parsed.issues.join(' ')}
            </Alert>
          )}
          <Alert severity={intent === 'unknown' ? 'warning' : 'info'} variant="outlined">
            {mode === 'topic' && 'Dán link topic/thread seed để tự đổ target_link_seed và gợi ý tên topic.'}
            {mode === 'project' && 'Dán link nguồn hoặc đích, UI sẽ gợi ý field phù hợp.'}
            {mode === 'campaign' && 'Dán link target/source, UI sẽ đổ sang đúng field campaign.'}
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Huỷ</Button>
        <Button
          variant="contained"
          disabled={!payload}
          onClick={() => {
            if (!payload) return;
            onApply(payload);
            onClose();
          }}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
