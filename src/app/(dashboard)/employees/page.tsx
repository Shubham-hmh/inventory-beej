'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Shield, 
  UserCheck, 
  AlertTriangle,
  Lock
} from 'lucide-react';

interface UserItem {
  _id: string;
  name: string;
  username: string;
  role: 'admin' | 'employee';
  createdAt: string;
}

export default function EmployeesPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'employee'>('employee');

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsersAndMe = async () => {
    try {
      setLoading(true);
      // Fetch active user context
      const resMe = await fetch('/api/auth/me');
      const dataMe = await resMe.json();
      if (dataMe.success) {
        setCurrentUser(dataMe.data);
        if (dataMe.data.role === 'employee') {
          window.location.href = '/sales/new';
          return;
        }
      }

      // Fetch employee registry
      const resUsers = await fetch('/api/employees');
      const dataUsers = await resUsers.json();
      if (dataUsers.success) {
        setUsers(dataUsers.data || []);
      } else {
        setError(dataUsers.error || 'Failed to retrieve employee list.');
      }
    } catch (err) {
      setError('Network error pulling database profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndMe();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password || !role) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, role }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`User "${name}" successfully registered!`);
        // Reset form
        setName('');
        setUsername('');
        setPassword('');
        setRole('employee');
        
        loadUsersAndMe();
      } else {
        setError(data.error || 'Failed to add user account.');
      }
    } catch (err) {
      setError('Network error registering user account.');
    } finally {
      setSubmitting(false);
      setTimeout(() => {
        setError('');
        setSuccess('');
      }, 4000);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (currentUser && user._id === currentUser.id) {
      setError('Cannot delete your own active admin account.');
      return;
    }

    if (!confirm(`Are you sure you want to delete account "${user.name}" (${user.username})? This will revoke all app access.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      const res = await fetch(`/api/employees/${user._id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Account deleted successfully.');
        loadUsersAndMe();
      } else {
        setError(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      setError('Network error deleting account.');
    }
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 4000);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title-group">
          <h1>Employee & User Credentials</h1>
          <p>Register new staff members and configure access permissions</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="grid-equal-panels">
        {/* Left Side: Create User Account */}
        <div className="card">
          <div className="flex-gap-3" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <UserPlus size={22} className="text-primary" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Create New User</h3>
          </div>

          <form onSubmit={handleAddEmployee}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                type="text"
                placeholder="e.g. Shyam Lal"
                className="form-control"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Login Username *</label>
              <input
                type="text"
                placeholder="e.g. shyam123"
                className="form-control"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Password *</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  className="form-control"
                  style={{ paddingLeft: '2rem' }}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Access Permissions Role *</label>
              <select
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
              >
                <option value="employee">Employee (POS Invoicing only)</option>
                <option value="admin">Admin (Full Control Dashboard)</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={submitting}
            >
              {submitting ? 'Creating Account...' : 'Register User Account'}
            </button>
          </form>
        </div>

        {/* Right Side: Users Registry list */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="flex-gap-3" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <Users size={22} className="text-primary" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Active User Directory</h3>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <div style={{ border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : users.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem 0', fontSize: '0.9rem' }}>
              No users found.
            </p>
          ) : (
            <div className="table-container" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>User Profile</th>
                    <th>Username</th>
                    <th>Permissions</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user._id} style={{ opacity: currentUser && user._id === currentUser.id ? 0.8 : 1 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {user.username}
                      </td>
                      <td>
                        <span className={`badge ${user.role === 'admin' ? 'badge-danger' : 'badge-success'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          {user.role === 'admin' ? <Shield size={12} /> : <UserCheck size={12} />}
                          <span>{user.role === 'admin' ? 'Admin' : 'Employee'}</span>
                        </span>
                      </td>
                      <td className="text-right">
                        {currentUser && user._id !== currentUser.id ? (
                          <button
                            className="btn btn-danger btn-icon"
                            onClick={() => handleDeleteUser(user)}
                            title="Delete User Account"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Current Session
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
