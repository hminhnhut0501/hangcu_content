'use client';

import React, { useState } from 'react';
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import SaveIcon from '@mui/icons-material/Save';
import SyncIcon from '@mui/icons-material/Sync';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
        Hệ thống & TK
      </Typography>

      <Card sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="Tài khoản Telegram" sx={{ fontWeight: 'medium' }} />
            <Tab label="Cấu hình hệ thống" sx={{ fontWeight: 'medium' }} />
          </Tabs>
        </Box>

        <CustomTabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
              Điền thông tin API và Session String để Bot có quyền điều khiển tài khoản của bạn.
            </Typography>

            <TextField 
              label="Tên hiển thị (Name)" 
              defaultValue="Admin Telegram"
              fullWidth
            />
            <TextField 
              label="Số điện thoại (Phone)" 
              defaultValue="+84 987 654 321"
              fullWidth
            />
            <TextField 
              label="API ID" 
              defaultValue=""
              helperText="Lấy từ my.telegram.org"
              fullWidth
            />
            <TextField 
              label="API HASH" 
              defaultValue=""
              fullWidth
            />
            <TextField 
              label="Session String (session_ref)" 
              defaultValue=""
              helperText="Chuỗi Session (Pyrogram/Telethon) để không cần đăng nhập lại."
              fullWidth
              multiline
              rows={3}
            />

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Button variant="contained" startIcon={<SaveIcon />}>Lưu thông tin</Button>
              <Button variant="outlined" startIcon={<SyncIcon />}>Kiểm tra kết nối (Test)</Button>
            </Box>
          </Box>
        </CustomTabPanel>

        <CustomTabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
            <TextField 
              label="Độ trễ giữa các bài viết (Delay)" 
              type="number" 
              defaultValue={30}
              helperText="Thời gian chờ tính bằng giây để tránh bị Telegram khoá spam."
              fullWidth
            />
            <TextField 
              label="Giới hạn bài viết / ngày" 
              type="number" 
              defaultValue={100}
              helperText="Số lượng bài viết tối đa hệ thống đẩy lên các nhóm trong 1 ngày."
              fullWidth
            />
            <TextField 
              label="Quản trị viên nhận thông báo (Chat ID)" 
              type="text" 
              defaultValue="678912345"
              helperText="Chat ID của bạn để Bot gửi thông báo nếu có lỗi."
              fullWidth
            />
            <Box sx={{ mt: 1 }}>
              <Button variant="contained" startIcon={<SaveIcon />}>Lưu cấu hình</Button>
            </Box>
          </Box>
        </CustomTabPanel>
      </Card>
    </Box>
  );
}
