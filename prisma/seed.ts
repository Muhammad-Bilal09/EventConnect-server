import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding EventConnect Database...');

  // Clear existing
  await prisma.rating.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.message.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.eventGroup.deleteMany();
  await prisma.eventPromoter.deleteMany();
  await prisma.event.deleteMany();
  await prisma.clientGroupMember.deleteMany();
  await prisma.clientGroup.deleteMany();
  await prisma.promoter.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Medialinks Admin',
      email: 'admin@medialinks.com',
      passwordHash,
      role: 'ADMIN',
    },
  });

  // 2. Client
  const clientUser = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins (ABC Corp)',
      email: 'client@abc.com',
      passwordHash,
      role: 'CLIENT',
      clientProfile: {
        create: {
          company: 'ABC Marketing & Events',
          phone: '+971 50 123 4567',
          notes: 'Key enterprise client for Gulf region',
        }
      }
    },
    include: { clientProfile: true }
  });

  // 3. Promoters
  const promoterData = [
    { name: 'Muhammad Ali', email: 'muhammad@promoter.com', skills: 'VIP Hospitality, Registration, Lead Gen', exp: '3 years' },
    { name: 'Ahmed Khan', email: 'ahmed@promoter.com', skills: 'Brand Ambassador, Product Demo', exp: '2 years' },
    { name: 'Usman Farooq', email: 'usman@promoter.com', skills: 'Crowd Management, Ticketing', exp: '4 years' },
    { name: 'Hamza Malik', email: 'hamza@promoter.com', skills: 'Promotional Model, Stage Assistant', exp: '1 year' },
    { name: 'Ali Raza', email: 'ali@promoter.com', skills: 'Translator, Customer Service', exp: '5 years' }
  ];

  const promoters = [];
  for (const p of promoterData) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        passwordHash,
        role: 'PROMOTER',
        promoterProfile: {
          create: {
            phone: '+971 55 000 1122',
            skills: p.skills,
            experience: p.exp,
            rating: 4.8,
            ratingCount: 12,
          }
        }
      },
      include: { promoterProfile: true }
    });
    promoters.push(user);
  }

  // 4. Events
  // Active Event: Dubai Expo 2026
  const activeEvent = await prisma.event.create({
    data: {
      name: 'Dubai Expo 2026 Staffing',
      clientId: clientUser.clientProfile!.id,
      locationName: 'Dubai World Trade Centre',
      address: 'Sheikh Zayed Rd - Trade Centre 2 - Dubai',
      latitude: 25.2263,
      longitude: 55.2891,
      checkInRadius: 300,
      startDateTime: new Date(Date.now() - 3600000), // started 1h ago
      endDateTime: new Date(Date.now() + 18000000), // ends in 5h
      requiredPromoters: 5,
      description: 'High-profile tech showcase event requiring 5 proactive promoters.',
      dressCode: 'Black formal suit with white shirt and event badge.',
      instructions: 'Report to Gate 3 by 5:30 PM. Collect badges from Manager Sarah.',
      status: 'ACTIVE',
    }
  });

  // Assign Promoters to Active Event
  for (const p of promoters) {
    await prisma.eventPromoter.create({
      data: {
        eventId: activeEvent.id,
        promoterId: p.promoterProfile!.id,
      }
    });
  }

  // Create Temporary Group for Active Event
  const activeGroup = await prisma.eventGroup.create({
    data: {
      eventId: activeEvent.id,
      status: 'ACTIVE',
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: clientUser.id, role: 'CLIENT' },
          ...promoters.map(p => ({ userId: p.id, role: 'PROMOTER' as const }))
        ]
      }
    }
  });

  // Seed Messages for Active Event
  await prisma.message.createMany({
    data: [
      {
        groupId: activeGroup.id,
        messageType: 'SYSTEM',
        content: '🎉 Event group created for Dubai Expo 2026 Staffing.',
        createdAt: new Date(Date.now() - 3500000)
      },
      {
        groupId: activeGroup.id,
        senderId: admin.id,
        content: 'Welcome team! Please confirm when you arrive at Gate 3.',
        createdAt: new Date(Date.now() - 3400000)
      },
      {
        groupId: activeGroup.id,
        senderId: clientUser.id,
        content: 'Looking forward to working with everyone today. Make sure uniforms are tidy!',
        createdAt: new Date(Date.now() - 3200000)
      },
      {
        groupId: activeGroup.id,
        senderId: promoters[0].id,
        content: 'Understood Sarah, I am near DWTC now.',
        createdAt: new Date(Date.now() - 3000000)
      },
      {
        groupId: activeGroup.id,
        messageType: 'SYSTEM',
        content: '🟢 Muhammad Ali checked in at 5:48 PM',
        createdAt: new Date(Date.now() - 2800000)
      }
    ]
  });

  // Seed Check-in for promoter 0
  await prisma.checkIn.create({
    data: {
      eventId: activeEvent.id,
      promoterId: promoters[0].promoterProfile!.id,
      checkInTime: new Date(Date.now() - 2800000),
      checkInLatitude: 25.2265,
      checkInLongitude: 55.2890,
    }
  });

  // Scheduled Event: Gitex Global 2026
  await prisma.event.create({
    data: {
      name: 'Gitex Global 2026 Promotion',
      clientId: clientUser.clientProfile!.id,
      locationName: 'Dubai Exhibition Centre (DEC)',
      address: 'Expo City Dubai',
      latitude: 24.9608,
      longitude: 55.1504,
      checkInRadius: 250,
      startDateTime: new Date(Date.now() + 86400000 * 3), // 3 days later
      endDateTime: new Date(Date.now() + 86400000 * 3 + 28800000),
      requiredPromoters: 3,
      description: 'International tech exhibition product demonstration.',
      dressCode: 'Smart Casual with branded polo shirts provided on site.',
      instructions: 'Arrive at DEC South Entrance at 8:30 AM.',
      status: 'SCHEDULED',
    }
  });

  console.log('✅ Seeding completed successfully!');
  console.log('ADMIN: admin@medialinks.com / password123');
  console.log('CLIENT: client@abc.com / password123');
  console.log('PROMOTER: muhammad@promoter.com / password123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
