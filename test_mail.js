const { sendNotificationEmail } = require('./src/utils/mailer');
(async () => {
  const success = await sendNotificationEmail('alessandro.galli89@gmail.com', 'Test Email', 'Test body');
  console.log('Success:', success);
})();
