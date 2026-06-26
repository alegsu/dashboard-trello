const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany();
  const config = {};
  settings.forEach(s => { config[s.key] = s.value; });

  console.log("SMTP Config:", {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    user: config.SMTP_USER,
    pass: config.SMTP_PASS ? '***' : 'missing'
  });

  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: parseInt(config.SMTP_PORT || '465'),
    secure: parseInt(config.SMTP_PORT || '465') === 465,
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log("SMTP verification SUCCESS!");
  } catch (err) {
    console.error("SMTP verification FAILED:", err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
