# ShowPass - Ticket Booking System

A real-time ticket booking platform for movies and concerts. Customers can browse events, select seats from a visual map, hold seats with a configurable TTL, join waitlists for sold-out events, and receive ticket booking confirmation emails with simulated QR codes.

---

## Technical Stack & Features
*   **Frontend**: React, Vite, TypeScript, Lucide Icons, Vanilla CSS (Premium Dark Theme).
*   **Backend**: Node.js, Express, Socket.io (real-time updates), JWT Auth, TypeScript.
*   **Database**: Prisma ORM, SQLite (embedded, zero-configuration setup).
*   **Real-time Synced Seat Maps**: Multi-user seat booking changes broadcasted via Socket.io rooms.
*   **Safe Concurrency Protection**: Transactions block simultaneous attempts to hold or book the same seat.
*   **TTL Holds & FIFO Waitlist**: Expired holds auto-release; seats are offered automatically to waitlisted customers with a 5-minute checkout timer.
*   **Simulated Mailbox Drawer**: A frontend slide-out panel that captures all sent emails (booking references, QR code tickets, and waitlist offer checkout links).

---

## Getting Started

### Prerequisites
*   Node.js (v18 or higher)
*   npm (v9 or higher)

### Setup & Run
1.  **Install dependencies**:
    From the root directory, install all dependencies for the workspace:
    ```bash
    npm run install:all
    ```

2.  **Configure environment variables**:
    Copy the example configuration to create the server `.env` file (one is already prepared):
    ```bash
    cp .env.example server/.env
    ```

3.  **Run database migrations & seed data**:
    Initialize the SQLite database and seed the system with mock users and venues:
    ```bash
    npm run prisma:migrate --prefix server
    npm run prisma:seed --prefix server
    ```

4.  **Start the development servers**:
    Launch the React frontend and Express backend concurrently:
    ```bash
    npm run dev
    ```
    *   **Frontend**: [http://localhost:3000](http://localhost:3000)
    *   **Backend**: [http://localhost:5000](http://localhost:5000)

---

## DB Schema (Prisma)
The database structure is designed as follows (defined in [schema.prisma](file:///C:/Users/bhuvi/.gemini/antigravity/scratch/ticket-booking-system/server/prisma/schema.prisma)):

*   `User`: Registered accounts with roles (`ADMIN`, `ORGANISER`, `CUSTOMER`).
*   `Venue`: Concert hall structures with grid rows and columns.
*   `Seat`: Row names (A-Z) and column numbers, categorised as `PREMIUM` or `STANDARD`.
*   `Event`: Shows containing venue schedules, description, and listings.
*   `EventCategoryPrice`: Pricing configured per category (e.g. PREMIUM = $120, STANDARD = $50) for each event.
*   `ShowSeat`: State of each seat for an event show (`AVAILABLE`, `HELD`, `BOOKED`), linking the user holding it and the countdown expiry time.
*   `Booking`: Confirmed ticket reservations, total price, and unique booking references.
*   `Waitlist`: FIFO queue for customers waiting for seats in a sold-out category.
*   `EmailLog`: Outgoing notifications viewer (simulated ticket QR codes, waitlist links).

---

## Core Logic Explanation

### 1. Concurrency-Safe Seat Holds
When a user selects seats and clicks "Hold", the backend performs a Prisma database transaction:
1.  Queries the requested `ShowSeat` rows.
2.  Verifies each seat status: if status is `BOOKED`, or `HELD` and the `heldUntil` timestamp is in the future, the transaction fails and throws an error.
3.  Otherwise, it updates all seats to `HELD` and sets `heldUntil = NOW + HOLD_TTL_SECONDS`.
4.  Broadcasts the new seat statuses to all clients connected to the event room via Socket.io.

### 2. Auto-Release & Waitlist Promotion
A background worker runs every 5 seconds on the Express server:
1.  **Releases expired holds**: Finds seats where status is `HELD` (and not a waitlist offer) and `heldUntil` is in the past. Reverts them to `AVAILABLE` and broadcasts updates.
2.  **Cleans expired waitlist offers**: Finds waitlists where status is `OFFERED` and `offerExpiresAt` is in the past. Marks the waitlist as `EXPIRED` and frees the offered seat.
3.  **Promotes next waitlisted customer**: For any newly available seats, if a waiting queue exists (`Waitlist.status = 'WAITING'`), the first entry is promoted:
    *   Waitlist status is set to `OFFERED`.
    *   The seat is locked for this customer with a time-limited `heldUntil = NOW + WaitlistOfferTTL`.
    *   A simulated email is logged containing a claim link: `http://localhost:3000/checkout?eventId=X&waitlistId=Y&seats=Z`.

---

## API Endpoints

### Authentication
*   `POST /api/auth/register`: Create a new user (role: `CUSTOMER`, `ORGANISER`, or `ADMIN`).
*   `POST /api/auth/login`: Authenticate and receive a JWT.
*   `GET /api/auth/me`: Fetch authenticated user profile details.

### Venues
*   `GET /api/venues`: List all venue hall layouts (Authenticated).
*   `POST /api/venues`: Create a venue hall and generate seat grids (Admin only).

### Events
*   `GET /api/events`: Browse events with date/search query filters and live availability counters.
*   `GET /api/events/:id`: Fetch event details and formatted real-time seat grid array.
*   `POST /api/events`: Publish new show showing and initialize seating map grid (Organiser only).
*   `GET /api/events/summary`: Fetch booking sales summaries and revenue metrics per show (Organiser only).

### Bookings & Waitlist
*   `POST /api/bookings/hold`: Request a temporary seat hold for 10 minutes (Customer only).
*   `POST /api/bookings/confirm`: Process credit card details and confirm booking (Customer only).
*   `POST /api/bookings/:id/cancel`: Cancel ticket booking, trigger refund email, and auto-promote waitlist (Customer/Organiser/Admin).
*   `POST /api/bookings/waitlist`: Join waitlist queue if a seat category is sold out (Customer only).
*   `GET /api/bookings/history`: Fetch customer's booking transaction log and active waitlist entries.

### Simulated Email Log (Developer View)
*   `GET /api/emails`: Fetch system emails (QR confirmation codes, waitlist links) for UI review.
*   `DELETE /api/emails`: Clear simulated inbox history.
