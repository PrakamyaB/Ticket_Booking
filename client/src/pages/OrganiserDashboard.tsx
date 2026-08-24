import React, { useState, useEffect } from 'react';
import { Plus, Users, DollarSign, Calendar, RefreshCw, BarChart2 } from 'lucide-react';

interface Venue {
  id: string;
  name: string;
  rows: number;
  cols: number;
}

interface EventSummary {
  id: string;
  title: string;
  date: string;
  time: string;
  venueName: string;
  ticketsSold: number;
  revenue: number;
}

interface OrganiserDashboardProps {
  token: string | null;
}

export default function OrganiserDashboard({ token }: OrganiserDashboardProps) {
  const [summaries, setSummaries] = useState<EventSummary[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New event form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [standardPrice, setStandardPrice] = useState('50');
  const [premiumPrice, setPremiumPrice] = useState('120');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch created events summary
      const summaryRes = await fetch('/api/events/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!summaryRes.ok) throw new Error('Failed to load event summary metrics');
      const summaryData = await summaryRes.json();
      setSummaries(summaryData);

      // 2. Fetch venues list for listing creation dropdown
      const venueRes = await fetch('/api/venues', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (venueRes.ok) {
        const venueData = await venueRes.json();
        setVenues(venueData);
        if (venueData.length > 0) setVenueId(venueData[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !date || !time || !venueId) {
      setError('Please fill in all show fields');
      return;
    }

    setFormLoading(true);
    setError('');
    setFormSuccess(false);

    try {
      const categoryPrices = [
        { category: 'STANDARD', price: parseFloat(standardPrice) },
        { category: 'PREMIUM', price: parseFloat(premiumPrice) },
      ];

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          date,
          time,
          venueId,
          categoryPrices,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to list event');
      }

      setFormSuccess(true);
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      
      // Refresh summaries
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

  // Calculate high-level total metrics
  const totalRevenue = summaries.reduce((sum, e) => sum + e.revenue, 0);
  const totalTicketsSold = summaries.reduce((sum, e) => sum + e.ticketsSold, 0);

  return (
    <div className="animate-fade-in" style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem' }}>Organiser Console</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
            List shows, select seat configurations, and review billing summaries in real-time.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> {showCreateForm ? 'View Listings' : 'Create Event Listing'}
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
        /* Create Event Form */
        <div className="glass-panel" style={{ padding: '32px', maxWidth: '650px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', fontFamily: 'var(--font-family-heading)' }}>
            Schedule New Showing
          </h2>

          {formSuccess && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
              ✓ Event listing created successfully! Initializing seat layout...
            </div>
          )}

          <form onSubmit={handleCreateEvent}>
            <div className="form-group">
              <label className="form-label">Event / Movie Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Star Wars: Return of the Jedi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={formLoading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                placeholder="Brief summary of event..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
                disabled={formLoading}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Show Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={formLoading}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  disabled={formLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Select Venue Location</label>
              {venues.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: '#ef4444' }}>
                  No venues registered. Please ask an Admin user to create a venue structure first!
                </div>
              ) : (
                <select
                  className="form-select"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  required
                  disabled={formLoading}
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.rows * v.cols} Seats Grid)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <h3 style={{ fontSize: '1rem', margin: '24px 0 12px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              Seat Category Ticket Pricing
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Standard Seat Price ($)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="50"
                  value={standardPrice}
                  onChange={(e) => setStandardPrice(e.target.value)}
                  required
                  disabled={formLoading}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Premium Seat Price ($)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="120"
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(e.target.value)}
                  required
                  disabled={formLoading}
                  min="0"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={formLoading || venues.length === 0}
              style={{ width: '100%', height: '48px', marginTop: '16px' }}
            >
              {formLoading ? 'Creating Listing...' : 'Publish Event Showing'}
            </button>
          </form>
        </div>
      ) : (
        /* Summaries / Dashboard Metrics view */
        <div>
          {/* Key metrics cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(139, 92, 246, 0.15)' }}>
                <DollarSign size={24} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Revenue</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: '4px' }}>
                  ${totalRevenue.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(236, 72, 153, 0.15)' }}>
                <Users size={24} style={{ color: '#ec4899' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Tickets Confirmed</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: '4px' }}>
                  {totalTicketsSold}
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                <BarChart2 size={24} style={{ color: '#10b981' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Active Listings</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginTop: '4px' }}>
                  {summaries.length}
                </div>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', fontFamily: 'var(--font-family-heading)' }}>
            Listings Overview
          </h2>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading show details...</p>
          ) : summaries.length === 0 ? (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>You have not published any show listings yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
                style={{ marginTop: '16px', padding: '8px 16px', fontSize: '0.85rem' }}
              >
                List Your First Show
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  textAlign: 'left',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '16px' }}>Event Name</th>
                    <th style={{ padding: '16px' }}>Venue Location</th>
                    <th style={{ padding: '16px' }}>Showing Date</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Tickets Sold</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((sum) => (
                    <tr
                      key={sum.id}
                      style={{ borderBottom: '1px solid var(--border-color)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '16px', fontWeight: 600, color: '#f8fafc' }}>{sum.title}</td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>{sum.venueName}</td>
                      <td style={{ padding: '16px', color: 'var(--text-secondary)' }}>
                        {new Date(sum.date).toLocaleDateString()} at {sum.time}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#8b5cf6', fontWeight: 700 }}>
                        {sum.ticketsSold}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', color: '#10b981', fontWeight: 800 }}>
                        ${sum.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
