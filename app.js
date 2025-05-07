// // // Looking to send emails in production? Check out our Email API/SMTP product!
// // const { MailtrapClient } = require("mailtrap");

// // const TOKEN = "48090a9e5856dd50ba7c949fe59b7d3a";

// // const client = new MailtrapClient({
// //   token: TOKEN,
// //   testInboxId: 3675040,
// // });

// // const sender = {
// //   email: "hello@example.com",
// //   name: "Mailtrap Test",
// // };
// // const recipients = [
// //   {
// //     email: "cubes.dev7@gmail.com",
// //   }
// // ];

// // client.testing
// //   .send({
// //     from: sender,
// //     to: recipients,
// //     subject: "You are awesome!",
// //     text: "Congrats for sending test email with Mailtrap!",
// //     category: "Integration Test",
// //   })
// //   .then(console.log, console.error);


// const { MailtrapClient } = require("mailtrap");

// const TOKEN = "your_api_token"; // Replace with your real API token
// const ACCOUNT_ID = "your_account_id"; // Replace with your real account ID
// const INBOX_ID = 3675040; // Your test inbox ID

// const client = new MailtrapClient({
//   token: TOKEN,
//   endpoint: "https://sandbox.api.mailtrap.io", // required for testing API
//   accountId: ACCOUNT_ID,
// });

// const sender = {
//   email: "hello@example.com",
//   name: "Mailtrap Test",
// };

// const recipients = [
//   {
//     email: "test@example.com", // must be a test email — won't be delivered externally
//   },
// ];

// client.testing
//   .send({
//     from: sender,
//     to: recipients,
//     subject: "You are awesome!",
//     text: "Congrats for sending test email with Mailtrap!",
//     category: "Integration Test",
//     inboxId: INBOX_ID,
//   })
//   .then(console.log)
//   .catch(console.error);

import { MailtrapClient } from "mailtrap"

/**
 * For this example to work, you need to set up a sending domain,
 * and obtain a token that is authorized to send from the domain.
 */

const TOKEN = "48090a9e5856dd50ba7c949fe59b7d3a";
const SENDER_EMAIL = "cubes.dev7@gmail.com";
const RECIPIENT_EMAIL = "cubes.dev7@gmail.com";

const client = new MailtrapClient({ token: TOKEN });

const sender = { name: "Mailtrap Test", email: SENDER_EMAIL };

client
  .send({
    from: sender,
    to: [{ email: RECIPIENT_EMAIL }],
    subject: "Hello from Mailtrap!",
    text: "Welcome to Mailtrap Sending!",
  })
  .then(console.log)
  .catch(console.error);