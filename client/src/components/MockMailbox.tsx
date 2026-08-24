import React, { useState, useEffect } from 'react';
import { Mail, X, Trash2, RotateCw } from 'lucide-react';

interface Email {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
}

export default function MockMailbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [lastCheckedCount, setLastCheckedCount] = useState(0);

  const fetchEmails = async () => {
    try {
      const res = await fetch('/api/emails');
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
        if (data.length > lastCheckedCount && lastCheckedCount > 0) {
          setNewCount((prev) => prev + (data.length - lastCheckedCount));
        }
        setLastCheckedCount(data.length);
      }
    } catch (err) {
      console.error('Error fetching mock emails:', err);
    }
  };

  useEffect(() => {
    fetchEmails();
    // Poll every 3 seconds to capture incoming ticket QR codes or waitlist links
    const interval = setInterval(fetchEmails, 3000);
    return () => clearInterval(interval);
  }, [lastCheckedCount]);

  const clearMailbox = async () => {
    if (!confirm('Clear all simulated emails?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/emails', { method: 'DELETE' });
      if (res.ok) {
        setEmails([]);
        setNewCount(0);
        setLastCheckedCount(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = () => {
    setIsOpen(true);
    setNewCount(0);
  };

  return (
    <>
      {/* Floating Mailbox Trigger */}
      <button
        onClick={handleOpenDrawer}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 8px 32px rgba(236, 72, 153, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1) rotate(-5deg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
        }}
      >
        <Mail size={24} />
        {newCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 700,
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0a0a0f',
            }}
          >
            {newCount}
          </span>
        )}
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 100,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Drawer Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: isOpen ? 0 : '-480px',
          width: '100%',
          maxWidth: '450px',
          height: '100%',
          backgroundColor: '#12121f',
          borderLeft: '1px solid #27273f',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.5)',
          zIndex: 101,
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #27273f',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(18, 18, 31, 0.9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail className="gradient-accent" size={20} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Simulated Developer Mailbox</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={fetchEmails}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
              title="Refresh"
            >
              <RotateCw size={16} />
            </button>
            <button
              onClick={clearMailbox}
              disabled={emails.length === 0 || loading}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                opacity: emails.length === 0 ? 0.5 : 1,
              }}
              title="Clear Mailbox"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Info Alert */}
        <div
          style={{
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
            padding: '12px 20px',
            fontSize: '0.8rem',
            color: '#c084fc',
            lineHeight: 1.4,
          }}
        >
          <strong>💡 Developer Mode:</strong> This panel captures all system emails in real-time (ticket QR codes, waitlist notifications). Click waitlist links here to test the full redirection flow!
        </div>

        {/* Email List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {emails.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60%',
                color: '#64748b',
                textAlign: 'center',
                gap: '12px',
              }}
            >
              <Mail size={40} style={{ opacity: 0.3 }} />
              <p>Your mailbox is currently empty.</p>
              <p style={{ fontSize: '0.8rem' }}>Book a ticket or cancel a booking to generate system emails.</p>
            </div>
          ) : (
            emails.map((email) => (
              <div
                key={email.id}
                style={{
                  backgroundColor: '#181829',
                  border: '1px solid #27273f',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600 }}>
                    To: {email.recipient}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {new Date(email.sentAt).toLocaleTimeString()}
                  </span>
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: '#f8fafc' }}>
                  {email.subject}
                </h4>
                <div
                  className="email-body-render"
                  style={{
                    backgroundColor: '#0a0a0f',
                    border: '1px solid #27273f',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '0.85rem',
                    color: '#cbd5e1',
                    lineHeight: 1.5,
                  }}
                  dangerouslySetInnerHTML={{ __html: email.body }}
                  onClick={(e) => {
                    // Intercept link clicks to keep user within their browser router tab easily
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'A') {
                      e.preventDefault();
                      const href = target.getAttribute('href');
                      if (href) {
                        // Extract query string or redirect using custom window event
                        window.dispatchEvent(new CustomEvent('mailbox-redirect', { detail: href }));
                        setIsOpen(false);
                      }
                    }
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
