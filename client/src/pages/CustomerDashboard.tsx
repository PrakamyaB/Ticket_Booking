import React, { useState, useEffect } from 'react';
import { Ticket, Calendar, AlertTriangle, RefreshCw, XCircle, ArrowUpRight } from 'lucide-react';

interface Booking {
  id: string;
  bookingReference: string;
  status: string; // "CONFIRMED" | "CANCELLED"
  totalAmount: number;
  createdAt: string;
  event: {
    title: string;
    date: string;
    time: string;
    venue: { name: string };
  };
  showSeats: {
    seat: { rowName: string; colNumber: number };
  }[];
}

interface Waitlist {
  id: string;
  category: string;
  position: number;
  status: string; // "WAITING" | "OFFERED" | "COMPLETED" | "EXPIRED"
  createdAt: string;
  eventId: string;
  offeredShowSeatId: string | null;
  offeredShowSeat: {
    id: string;
    seat: { rowName: string; colNumber: number };
  } | null;
  offerExpiresAt: string | null;
  event: {
    title: string;
    date: string;
    time: string;
    venue: { name: string };
  };
}

interface CustomerDashboardProps {
  token: string | null;
  onNavigateToWaitlistCheckout: (eventId: string, waitlistId: string, seatIds: string[], offerExpiresAt: string) => void;
  onSelectEvent: (eventId: string) => void;
}

export default function CustomerDashboard({
  token,
  onNavigateToWaitlistCheckout,
  onSelectEvent,
}: CustomerDashboardProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bookings/history', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load transaction history');
      }

      const data = await res.json();
      setBookings(data.bookings);
      setWaitlists(data.waitlists);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchDashboardData();
  }, [token]);

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? You will be fully refunded.')) return;
    
    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      // Refresh data
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem' }}>My Reservations</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
            Track your ticket history, booking references, and active waitlist queues.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard records...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Active Waitlists Section */}
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: '#ec4899', fontFamily: 'var(--font-family-heading)' }}>
              Active Waitlists
            </h2>

            {waitlists.length === 0 ? (
              <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                You are not currently in any waitlists.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {waitlists.map((wl) => {
                  const isOffered = wl.status === 'OFFERED';
                  const offerExpired = wl.status === 'EXPIRED';

                  return (
                    <div
                      key={wl.id}
                      className="glass-panel"
                      style={{
                        padding: '20px',
                        borderLeft: isOffered ? '3px solid #f59e0b' : '3px solid var(--border-color)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '4px' }}>
                          {wl.event.title}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          {new Date(wl.event.date).toLocaleDateString()} at {wl.event.time} • {wl.event.venue.name}
                        </p>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                          <span className="badge badge-standard" style={{ fontSize: '0.7rem' }}>
                            {wl.category}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Queue Position: <strong>#{wl.position}</strong>
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                          <span
                            className="badge"
                            style={{
                              backgroundColor:
                                wl.status === 'OFFERED'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : wl.status === 'COMPLETED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'rgba(148, 163, 184, 0.15)',
                              color:
                                wl.status === 'OFFERED'
                                  ? '#f59e0b'
                                  : wl.status === 'COMPLETED'
                                  ? '#10b981'
                                  : 'var(--text-secondary)',
                              border: 'none',
                            }}
                          >
                            {wl.status}
                          </span>
                        </div>

                        {isOffered && wl.offeredShowSeat && wl.offerExpiresAt && (
                          <button
                            onClick={() =>
                              onNavigateToWaitlistCheckout(
                                wl.eventId,
                                wl.id,
                                [wl.offeredShowSeatId!],
                                wl.offerExpiresAt!
                              )
                            }
                            className="btn-primary"
                            style={{
                              padding: '8px 16px',
                              fontSize: '0.8rem',
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                              gap: '4px',
                            }}
                          >
                            Claim Seat {wl.offeredShowSeat.seat.rowName}-{wl.offeredShowSeat.seat.colNumber} <ArrowUpRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bookings History Section */}
          <div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: '#8b5cf6', fontFamily: 'var(--font-family-heading)' }}>
              Booking History
            </h2>

            {bookings.length === 0 ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Ticket size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>You have no ticket bookings yet.</p>
                <button onClick={() => onSelectEvent('') /* navigate back to list */} className="btn-primary" style={{ marginTop: '16px', padding: '8px 16px', fontSize: '0.85rem' }}>
                  Browse Live Events
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {bookings.map((booking) => {
                  const isCancelled = booking.status === 'CANCELLED';

                  return (
                    <div
                      key={booking.id}
                      className="glass-panel"
                      style={{
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        opacity: isCancelled ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '4px' }}>
                            {booking.event.title}
                          </h3>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                            <span>📅 {new Date(booking.event.date).toLocaleDateString()} at {booking.event.time}</span>
                            <span>📍 {booking.event.venue.name}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              color: isCancelled ? '#ef4444' : '#10b981',
                              border: 'none',
                            }}
                          >
                            {booking.status}
                          </span>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginTop: '6px' }}>
                            ${booking.totalAmount.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <strong>Seats booked:</strong>{' '}
                          {booking.showSeats.map((ss) => `${ss.seat.rowName}-${ss.seat.colNumber}`).join(', ')}
                          <br />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Ref: {booking.bookingReference} • Booked on {new Date(booking.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            disabled={cancellingId === booking.id}
                            className="btn-danger"
                            style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '4px' }}
                          >
                            <XCircle size={14} /> {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
