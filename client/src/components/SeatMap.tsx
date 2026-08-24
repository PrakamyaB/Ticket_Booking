import React from 'react';
import { Armchair } from 'lucide-react';

interface Seat {
  id: string;
  seatId: string;
  rowName: string;
  colNumber: number;
  category: string;
  status: string; // "AVAILABLE" | "HELD" | "BOOKED"
  isOwnHold: boolean;
  heldUntil?: string;
}

interface CategoryPrice {
  category: string;
  price: number;
}

interface SeatMapProps {
  seats: Seat[];
  categoryPrices: CategoryPrice[];
  selectedSeatIds: string[];
  onToggleSeat: (seatId: string) => void;
}

export default function SeatMap({
  seats,
  categoryPrices,
  selectedSeatIds,
  onToggleSeat,
}: SeatMapProps) {
  // Find prices for tooltips
  const getSeatPrice = (category: string) => {
    const cp = categoryPrices.find((p) => p.category === category);
    return cp ? cp.price : 0;
  };

  // Group seats by rowName for orderly grid rendering
  const seatsByRow: Record<string, Seat[]> = {};
  seats.forEach((seat) => {
    if (!seatsByRow[seat.rowName]) {
      seatsByRow[seat.rowName] = [];
    }
    seatsByRow[seat.rowName].push(seat);
  });

  // Sort columns in each row
  Object.keys(seatsByRow).forEach((row) => {
    seatsByRow[row].sort((a, b) => a.colNumber - b.colNumber);
  });

  // Sort rows alphabetically
  const sortedRowKeys = Object.keys(seatsByRow).sort();

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '30px', position: 'relative' }}>
      {/* Visual Screen / Stage */}
      <div
        style={{
          width: '80%',
          margin: '0 auto 40px auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            height: '8px',
            background: 'linear-gradient(90deg, transparent 0%, #8b5cf6 50%, transparent 100%)',
            boxShadow: '0 0 20px #8b5cf6',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        />
        <span
          style={{
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: '#8b5cf6',
            fontWeight: 700,
          }}
        >
          STAGE / SCREEN
        </span>
      </div>

      {/* Grid Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '16px',
        }}
      >
        {sortedRowKeys.map((rowName) => (
          <div
            key={rowName}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {/* Row Label (Left) */}
            <span
              style={{
                width: '24px',
                fontWeight: 800,
                color: '#64748b',
                fontFamily: 'var(--font-family-heading)',
                fontSize: '1rem',
                textAlign: 'center',
              }}
            >
              {rowName}
            </span>

            {/* Row Seats */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {seatsByRow[rowName].map((seat) => {
                const isSelected = selectedSeatIds.includes(seat.id);
                const price = getSeatPrice(seat.category);

                // Determine seat color theme
                let seatBg = 'var(--bg-tertiary)';
                let seatBorder = '1px solid var(--border-color)';
                let seatColor = 'var(--text-muted)';
                let cursor = 'pointer';
                let glow = 'none';

                if (seat.status === 'BOOKED') {
                  seatBg = 'rgba(239, 68, 68, 0.1)';
                  seatBorder = '1px solid #ef4444';
                  seatColor = '#ef4444';
                  cursor = 'not-allowed';
                } else if (seat.status === 'HELD') {
                  if (seat.isOwnHold) {
                    // Current customer's hold
                    seatBg = 'rgba(6, 182, 212, 0.15)';
                    seatBorder = '2px solid #06b6d4';
                    seatColor = '#06b6d4';
                    glow = '0 0 10px rgba(6, 182, 212, 0.4)';
                  } else {
                    // Someone else's hold
                    seatBg = 'rgba(245, 158, 11, 0.1)';
                    seatBorder = '1px solid #f59e0b';
                    seatColor = '#f59e0b';
                    cursor = 'not-allowed';
                  }
                } else {
                  // AVAILABLE
                  if (isSelected) {
                    // Selected for holding
                    seatBg = 'rgba(139, 92, 246, 0.2)';
                    seatBorder = '2px solid #8b5cf6';
                    seatColor = '#a78bfa';
                    glow = '0 0 12px rgba(139, 92, 246, 0.5)';
                  } else if (seat.category === 'PREMIUM') {
                    // Premium Available
                    seatBg = 'rgba(236, 72, 153, 0.05)';
                    seatBorder = '1px dashed #ec4899';
                    seatColor = '#ec4899';
                  } else {
                    // Standard Available
                    seatBg = 'rgba(148, 163, 184, 0.05)';
                    seatBorder = '1px solid #475569';
                    seatColor = '#94a3b8';
                  }
                }

                const handleSeatClick = () => {
                  if (seat.status === 'AVAILABLE') {
                    onToggleSeat(seat.id);
                  }
                };

                return (
                  <button
                    key={seat.id}
                    onClick={handleSeatClick}
                    disabled={seat.status !== 'AVAILABLE'}
                    title={`${rowName}-${seat.colNumber} (${seat.category}) - $${price}`}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '8px',
                      background: seatBg,
                      border: seatBorder,
                      color: seatColor,
                      cursor: cursor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      boxShadow: glow,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={(e) => {
                      if (seat.status === 'AVAILABLE') {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        if (isSelected) {
                          e.currentTarget.style.boxShadow = '0 4px 16px rgba(139, 92, 246, 0.6)';
                        } else {
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 255, 255, 0.1)';
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (seat.status === 'AVAILABLE') {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = glow;
                      }
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Armchair size={14} style={{ marginBottom: '-2px' }} />
                      <span style={{ fontSize: '0.65rem' }}>{seat.colNumber}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Row Label (Right) */}
            <span
              style={{
                width: '24px',
                fontWeight: 800,
                color: '#64748b',
                fontFamily: 'var(--font-family-heading)',
                fontSize: '1rem',
                textAlign: 'center',
              }}
            >
              {rowName}
            </span>
          </div>
        ))}
      </div>

      {/* Map Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '24px',
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(148, 163, 184, 0.05)', border: '1px solid #475569' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Standard Available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(236, 72, 153, 0.05)', border: '1px dashed #ec4899' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Premium Available</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.2)', border: '2px solid #8b5cf6', boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Selected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.15)', border: '2px solid #06b6d4' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Your Active Hold</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Held (10m TTL)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Sold / Booked</span>
        </div>
      </div>
    </div>
  );
}
