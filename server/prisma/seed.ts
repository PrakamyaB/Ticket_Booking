import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.emailLog.deleteMany({});
  await prisma.waitlist.deleteMany({});
  await prisma.showSeat.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.eventCategoryPrice.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.venue.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHashAdmin = await bcrypt.hash('admin123', salt);
  const passwordHashOrganiser = await bcrypt.hash('organiser123', salt);
  const passwordHashCustomer = await bcrypt.hash('customer123', salt);
  const passwordHashCustomer2 = await bcrypt.hash('customer123', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'System Admin',
      passwordHash: passwordHashAdmin,
      role: 'ADMIN',
    },
  });

  const organiser = await prisma.user.create({
    data: {
      email: 'organiser@example.com',
      name: 'Event Planner Inc',
      passwordHash: passwordHashOrganiser,
      role: 'ORGANISER',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      name: 'Alice Johnson',
      passwordHash: passwordHashCustomer,
      role: 'CUSTOMER',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@example.com',
      name: 'Bob Smith',
      passwordHash: passwordHashCustomer2,
      role: 'CUSTOMER',
    },
  });

  console.log('Seeding venue...');
  const venue = await prisma.venue.create({
    data: {
      name: 'Grand Metro Cinema',
      rows: 5,
      cols: 6,
    },
  });

  // Generate seats: Row A & B are PREMIUM, Row C, D & E are STANDARD
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const seatsData = [];

  for (const row of rows) {
    const category = (row === 'A' || row === 'B') ? 'PREMIUM' : 'STANDARD';
    for (let col = 1; col <= 6; col++) {
      seatsData.push({
        venueId: venue.id,
        rowName: row,
        colNumber: col,
        category: category,
      });
    }
  }

  await prisma.seat.createMany({
    data: seatsData,
  });

  console.log('Seeding complete!');
  console.log(`Admin User: ${admin.email}`);
  console.log(`Organiser User: ${organiser.email}`);
  console.log(`Customer 1: ${customer1.email}`);
  console.log(`Customer 2: ${customer2.email}`);
  console.log(`Venue: ${venue.name} created with 30 seats.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
