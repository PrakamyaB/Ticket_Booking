import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Calendar, MapPin, ArrowLeft, ShieldAlert, LogIn, Users, AlertTriangle, Armchair } from 'lucide-react';
import SeatMap from '../components/SeatMap';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venueId: string;
  venue: {
    name: string;
    rows: number;
    cols: number;
  };
  categoryPrices: {
    category: string;
    price: number;
  }[];
}

interface Seat {
  id: string;
  seatId: string;
  rowName: string;
  colNumber: number;
  category: string;
  status: string;
  isOwnHold: boolean;
  heldUntil?: string;
  heldByUserId?: string | null;
}

interface EventDetailsProps {
  eventId: string;
  token: string | null;
  onBack: () => void;
  onNavigateToCheckout: (eventId: string, seatIds: string[], heldUntil: string) => void;
  onNavigateToLogin: () => void;
}

export default function EventDetails({
  eventId,
  token,
  onBack,
  onNavigateToCheckout,
  onNavigateToLogin,
}: EventDetailsProps) {
  const [eventData, setEventData] = useState<EventDetail | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [waitlistStatus, setWaitlistStatus] = useState<any>(null);
  
  // Waitlist selection form
  const [waitlistCategory, setWaitlistCategory] = useState('');
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [waitlistMessage, setWaitlistMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [holdLoading, setHoldLoading] = useState(false);

  // Fetch initial details
  const fetchDetails = async () => {
    try {
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/events/${eventId}`, { headers });
      if (!res.ok) {
        throw new Error('Failed to load event details');
      }

      const data = await res.json();
      setEventData(data.event);
      setSeats(data.seats);
      setWaitlistStatus(data.waitlistStatus);
      
      // Auto-select first category for waitlist
      if (data.event.categoryPrices.length > 0) {
        setWaitlistCategory(data.event.categoryPrices[0].category);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();

    // Setup Socket.io client connection for real-time updates
    const socket: Socket = io('http://localhost:5000', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected to backend');
      socket.emit('join-event', eventId);
    });

    socket.on('seat-update', (updatedSeats: Seat[]) => {
      console.log('Live seat update received!');
      // Preserving user selected state overlay if they were holding or selecting
      setSeats((currentSeats) => {
        return updatedSeats.map((updated) => {
          const current = currentSeats.find((c) => c.id === updated.id);
          return {
            ...updated,
            // Flag client-side user ownership of hold if matching
            isOwnHold: updated.heldByUserId === (token ? JSON.parse(atob(token.split('.')[1])).id : null),
          };
        });
      });
    });

    return () => {
      socket.emit('leave-event', eventId);
      socket.disconnect();
    };
  }, [eventId, token]);

  const handleToggleSeat = (seatId: string) => {
    setSelectedSeatIds((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((id) => id !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
  };

  // Trigger Hold API request
  const handleHoldSeats = async () => {
    if (!token) {
      onNavigateToLogin();
      return;
    }

    setHoldLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bookings/hold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId, showSeatIds: selectedSeatIds }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Seat selection failed. They may have just been locked by another customer.');
      }

      // Success: navigate to checkout
      onNavigateToCheckout(eventId, selectedSeatIds, data.heldUntil);
    } catch (err: any) {
      setError(err.message);
      // Refresh details to sync map state
      fetchDetails();
      setSelectedSeatIds([]);
    } finally {
      setHoldLoading(false);
    }
  };

  // Join Waitlist API
  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      onNavigateToLogin();
      return;
    }

    setWaitlistLoading(true);
    setWaitlistMessage('');
    setError('');

    try {
      const res = await fetch('/api/bookings/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId, category: waitlistCategory }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setWaitlistStatus(data);
      setWaitlistMessage(`Successfully joined waitlist! You are at position: ${data.position}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setWaitlistLoading(false);
    }
  };

  // Calculate pricing summary
  const getSelectedSeatsSummary = () => {
    let total = 0;
    const list: string[] = [];

    selectedSeatIds.forEach((id) => {
      const s = seats.find((seat) => seat.id === id);
      if (s && eventData) {
        const cp = eventData.categoryPrices.find((p) => p.category === s.category);
        if (cp) {
          total += cp.price;
          list.push(`${s.rowName}-${s.colNumber}`);
        }
      }
    });

    return { total, list };
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-secondary)' }}>
        <p>Loading show details...</p>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
        <h3>Event Not Found</h3>
        <button onClick={onBack} className="btn-secondary" style={{ marginTop: '20px' }}>
          <ArrowLeft size={16} /> Back to Events
        </button>
      </div>
    );
  }

  const { total, list } = getSelectedSeatsSummary();

  // Check if standard or premium categories are fully sold out (to display waitlist card)
  const isCategorySoldOut = (cat: string) => {
    const totalInCat = seats.filter((s) => s.category === cat).length;
    const unavailableInCat = seats.filter(
      (s) => s.category === cat && (s.status === 'BOOKED' || s.status === 'HELD')
    ).length;
    return totalInCat > 0 && totalInCat === unavailableInCat;
  };

  const isPremiumSoldOut = isCategorySoldOut('PREMIUM');
  const isStandardSoldOut = isCategorySoldOut('STANDARD');
  const isEventSoldOut = seats.length > 0 && seats.every((s) => s.status === 'BOOKED' || s.status === 'HELD');

  return (
    <div className="animate-fade-in" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="btn-secondary"
        style={{ marginBottom: '28px', padding: '8px 16px', fontSize: '0.85rem' }}
      >
        <ArrowLeft size={16} /> Back to Showings
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px', alignItems: 'start' }}>
        {/* Left Column: Details & Seat Map */}
        <div>
          {/* Header Details */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{eventData.title}</h1>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} style={{ color: '#8b5cf6' }} />
                <span>{new Date(eventData.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {eventData.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={18} style={{ color: '#ec4899' }} />
                <span>{eventData.venue.name}</span>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '20px', lineHeight: 1.6 }}>
              {eventData.description}
            </p>
          </div>

          {/* Seat Grid */}
          <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', fontFamily: 'var(--font-family-heading)' }}>
            Select Your Seats
          </h2>
          
          <SeatMap
            seats={seats}
            categoryPrices={eventData.categoryPrices}
            selectedSeatIds={selectedSeatIds}
            onToggleSeat={handleToggleSeat}
          />
        </div>

        {/* Right Column: Checkout Hold Panel or Waitlist Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '12px',
                padding: '16px',
                color: '#ef4444',
                fontSize: '0.85rem',
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <AlertTriangle size={16} /> Error Processing Hold
              </div>
              {error}
            </div>
          )}

          {/* Seat Hold Checkout Panel */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Booking Summary
            </h3>

            {selectedSeatIds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <Armchair size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ fontSize: '0.9rem' }}>No seats selected yet.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Click available grid seats to place a temporary hold.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Selected Seats ({list.length}):</span>
                  <span style={{ fontWeight: 700, color: 'white' }}>{list.join(', ')}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    padding: '16px 0',
                    borderTop: '1px solid var(--border-color)',
                    borderBottom: '1px solid var(--border-color)',
                    marginBottom: '20px',
                  }}
                >
                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Price:</span>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ec4899' }}>
                    ${total.toFixed(2)}
                  </span>
                </div>

                {!token ? (
                  <button
                    onClick={onNavigateToLogin}
                    className="btn-primary"
                    style={{ width: '100%', gap: '8px' }}
                  >
                    <LogIn size={16} /> Sign in to Hold Seats
                  </button>
                ) : (
                  <button
                    onClick={handleHoldSeats}
                    disabled={holdLoading}
                    className="btn-primary"
                    style={{ width: '100%' }}
                  >
                    {holdLoading ? 'Holding Seats...' : 'Hold Seats (10 min TTL)'}
                  </button>
                )}
                
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px', lineHeight: 1.4 }}>
                  * Placing a hold reserves seats for 10 minutes. Abandoning checkout releases them back to other customers.
                </p>
              </div>
            )}
          </div>

          {/* Waitlist Box (Shown if category is sold out) */}
          {(isPremiumSoldOut || isStandardSoldOut) && (
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid #ec4899' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#ec4899' }}>
                Join Event Waitlist
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: 1.4 }}>
                Some seat categories are currently sold out. If bookings are cancelled or holds expire, tickets will be offered to waitlisted customers automatically.
              </p>

              {waitlistStatus ? (
                <div
                  style={{
                    backgroundColor: 'rgba(236, 72, 153, 0.1)',
                    border: '1px solid rgba(236, 72, 153, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#f472b6',
                    fontSize: '0.9rem',
                    lineHeight: 1.4,
                  }}
                >
                  <p style={{ fontWeight: 600 }}>Active Waitlist Entry:</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Category: <strong>{waitlistStatus.category}</strong>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Position: <strong>#{waitlistStatus.position}</strong>
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Status: <strong style={{ color: waitlistStatus.status === 'OFFERED' ? '#f59e0b' : '#f472b6' }}>
                      {waitlistStatus.status}
                    </strong>
                  </p>
                  {waitlistStatus.status === 'OFFERED' && (
                    <p style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '6px', fontWeight: 600 }}>
                      ⚠️ Check developer mailbox drawer for your check-out booking link!
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleJoinWaitlist}>
                  {waitlistMessage && (
                    <div style={{ color: '#10b981', fontSize: '0.85rem', marginBottom: '12px', fontWeight: 600 }}>
                      {waitlistMessage}
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Category</label>
                    <select
                      className="form-select"
                      value={waitlistCategory}
                      onChange={(e) => setWaitlistCategory(e.target.value)}
                      disabled={waitlistLoading}
                      style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      {eventData.categoryPrices.map((cp) => {
                        const soldOut = isCategorySoldOut(cp.category);
                        return (
                          <option key={cp.category} value={cp.category} disabled={!soldOut}>
                            {cp.category} (${cp.price}) {soldOut ? '(Sold Out)' : '(Seats Available)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={waitlistLoading || !isCategorySoldOut(waitlistCategory)}
                    className="btn-secondary"
                    style={{ width: '100%', padding: '10px 16px', fontSize: '0.9rem', borderColor: '#ec4899', color: '#f472b6' }}
                  >
                    {waitlistLoading ? 'Joining...' : 'Join Waitlist Queue'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
