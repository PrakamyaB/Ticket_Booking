# Ticket Booking System - System Design

This document details the architectural design and concurrency controls of the high-demand Ticket Booking System.

---

## 1. Concurrency Control (Safe Seat Holds)
To prevent two customers from selecting and locking the same seat at the same millisecond:
*   **Database Constraints**: The combination of `eventId` and `seatId` in the `ShowSeat` model is governed by a **unique constraint**. This ensures that per show, there exists exactly one lifecycle row for each physical seat.
*   **Transaction Isolation**: When a customer requests to hold seats, the Express backend wraps the operations in a strict **Prisma Transaction** (which executes in a single SQLite sequential block). 
*   **State Verification**:
    1.  The transaction reads the selected seats and locks them (standard row-level locking or table-level write lock in SQLite).
    2.  For each seat, it checks the expression: `status === 'AVAILABLE' || (status === 'HELD' && heldUntil < NOW)`.
    3.  If any seat is active-held (`heldUntil >= NOW`) or booked (`status === 'BOOKED'`), the transaction immediately fails and rolls back, returning a `409 Conflict` status code.
    4.  If all are available, the transaction updates the seat fields: `status = 'HELD'`, `heldByUserId = currentUserId`, and `heldUntil = NOW + TTL`.
*   This approach guarantees **mutual exclusion**: simultaneous requests to lock the same seat will never both succeed.

---

## 2. Seat Hold TTL & Background Auto-Release
*   **Configurable TTL**: Active holds default to a configurable time-to-live (e.g., 600 seconds, defined in `.env`).
*   **Ticking Expiry**: The `heldUntil` timestamp is stored in the database. On the frontend, a React countdown timer calculates `heldUntil - NOW` every second to update the checkout screen.
*   **Auto-Release Engine**:
    *   A background scheduler in the backend runs every 5 seconds.
    *   It queries for any `ShowSeat` where `status === 'HELD'` and `heldUntil < NOW`.
    *   It resets expired records to `AVAILABLE`, clearing the hold user and timestamp.
    *   It broadcasts the updated seat map to all active client sockets.
    *   It triggers the waitlist auto-assignment flow for the freed seat's category.

---

## 3. Waitlist FIFO Queue & Auto-Assignment Flow
*   **Waitlist Creation**: When a seat category (e.g., `PREMIUM` or `STANDARD`) is sold out, customers can join a waitlist. The system inserts a record in the `Waitlist` table with `status = 'WAITING'` and an auto-incremented queue `position` (representing their place in line).
*   **FIFO Promotion Trigger**: When a booking is cancelled or a hold expires:
    1.  The system identifies the seat's event and category.
    2.  It queries the first active waitlist entry: `status === 'WAITING'` ordered by `position ASC`.
    3.  If found, the system performs a database transaction to promote the customer:
        *   Transition waitlist status to `OFFERED`.
        *   Lock the newly available seat: `status = 'HELD'`, `heldByUserId = waitlist.userId`, `heldUntil = NOW + WaitlistOfferTTL` (e.g. 5 minutes).
        *   Generate a time-limited booking link: `/checkout?eventId=X&waitlistId=Y&seats=Z`.
        *   Write an `EmailLog` record (and send notification) containing the claim link.
        *   Broadcast real-time map changes to clients.

---

## 4. Time-Limited Offer Handling
*   **Strict Offer Expiry**: A waitlist offer holds the seat for a shortened duration (e.g., 300 seconds) to prevent seats from staying locked if a waitlisted customer is offline.
*   **Expired Offer Transition**:
    *   During the background check, if the scheduler detects a waitlist record with `status === 'OFFERED'` and `offerExpiresAt < NOW`:
        1.  It transitions the waitlist entry to `EXPIRED`.
        2.  It releases the seat back to `AVAILABLE`.
        3.  It immediately runs the promotion engine again, shifting the seat to the next waitlisted user in line (if any), maintaining high seat utilisation.
*   **Offer Completion**: If the customer clicks the link and completes checkout before the timer expires, the seat status is updated to `BOOKED` and the waitlist record transitions to `COMPLETED`.
