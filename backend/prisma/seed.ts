import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding relational database...');

  // 1. Clean previous data
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.order.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // 2. Create Company
  const company = await prisma.company.create({
    data: {
      name: 'Pilotcorp'
    }
  });

  // 3. Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@supportpilot.com',
      password: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      companyId: company.id
    }
  });
  console.log(`Created admin: ${admin.email}`);

  // 4. Create Customer 1 (John Doe)
  const johnPassword = await bcrypt.hash('john123', 10);
  const john = await prisma.user.create({
    data: {
      email: 'john@customer.com',
      password: johnPassword,
      name: 'John Doe',
      role: 'CUSTOMER',
      companyId: company.id
    }
  });
  console.log(`Created customer: ${john.email}`);

  // Create Free subscription for John Doe
  await prisma.subscription.create({
    data: {
      customerId: john.id,
      status: 'INACTIVE',
      tier: 'FREE'
    }
  });

  // Create Orders for John Doe
  const orders = [
    {
      orderNumber: 'ORD-100201',
      totalAmount: 120.50,
      status: 'SHIPPED',
      items: [
        { productName: 'Laptop Charger 65W', quantity: 1, price: 45.50 },
        { productName: 'Wireless Mouse Pro', quantity: 1, price: 75.00 }
      ]
    },
    {
      orderNumber: 'ORD-100202',
      totalAmount: 15.99,
      status: 'DELIVERED',
      items: [
        { productName: 'Keyboard Dust Cover', quantity: 1, price: 15.99 }
      ]
    },
    {
      orderNumber: 'ORD-100203',
      totalAmount: 899.00,
      status: 'DELAYED',
      items: [
        { productName: 'Ultrawide Smart Monitor 34"', quantity: 1, price: 899.00 }
      ]
    }
  ];

  for (const o of orders) {
    await prisma.order.create({
      data: {
        orderNumber: o.orderNumber,
        customerId: john.id,
        totalAmount: o.totalAmount,
        status: o.status as any,
        items: o.items
      }
    });
  }
  console.log(`Created ${orders.length} orders for ${john.name}`);

  // 5. Create Customer 2 (Jane Smith)
  const janePassword = await bcrypt.hash('jane123', 10);
  const jane = await prisma.user.create({
    data: {
      email: 'jane@customer.com',
      password: janePassword,
      name: 'Jane Smith',
      role: 'CUSTOMER',
      companyId: company.id
    }
  });
  console.log(`Created customer: ${jane.email}`);

  // Create Active PRO subscription for Jane Smith
  await prisma.subscription.create({
    data: {
      customerId: jane.id,
      status: 'ACTIVE',
      tier: 'PRO',
      stripeSubscriptionId: 'sub_seeding_test_123'
    }
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
