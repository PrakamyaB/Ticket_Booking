import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Layers, ShieldCheck } from 'lucide-react';

interface Venue {
  id: string;
  name: string;
  rows: number;
  cols: number;
  _count?: {
    seats: number;
  };
}

interface AdminDashboardProps {
  token: string | null;
}

export default function AdminDashboard({ token }: AdminDashboardProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [rows, setRows] = useState('8');
  const [cols, setCols] = useState('10');
  const [premiumRowsCount, setPremiumRowsCount] = useState('2');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/venues', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load venue list');
      const data = await res.json();
      setVenues(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !rows || !cols) {
      setError('Please fill in all venue details');
      return;
    }

    setFormLoading(true);
    setError('');
    setFormSuccess(false);

    try {
      const res = await fetch('/api/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          rows: parseInt(rows),
          cols: parseInt(cols),
          premiumRowsCount: parseInt(premiumRowsCount || '0'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register venue');
      }

      setFormSuccess(true);
      setName('');
      
      await fetchDashboardData();
      setTimeout(() => {
        setShowCreateForm(false);
        setFormSuccess(false);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem' }}>Admin Control Center</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
            Register venue halls and initialize structural seat configurations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> {showCreateForm ? 'View Venues' : 'Register New Venue'}
          </button>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {showCreateForm ? (
        /* Create Venue Form */
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '550px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', fontFamily: 'var(--font-family-heading)' }}>
            Register Venue hall & Seating Layout
          </h2>

          {formSuccess && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
              ✓ Venuehall registered! Seats auto-populated on category levels.
            </div>
          )}

          <form onSubmit={handleCreateVenue}>
            <div className="form-group">
              <label className="form-label">Venue Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Auditorium Hall 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={formLoading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Number of Rows</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="8"
                  value={rows}
                  onChange={(e) => setRows(e.target.value)}
                  required
                  disabled={formLoading}
                  min="1"
                  max="26"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Seats per Row (Columns)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="10"
                  value={cols}
                  onChange={(e) => setCols(e.target.value)}
                  required
                  disabled={formLoading}
                  min="1"
                  max="30"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Premium Rows count</label>
              <input
                type="number"
                className="form-input"
                placeholder="2"
                value={premiumRowsCount}
                onChange={(e) => setPremiumRowsCount(e.target.value)}
                required
                disabled={formLoading}
                min="0"
                max={rows}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                * First X rows will automatically be assigned 'PREMIUM' category status (useful for premium pricing).
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={formLoading}
              style={{ width: '100%', height: '48px', marginTop: '16px' }}
            >
              {formLoading ? 'Registering Venuehall...' : 'Register Venuehall & Layout'}
            </button>
          </form>
        </div>
      ) : (
        /* Venue List */
        <div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', fontFamily: 'var(--font-family-heading)' }}>
            Registered Venues
          </h2>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading venues...</p>
          ) : venues.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No venues have been registered yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
                style={{ marginTop: '16px', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Register First Venuehall
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
              {venues.map((venue) => (
                <div key={venue.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'white' }}>{venue.name}</h3>
                    <Layers size={18} style={{ color: '#8b5cf6' }} />
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div>Rows: <strong>{venue.rows}</strong></div>
                    <div>Columns (Seats per row): <strong>{venue.cols}</strong></div>
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Total Layout Seats:</span>
                      <strong style={{ color: '#10b981', fontSize: '1rem' }}>
                        {venue._count?.seats || venue.rows * venue.cols}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
