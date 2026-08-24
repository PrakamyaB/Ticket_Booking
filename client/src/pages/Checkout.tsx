import React, { useState, useEffect } from 'react';
import { Armchair, CreditCard, ShieldCheck, Ticket, Calendar, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';

interface CheckoutProps {
  eventId: string;
  seatIds: string[];
  heldUntil: string;
  waitlistId?: string; // Optional waitlist ID for waitlist completions
  token: string | null;
  onBack: () => void;
  onBookingSuccess: () => void;
}

export default function Checkout({
  eventId,
  seatIds,
  heldUntil,
  waitlistId,
  token,
  onBack,
  onBookingSuccess,
}: CheckoutProps) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form details
  const [nameOnCard, setNameOnCard] = useState('');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');

  // Booking result
  const [bookingConfirmed, setBookingConfirmed] = useState<any>(null);

  // Countdown timer effect
  useEffect(() => {
    if (bookingConfirmed) return;

    const expiryTime = new Date(heldUntil).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance <= 0) {
        setTimeLeft('00:00');
        setIsExpired(true);
        clearInterval(timer);
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const pad = (num: number) => String(num).padStart(2, '0');
        setTimeLeft(`${pad(minutes)}:${pad(seconds)}`);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [heldUntil, bookingConfirmed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      setError('Your hold session has expired. Please return to the event page and try again.');
      return;
    }

    if (!nameOnCard || !cardNumber || !expiry || !cvv) {
      setError('Please fill in all card details');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bookings/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          showSeatIds: seatIds,
          waitlistId: waitlistId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete checkout');
      }

      setBookingConfirmed(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (bookingConfirmed) {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${bookingConfirmed.bookingReference}`;

    return (
      <div
        className="animate-fade-in"
        style={{ padding: '60px 20px', maxWidth: '550px', margin: '0 auto', textAlign: 'center' }}
      >
        <div className="glass-panel ticket" style={{ padding: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={32} color="#10b981" />
            </div>
          </div>

          <h2 style={{ fontSize: '1.75rem', marginBottom: '6px', color: '#f8fafc' }}>
            Booking Confirmed!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            A confirmation email with ticket details and QR code has been dispatched.
          </p>

          <div className="ticket-divider" />

          {/* Ticket Body details */}
          <div style={{ padding: '16px 0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Booking Ref:</span>
              <strong style={{ color: 'white', letterSpacing: '0.05em' }}>{bookingConfirmed.bookingReference}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Paid Amount:</span>
              <strong style={{ color: '#ec4899', fontSize: '1.1rem' }}>${bookingConfirmed.totalAmount.toFixed(2)}</strong>
            </div>
          </div>

          {/* Ticket QR Representation */}
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', margin: '20px auto 0 auto' }}>
            <img src={qrCodeUrl} alt="Ticket QR Code" width="150" height="150" style={{ display: 'block' }} />
          </div>
          
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '10px' }}>
            Scan at entry gate for verification
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
            <button onClick={onBookingSuccess} className="btn-primary" style={{ flex: 1 }}>
              View Bookings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '24px' }}>
        <ArrowLeft size={16} /> Cancel Hold
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        {/* Left Column: Form Details */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={24} style={{ color: '#8b5cf6' }} /> Payment Details
          </h2>

          {error && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#ef4444',
                fontSize: '0.85rem',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name on Card</label>
              <input
                type="text"
                className="form-input"
                placeholder="Jane Doe"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
                disabled={loading || isExpired}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Card Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="4111 2222 3333 4444"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                disabled={loading || isExpired}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Expiration Date</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  disabled={loading || isExpired}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">CVV / CVC</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="•••"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  disabled={loading || isExpired}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || isExpired}
              style={{ width: '100%', height: '48px', marginTop: '16px', gap: '8px' }}
            >
              {loading ? 'Processing Payment...' : 'Confirm & Complete Booking'}
              <ShieldCheck size={18} />
            </button>
          </form>
        </div>

        {/* Right Column: Timer & Seat Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Timer Card */}
          <div
            className="glass-panel"
            style={{
              padding: '24px',
              border: isExpired ? '1px solid #ef4444' : '1px solid #f59e0b',
              background: isExpired ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              {isExpired ? (
                <AlertTriangle size={32} color="#ef4444" />
              ) : (
                <Clock size={32} color="#f59e0b" className="animate-pulse" />
              )}
            </div>
            
            <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', color: isExpired ? '#ef4444' : '#f59e0b' }}>
              {isExpired ? 'Session Expired' : 'Secure Booking Session'}
            </h3>
            
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'white', margin: '8px 0' }}>
              {timeLeft}
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {isExpired
                ? 'Your temporary seat holds have expired. Please go back to the seat map to lock them again.'
                : 'Seats are locked exclusively for you. Complete your checkout before the timer expires.'}
            </p>
          </div>

          {/* Held Seats details summary */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              Reservation Summary
            </h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Reserved Seats:</span>
              <strong style={{ color: 'white' }}>{seatIds.length}</strong>
            </div>

            <div style={{ display: 'flex', justifySelf: 'flex-start', flexWrap: 'wrap', gap: '8px', margin: '12px 0 20px 0' }}>
              {seatIds.map((id) => (
                <span
                  key={id}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#181829',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    color: '#8b5cf6',
                    fontWeight: 600,
                  }}
                >
                  Seat {id.substring(0, 4).toUpperCase() /* Fallback label */}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
