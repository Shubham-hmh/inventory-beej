'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sprout, Lock, User, UserPlus, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form inputs
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/auth/setup');
        const data = await res.json();
        if (data.success) {
          setHasAdmin(data.hasAdmin);
        } else {
          setError(data.error || 'Failed to check database setup status.');
        }
      } catch (err) {
        setError('Network error connecting to database.');
      } finally {
        setLoading(false);
      }
    }
    checkSetup();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || (hasAdmin === false && !name)) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const endpoint = hasAdmin ? '/api/auth/login' : '/api/auth/setup';
      const payload = hasAdmin 
        ? { username, password } 
        : { name, username, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(hasAdmin ? 'Login successful!' : 'Primary Admin created successfully!');
        
        // Wait briefly for cookie write and UI transition
        setTimeout(() => {
          if (data.data.role === 'admin') {
            router.push('/');
          } else {
            router.push('/sales/new');
          }
          // Force layout refresh to load correct sidebar/header views
          router.refresh();
        }, 800);
      } else {
        setError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a0e17' }}>
        <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      width: '100%',
      backgroundColor: '#0a0e17',
      background: 'radial-gradient(circle at center, #111827 0%, #0a0e17 100%)',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--primary-glow)', color: 'var(--primary)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
            <Sprout size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {hasAdmin ? 'Kisan Beej Bhandar' : 'Create Primary Admin'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {hasAdmin 
              ? 'Sign in to access stock and sales dashboards' 
              : 'Setup the first administrator account to begin configuration.'
            }
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ padding: '0.75rem', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ padding: '0.75rem', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleAuthSubmit}>
          {hasAdmin === false && (
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <div style={{ position: 'relative' }}>
                <UserPlus size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="e.g. Ram Charan" 
                  className="form-control"
                  style={{ paddingLeft: '2.5rem' }}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username *</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Enter username" 
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.75rem' }}>
            <label className="form-label">Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                placeholder="Enter password" 
                className="form-control"
                style={{ paddingLeft: '2.5rem' }}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.85rem' }}
            disabled={submitting}
          >
            {submitting 
              ? (hasAdmin ? 'Signing in...' : 'Seeding Admin...') 
              : (hasAdmin ? 'Sign In' : 'Register Admin')
            }
          </button>
        </form>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
