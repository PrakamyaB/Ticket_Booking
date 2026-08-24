# ShowPass — Real-time Ticket Booking System

ShowPass is a high-performance, real-time ticket booking platform designed for concert arenas and cinema halls. It addresses the challenge of high-demand event rushes by implementing transactional concurrency controls, automatic Time-To-Live (TTL) seat reservations, a first-in, first-out (FIFO) waitlist promotion engine, and live client updates.

---

## 🛠️ Technology Stack & Core Features

*   **Frontend**: React (Vite), TypeScript, Lucide Icons, Vanilla CSS (Custom premium dark theme featuring glowing neon highlights and responsive seat grid layouts).
*   **Backend**: Node.js, Express, Socket.io (WebSocket rooms for live seat map updates), TypeScript.
*   **Database & ORM**: SQLite (zero-configuration embedded file database) with Prisma ORM.
*   **Real-time Synchronization**: Multi-user client connections join event-specific WebSocket rooms to synchronize seat selection statuses instantly.
*   **Concurrency Protection**: Strict database transactions lock seat records during hold requests, preventing double-bookings.
*   **Auto-Release Holds**: Seats are held for a configurable period (e.g. 10 minutes) with real-time checkout countdown timers. An active server-side worker automatically frees abandoned seat holds.
*   **Automated FIFO Waitlist**: Sold-out shows allow users to queue by category. When a seat becomes available (cancellation/hold expiry), the promoter automatically offers the seat to the next waitlisted user with a 5-minute checkout link.
*   **Simulated Mailbox Drawer**: A slide-out panel built directly into the UI. It captures all emails sent by the system in real-time, allowing easy testing of confirmation tickets (with mock QR codes) and waitlist checkout links.

---

## 📂 Project Architecture

```
ticket-booking-system/
├── client/                     # React + Vite Client Application
│   ├── src/
│   │   ├── components/         # Reusable UI widgets
│   │   │   ├── SeatMap.tsx     # Dynamic seat grid layout & hover legends
│   │   │   └── MockMailbox.tsx # Slide-out developer email log viewer
│   │   ├── pages/              # Application dashboards & forms
│   │   │   ├── Login.tsx / Register.tsx
│   │   │   ├── EventsList.tsx  # Event listings with live availability tags
│   │   │   ├── EventDetails.tsx# Active seat grid selection & waitlist joins
│   │   │   ├── Checkout.tsx    # Payment gateway & hold countdown timer
│   │   │   ├── CustomerDashboard.tsx # Booking cancels & waitlist claims
│   │   │   ├── OrganiserDashboard.tsx# Create events & track sales revenue
│   │   │   └── AdminDashboard.tsx    # Register venue structures
│   │   ├── App.tsx             # Root router & layout
│   │   └── index.css           # Premium styles & styling variables
│   ├── index.html
│   └── package.json
│
├── server/                     # Express Backend REST API
│   ├── prisma/                 # Database Schema, migrations and seeds
│   │   ├── schema.prisma       # Prisma SQLite models definition
│   │   └── seed.ts             # Dev users & venue hall seeds
│   ├── src/
│   │   ├── controllers/        # Controllers mapping business rules
│   │   ├── middleware/         # JWT verification & RBAC decorators
│   │   ├── routes/             # REST endpoints registration
│   │   ├── services/           # Cleanup worker & FIFO promoters
│   │   └── index.ts            # Server bootstrap & WebSocket setups
│   └── package.json
│
├── .env.example                # Configuration variables template
└── package.json                # Monorepo concurrent script hub
```

---

## ⚙️ Setup & Installation Guide

Follow these steps to run ShowPass locally on your system.

### Prerequisites
*   **Node.js**: v18.0.0 or higher
*   **npm**: v9.0.0 or higher

