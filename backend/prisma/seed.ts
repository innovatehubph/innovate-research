import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminEmail = 'admin@innovatehub.ph';
  const adminPassword = 'Admin@Research2026';
  
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });
  
  if (existingAdmin) {
    console.log('✅ Admin user already exists');
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'Admin',
        plan: 'ENTERPRISE',
        credits: 999999,
        apiKeys: {
          create: {
            key: `ir_admin_${uuidv4().replace(/-/g, '')}`,
            name: 'Admin Master Key'
          }
        }
      },
      include: {
        apiKeys: true
      }
    });
    
    console.log('✅ Admin user created:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Plan: ${admin.plan}`);
    console.log(`   API Key: ${admin.apiKeys[0].key}`);
  }

  // Create demo user for testing
  const demoEmail = 'demo@innovatehub.ph';
  
  const existingDemo = await prisma.user.findUnique({
    where: { email: demoEmail }
  });
  
  if (!existingDemo) {
    const hashedPassword = await bcrypt.hash('Demo@Research2026', 12);
    
    const demo = await prisma.user.create({
      data: {
        email: demoEmail,
        password: hashedPassword,
        name: 'Demo User',
        plan: 'STARTER',
        credits: 100,
        apiKeys: {
          create: {
            key: `ir_demo_${uuidv4().replace(/-/g, '')}`,
            name: 'Demo API Key'
          }
        }
      },
      include: {
        apiKeys: true
      }
    });
    
    console.log('✅ Demo user created:');
    console.log(`   Email: ${demo.email}`);
    console.log(`   Plan: ${demo.plan}`);
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
