// Quick test: send a real email through Brevo and log every detail
import "dotenv/config";
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "587");
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const fromEmail = process.env.EMAIL_FROM || user;

console.log("=== BREVO SMTP TEST ===");
console.log(`Host:  ${host}`);
console.log(`Port:  ${port}`);
console.log(`User:  ${user}`);
console.log(`Pass:  ${pass ? pass.slice(0, 10) + "..." : "NOT SET"}`);
console.log(`From:  ${fromEmail}`);
console.log("");

const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  tls: { rejectUnauthorized: false },
  debug: true,
  logger: true,
});

// Test 1: Verify connection
console.log("--- Step 1: Verifying SMTP connection ---");
try {
  await transporter.verify();
  console.log("✅ SMTP connection verified successfully!\n");
} catch (err) {
  console.error("❌ SMTP connection failed:", err.message);
  process.exit(1);
}

// Test 2: Send a test email
const testTo = "onworkofficial@gmail.com"; // send to yourself
console.log(`--- Step 2: Sending test email to ${testTo} ---`);
try {
  const info = await transporter.sendMail({
    from: `"CodeMedic AI Test" <${fromEmail}>`,
    to: testTo,
    subject: "Brevo SMTP Test - " + new Date().toLocaleTimeString(),
    text: "If you see this email, Brevo SMTP is working correctly!",
    html: "<h1>✅ Brevo SMTP Works!</h1><p>If you see this, email delivery is working.</p>",
  });

  console.log("\n=== SEND RESULT ===");
  console.log("Message ID:", info.messageId);
  console.log("Response:  ", info.response);
  console.log("Accepted:  ", info.accepted);
  console.log("Rejected:  ", info.rejected);
  console.log("Pending:   ", info.pending);
  console.log("Envelope:  ", JSON.stringify(info.envelope));
  
  if (info.rejected && info.rejected.length > 0) {
    console.log("\n❌ Some recipients were REJECTED by Brevo!");
  } else {
    console.log("\n✅ Brevo accepted the email. If it doesn't arrive, the FROM sender may not be verified in Brevo.");
    console.log("\n📋 TO FIX: Go to https://app.brevo.com/senders/list");
    console.log("   and verify your sender email address there.");
  }
} catch (err) {
  console.error("\n❌ Send failed:", err.message);
  console.error("Full error:", err);
}
