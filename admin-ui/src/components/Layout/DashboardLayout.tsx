'use client';

import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Button from '@mui/material/Button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  Layers3,
  Send,
  Settings,
  Activity,
  Menu as MenuIcon
} from 'lucide-react';

const drawerWidth = 280;

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: '#ffffff',
  color: theme.palette.text.primary,
  boxShadow: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  ...(open && {
    width: `calc(100% - ${drawerWidth}px)`,
    marginLeft: `${drawerWidth}px`,
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 3),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-start',
}));

const NAVIGATION = [
  { text: 'Tổng quan', href: '/', icon: <LayoutDashboard size={20} />, badge: '369' },
  { text: 'Dự án & Kênh', href: '/projects', icon: <FolderOpen size={20} /> },
  { text: 'Topics', href: '/topics', icon: <Layers3 size={20} /> },
  { text: 'Chiến dịch', href: '/campaigns', icon: <Send size={20} />, badge: '12' },
  { type: 'divider', text: 'CẤU HÌNH' },
  { text: 'Hệ thống & TK', href: '/settings', icon: <Settings size={20} /> },
  { text: 'Nhật ký', href: '/logs', icon: <Activity size={20} /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', lineHeight: 1 }}>
              Workspace
            </Typography>
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
              {NAVIGATION.find(n => n.href === pathname)?.text || 'Content Hub OS'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ borderRadius: 4, textTransform: 'none', px: 2, color: 'text.secondary', borderColor: 'divider', '&:hover': { bgcolor: '#f1f5f9' } }}
            >
              Tra cứu...
            </Button>
            <Button 
              variant="contained" 
              size="small" 
              disableElevation
              sx={{ borderRadius: 4, textTransform: 'none', px: 2, fontWeight: 'bold' }}
            >
              + Tạo chiến dịch
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 0.5, borderRadius: 4, border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
               <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22c55e' }} />
               <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.8rem', color: 'text.secondary' }}>Bot đang bật</Typography>
            </Box>
            <Button variant="outlined" size="small" sx={{ borderRadius: 4, textTransform: 'none' }}>Tải lại</Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#1e2336', // Dark Navy
            color: '#cbd5e1',
            borderRight: 'none',
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader sx={{ pt: 2, pb: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography variant="caption" sx={{ color: '#0088ff', fontWeight: 'bold', letterSpacing: 2 }}>
            CONTENT HUB OS
          </Typography>
          <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 900, mt: 0.5 }}>
            Content Hub
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            production
          </Typography>
        </DrawerHeader>
        <Box sx={{ px: 2, py: 1 }}>
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {NAVIGATION.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <Box key={index} sx={{ mt: 3, mb: 1, px: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#64748b', letterSpacing: 1 }}>
                      {item.text}
                    </Typography>
                  </Box>
                );
              }
              const isActive = pathname === item.href;
              return (
                <ListItem key={index} disablePadding>
                  <Link href={item.href || '#'} passHref style={{ width: '100%', textDecoration: 'none' }}>
                    <ListItemButton
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        backgroundColor: isActive ? '#0088ff' : 'transparent',
                        color: isActive ? '#ffffff' : '#94a3b8',
                        '&:hover': {
                          backgroundColor: isActive ? '#0077e6' : 'rgba(255,255,255,0.05)',
                          color: '#ffffff'
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: isActive ? 600 : 500 }}>
                            {item.text}
                          </Typography>
                        } 
                      />
                      {item.badge && (
                        <Box 
                          sx={{ 
                            px: 1, 
                            py: 0.25, 
                            borderRadius: 2, 
                            bgcolor: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold',
                            minWidth: 24,
                            textAlign: 'center'
                          }}
                        >
                          {item.badge}
                        </Box>
                      )}
                    </ListItemButton>
                  </Link>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={(theme) => ({
          flexGrow: 1,
          p: 3,
          backgroundColor: '#f8fafc',
          minHeight: '100vh',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && {
            marginLeft: `0px`,
            width: `calc(100% - ${drawerWidth}px)`,
          }),
        })}
      >
        <DrawerHeader />
        {children}
      </Box>
    </Box>
  );
}
