import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Search, Ticket, Users } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venueId: string;
  imageUrl: string | null;
  venue: {
    name: string;
  };
  availableSeats: number;
  isSoldOut: boolean;
}

interface EventsListProps {
  onSelectEvent: (eventId: string) => void;
  token: string | null;
}

export default function EventsList({ onSelectEvent, token }: EventsListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (date) queryParams.append('date', date);

      const res = await fetch(`/api/events?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [search, date]);

  return (
    <div className="animate-fade-in" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }} className="gradient-text">
          Experience Live Shows
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Reserve your favorite seats in real-time, join active waitlists, and instantly receive ticket bookings on your device.
        </p>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '20px',
          marginBottom: '40px',
          alignItems: 'center',
        }}
      >
        {/* Search Input */}
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search movie or concert..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '44px' }}
          />
        </div>

        {/* Date Picker */}
        <div style={{ flex: '0 1 200px', position: 'relative' }}>
          <Calendar
            size={18}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ paddingLeft: '44px' }}
          />
        </div>

        {/* Reset Button */}
        {(search || date) && (
          <button
            onClick={() => {
              setSearch('');
              setDate('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#8b5cf6',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              textDecoration: 'underline',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid #8b5cf6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: '16px' }}>Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div
          className="glass-panel"
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'var(--text-secondary)',
          }}
        >
          <Ticket size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.25rem', color: '#f8fafc', marginBottom: '8px' }}>No events found</h3>
          <p>Try searching for a different keyword or resetting filters.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '28px',
          }}
        >
          {events.map((event) => (
            <div
              key={event.id}
              className="glass-panel glass-panel-hover ticket animate-fade-in"
              style={{ padding: '24px' }}
            >
              {/* Sold Out Overlay Tag */}
              {event.isSoldOut && (
                <span
                  className="badge badge-premium"
                  style={{
                    alignSelf: 'flex-start',
                    marginBottom: '16px',
                    borderColor: '#ef4444',
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.1)',
                  }}
                >
                  Sold Out (Waitlist Open)
                </span>
              )}

              <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', color: '#f8fafc' }}>
                {event.title}
              </h3>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineBreak: 'auto', flexGrow: 1 }}>
                {event.description.length > 120
                  ? `${event.description.substring(0, 120)}...`
                  : event.description}
              </p>

              {/* Event Metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} style={{ color: '#8b5cf6' }} />
                  <span>{new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {event.time}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#ec4899' }} />
                  <span>{event.venue.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: '#10b981' }} />
                  <span style={{ color: event.isSoldOut ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                    {event.isSoldOut ? '0 Seats Left' : `${event.availableSeats} Seats Available`}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectEvent(event.id)}
                className="btn-primary"
                style={{ width: '100%', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {event.isSoldOut ? 'Join Waitlist' : 'Select Seats'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
