const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = [
    { key: 'WHATSAPP_PHONE_NUMBER_ID', value: '1157873830737599' },
    { key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', value: '1413846367177501' },
    { key: 'WHATSAPP_ACCESS_TOKEN', value: 'EAAdFzSeimMsBSXXb39OCOZAsEZCft2hUZAVFjEFqhEt59TYU48CIp3246nUV0pZB6KgsuSnop7ZAVXvmwzm8mZCbMIhKOAzAn9xymgtvdDY0q0ectrc5LXmZAphLuvHzHNzqF0VkozkEEUTBFQXJzVab29iuUsp9F3dqGFCzc53mxGGVvKqOPzXrq6kSg0u3tWAHBn9LifgPKNelHkOSdX3mfFZAJb3GKbltl6Wu4oisxk58jKbwZAHWvEbWiMzfa2ZAo3SIM4QssHo6lX21a0Bpic2AZDZD' },
    { key: 'WHATSAPP_VERIFY_TOKEN', value: 'gestionale_whatsapp_secret_2026' }
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value }
    });
    console.log(`Saved setting: ${s.key}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
