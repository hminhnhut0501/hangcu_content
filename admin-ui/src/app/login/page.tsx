'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { fetchApi } from '../../lib/api';
import { useAuth } from '../../components/AuthProvider';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { mutate } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetchApi('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok || res.user) {
        mutate(); // refetch user profile
        router.push('/');
      } else {
        setError(res.detail || 'Đăng nhập thất bại.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "#f8fafc"
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ mb: 4, textAlign: "center" }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.2em' }}>
              CONTENT HUB OS
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
              Đăng nhập hệ thống
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleLogin}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <TextField 
                label="Email" 
                variant="outlined" 
                fullWidth 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <TextField 
                label="Mật khẩu" 
                variant="outlined" 
                fullWidth 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button 
                type="submit" 
                variant="contained" 
                size="large" 
                fullWidth 
                disabled={loading}
                sx={{ 
                  mt: 1, 
                  py: 1.5,
                  bgcolor: '#0088ff', 
                  '&:hover': { bgcolor: '#0070d6' } 
                }}
              >
                {loading ? 'Đang xử lý...' : 'Đăng nhập'}
              </Button>
              <Button 
                variant="outlined" 
                size="large" 
                fullWidth 
                onClick={() => {
                  // Fake login for UI/UX testing
                  localStorage.setItem('dev_bypass', 'true');
                  mutate();
                  router.push('/');
                }}
                sx={{ 
                  py: 1.5,
                }}
              >
                Bỏ qua Đăng nhập (Chế độ Dev)
              </Button>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
