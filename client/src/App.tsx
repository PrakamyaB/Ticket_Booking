import React, { useState, useEffect } from 'react';
import { Armchair, LogIn, LogOut, LayoutDashboard, User, Ticket } from 'lucide-react';

// Pages
import EventsList from './pages/EventsList';
import EventDetails from './pages/EventDetails';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import CustomerDashboard from './pages/CustomerDashboard';
import OrganiserDashboard from './pages/OrganiserDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Components
import MockMailbox from './components/MockMailbox';

interface UserPayload {
  id: string;
  email: string;
  role: string;
  name: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserPayload | null>(null);

  // Router State
  const [page, setPage] = useState<string>('events'); // 'events', 'details', 'checkout', 'login', 'register', 'dashboard'
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Checkout Session State
  const [checkoutSeatIds, setCheckoutSeatIds] = useState<string[]>([]);
  const [checkoutHeldUntil, setCheckoutHeldUntil] = useState<string>('');
  const [checkoutWaitlistId, setCheckoutWaitlistId] = useState<string | undefined>(undefined);

  // Load user from local storage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  // Intercept redirection events from developer mailbox
  useEffect(() => {
    const handleMailboxRedirect = (e: any) => {
      // Url format: http://localhost:3000/checkout?eventId=X&waitlistId=Y&seats=Z
      const url = new URL(e.detail);
      const eventId = url.searchParams.get('eventId');
      const waitlistId = url.searchParams.get('waitlistId');
      const seats = url.searchParams.get('seats');

      if (eventId && seats) {
        setSelectedEventId(eventId);
        setCheckoutSeatIds([seats]);
        // Set the hold timer to expire in 5 minutes (standard waitlist hold)
        const expiry = new Date(Date.now() + 300 * 1000).toISOString();
        setCheckoutHeldUntil(expiry);
        if (waitlistId) setCheckoutWaitlistId(waitlistId);
        
        setPage('checkout');
        console.log(`Mailbox redirected user to checkout for event: ${eventId}`);
      }
    };

    window.addEventListener('mailbox-redirect', handleMailboxRedirect);
    return () => window.removeEventListener('mailbox-redirect', handleMailboxRedirect);
  }, []);

  const handleLoginSuccess = (userToken: string, userPayload: UserPayload) => {
    setToken(userToken);
    setUser(userPayload);
    // If they were logging in from details, go back to details, otherwise dashboard
    if (selectedEventId) {
      setPage('details');
    } else if (userPayload.role === 'ORGANISER') {
      setPage('organiser-dashboard');
    } else if (userPayload.role === 'ADMIN') {
      setPage('admin-dashboard');
    } else {
      setPage('events');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setSelectedEventId(null);
    setPage('events');
  };

  const navigateToDetails = (eventId: string) => {
    setSelectedEventId(eventId);
    setPage('details');
  };

  const navigateToCheckout = (eventId: string, seatIds: string[], heldUntil: string) => {
    setSelectedEventId(eventId);
    setCheckoutSeatIds(seatIds);
    setCheckoutHeldUntil(heldUntil);
    setCheckoutWaitlistId(undefined); // Reset waitlist
    setPage('checkout');
  };

  const navigateToWaitlistCheckout = (
    eventId: string,
    waitlistId: string,
    seatIds: string[],
    offerExpiresAt: string
  ) => {
    setSelectedEventId(eventId);
    setCheckoutSeatIds(seatIds);
    setCheckoutHeldUntil(offerExpiresAt);
    setCheckoutWaitlistId(waitlistId);
    setPage('checkout');
  };

  // Render navigation elements based on login role
  const renderDashboardLink = () => {
    if (!user) return null;
    let label = 'My Bookings';
    let targetPage = 'customer-dashboard';

    if (user.role === 'ORGANISER') {
      label = 'Organiser Dashboard';
      targetPage = 'organiser-dashboard';
    } else if (user.role === 'ADMIN') {
      label = 'Admin Console';
      targetPage = 'admin-dashboard';
    }

    return (
      <button
        onClick={() => setPage(targetPage)}
        className="btn-secondary"
        style={{
          padding: '8px 16px',
          fontSize: '0.85rem',
          borderColor: page === targetPage ? '#8b5cf6' : 'var(--border-color)',
          color: page === targetPage ? '#8b5cf6' : 'white',
        }}
      >
        <LayoutDashboard size={14} />
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navigation Header */}
      <header className="nav-container">
        <div
          onClick={() => {
            setSelectedEventId(null);
            setPage('events');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            }}
          >
            <Armchair size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-family-heading)' }} className="gradient-text">
            ShowPass
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => {
              setSelectedEventId(null);
              setPage('events');
            }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              borderColor: page === 'events' ? '#8b5cf6' : 'var(--border-color)',
              color: page === 'events' ? '#8b5cf6' : 'white',
            }}
          >
            <Ticket size={14} />
            Showings
          </button>

          {token ? (
            <>
              {renderDashboardLink()}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                <User size={16} />
                <span>{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setPage('login')}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <LogIn size={14} />
                Sign In
              </button>
              <button
                onClick={() => setPage('register')}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Register
              </button>
            </>
          )}
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: '80px' }}>
        {page === 'events' && <EventsList token={token} onSelectEvent={navigateToDetails} />}
        
        {page === 'details' && selectedEventId && (
          <EventDetails
            eventId={selectedEventId}
            token={token}
            onBack={() => setPage('events')}
            onNavigateToCheckout={navigateToCheckout}
            onNavigateToLogin={() => setPage('login')}
          />
        )}

        {page === 'checkout' && selectedEventId && (
          <Checkout
            eventId={selectedEventId}
            seatIds={checkoutSeatIds}
            heldUntil={checkoutHeldUntil}
            waitlistId={checkoutWaitlistId}
            token={token}
            onBack={() => setPage('details')}
            onBookingSuccess={() => setPage('customer-dashboard')}
          />
        )}

        {page === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setPage('register')}
          />
        )}

        {page === 'register' && (
          <Register
            onRegisterSuccess={handleLoginSuccess}
            onNavigateToLogin={() => setPage('login')}
          />
        )}

        {page === 'customer-dashboard' && (
          <CustomerDashboard
            token={token}
            onNavigateToWaitlistCheckout={navigateToWaitlistCheckout}
            onSelectEvent={navigateToDetails}
          />
        )}

        {page === 'organiser-dashboard' && <OrganiserDashboard token={token} />}

        {page === 'admin-dashboard' && <AdminDashboard token={token} />}
      </main>

      {/* Developer Mock Mailbox drawer overlay */}
      <MockMailbox />
    </div>
  );
}