### Step-by-Step Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/PrakamyaB/Ticket_Booking.git
    cd Ticket_Booking
    ```

2.  **Install dependencies**:
    Install packages for root, server, and client concurrently:
    ```bash
    npm run install:all
    ```

3.  **Configure environment variables**:
    Copy the environment variables template to the server folder:
    *   **macOS / Linux / Git Bash**:
        ```bash
        cp .env.example server/.env
        ```
    *   **Windows (Command Prompt)**:
        ```cmd
        copy .env.example server\.env
        ```
    *   **Windows (PowerShell)**:
        ```powershell
        Copy-Item .env.example -Destination server\.env
        ```

4.  **Synchronize database & seed seed-data**:
    Run Prisma migrations to create your local SQLite database and seed initial test accounts:
    ```bash
    npm run prisma:migrate --prefix server
    npm run prisma:seed --prefix server
    ```

5.  **Run development servers**:
    Boot the client application and backend server concurrently:
    ```bash
    npm run dev
    ```
    *   **Frontend Client**: [http://localhost:3000](http://localhost:3000)
    *   **Backend Server**: [http://localhost:5000](http://localhost:5000)

---

## 👥 Seeded Development Credentials

Use these preconfigured development profiles to evaluate the role-based features of the application:

| Role | Email | Password | Primary Actions |
| :--- | :--- | :--- | :--- |
| **Customer A** | `customer@example.com` | `customer123` | Browses shows, holds/books seats, cancels bookings. |
| **Customer B** | `customer2@example.com` | `customer123` | Joins waitlists, claims promoted seats. |
| **Organiser** | `organiser@example.com` | `organiser123` | Creates shows, sets ticket pricing, views sales revenue summaries. |
| **System Admin** | `admin@example.com` | `admin123` | Defines venue halls, seat dimensions, and pricing categories. |

---

## 🔍 Step-by-Step Recruiter Verification Walkthrough

To experience the system's core capabilities, run the app and perform the following manual test flows:

### 1. Real-Time Seat Status Synchronization
*   **Action**: Open two separate browser tabs side-by-side (e.g. Chrome normal tab and Incognito tab).
*   **Flow**: Log in to both tabs as separate users. Navigate to the same event showing.
*   **Result**: Click a seat in Tab 1. You will instantly see the seat turn **cyan** (your selection) in Tab 1, and turn **orange** (held by someone else) in Tab 2 in real-time without refreshing.

### 2. Concurrency Control (Race Condition Prevention)
*   **Action**: Try to select and hold the same available seat in both browser tabs at the same time.
*   **Result**: The click that arrives first at the server will succeed, placing a hold on the seat. The slower click will immediately prompt Tab 2 with a conflict warning, explaining that the seat is no longer available.

### 3. TTL Expiration & Auto-Release
*   **Action**: Log in as Customer A. Select a seat, click **Hold Seats**, and proceed to the checkout page.
*   **Flow**: You will see a ticking countdown timer (10:00). Wait for the timer to run out (or manually simulate it by shortening the `HOLD_TTL_SECONDS` in `server/.env`).
*   **Result**: Once the timer hits `00:00`, the hold is released. If you look at the other browser window, the seat will instantly transition back from orange/yellow to available.

### 4. Waitlist Queue FIFO Promotion
*   **Action**:
    1.  Log in as **Organiser**, create an event in a small venue, and book out all the seats using **Customer A**.
    2.  Log in as **Customer B**, navigate to the now sold-out showing, select a category, and click **Join Waitlist Queue**.
    3.  Log in as **Customer A** and cancel one of the bookings.
*   **Result**:
    1.  The seat will instantly update to **held** for **Customer B** (the waitlisted user).
    2.  Open the **Simulated Mailbox Drawer** (floating pink button in bottom right). You will see a new email arrived for Customer B containing a checkout link.
    3.  Click the link in the email. It will immediately redirect you to the checkout screen to complete the booking for the waitlisted seat before the 5-minute timer expires!

---

## 🌐 API Overview

### Authentication
*   `POST /api/auth/register`: Register new user.
*   `POST /api/auth/login`: Issue JWT token on credentials match.
*   `GET /api/auth/me`: Resolve active user profile from authorization headers.

### Venues & Shows
*   `POST /api/venues`: Register venue hall geometry configurations (Admin only).
*   `GET /api/venues`: List registered venue locations.
*   `POST /api/events`: Initialize show listings and generate seat map matrices (Organiser only).
*   `GET /api/events`: List events with live availability calculations.
*   `GET /api/events/:id`: Fetch specific event detail and seat statuses array.
*   `GET /api/events/summary`: Metrics dashboard of tickets sold and revenue per event (Organiser only).

### Reservations & Waitlist
*   `POST /api/bookings/hold`: Request lock on select seats for 10-minutes.
*   `POST /api/bookings/confirm`: Finalize ticket purchases.
*   `POST /api/bookings/:id/cancel`: Cancel tickets and trigger waitlist checks.
*   `POST /api/bookings/waitlist`: Join FIFO queue for sold-out seat categories.
*   `GET /api/bookings/history`: Fetch user's booking history and waitlist positions.
