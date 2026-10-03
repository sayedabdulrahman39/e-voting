import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import * as dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

function getEmailTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) return null;

  if (host.includes("gmail") || user.includes("@gmail.com")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ""), // removes spaces if copied from Google App Password
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user: user.trim(), pass: pass.trim() },
  });
}

app.get("/", (req: Request, res: Response) => {
  res.json({
    status: "online",
    service: "E-Voting Relayer Backend API",
    healthEndpoint: "/api/health",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "e-voting-relayer",
    timestamp: new Date().toISOString(),
    phase: "Phase 0 (Setup & Skeleton)",
  });
});

// ─── Email OTP Dispatch Endpoint ───────────────────────────────────────────
app.post("/api/send-otp", async (req: Request, res: Response) => {
  try {
    const { email, voterIdNumber, fullName, otpCode, expiresInMinutes = 2 } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: email and otpCode are mandatory.",
      });
    }

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
    const recipientName = fullName || "Registered Voter";
    const voterId = voterIdNumber || "VOTER-ID";

    console.log("==========================================================");
    console.log(`[EMAIL DISPATCH] Security OTP Generated for ${recipientName}`);
    console.log(`Recipient Email : ${email}`);
    console.log(`Voter ID Number : ${voterId}`);
    console.log(`One-Time Code   : ${otpCode}`);
    console.log(`Session Validity: ${expiresInMinutes} minutes (Expires at: ${expiresAt})`);
    console.log("==========================================================");

    let externalSent = false;
    let dispatchMethod = "console_logged";

    // 1. Attempt Resend API Dispatch (Direct 4-Digit Code Delivery)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const fromEmail = process.env.EMAIL_FROM || "VOTEX Security <onboarding@resend.dev>";
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: `Your VOTEX E-Voting Login Code: ${otpCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 28px; border-radius: 16px; max-width: 480px; margin: auto; border: 1px solid #334155;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <h2 style="color: #38bdf8; margin: 0; font-size: 22px;">VOTEX E-Voting Portal</h2>
                  <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Zero-Knowledge Cryptographic Authentication</p>
                </div>
                
                <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid #475569;">
                  <p style="color: #cbd5e1; font-size: 13px; margin-top: 0;">Hello <strong>${recipientName}</strong> (${voterId}),</p>
                  <p style="color: #94a3b8; font-size: 12px; margin-bottom: 12px;">Your 4-Digit Verification Code is:</p>
                  
                  <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #10b981; font-family: monospace; display: inline-block; width: 80%; border: 1px solid #10b981;">
                    ${otpCode}
                  </div>
                  
                  <p style="color: #f59e0b; font-size: 12px; font-weight: bold; margin-top: 16px; margin-bottom: 0;">
                    ⏱️ Code valid for ${expiresInMinutes} minutes only.
                  </p>
                </div>

                <p style="color: #64748b; font-size: 11px; text-align: center; margin-top: 20px; line-height: 1.5;">
                  Enter this 4-digit code on the VOTEX portal to log in as a Voter and cast your vote.<br/>
                  If you did not request this code, please ignore this message.
                </p>
              </div>
            `,
          }),
        });

        const resData = await response.json();
        if (response.ok) {
          externalSent = true;
          dispatchMethod = "resend_api";
          console.log(`[Resend API Success] 4-digit OTP (${otpCode}) sent to ${email}. ID: ${resData.id}`);
        } else {
          console.warn("[Resend API Error]:", response.status, JSON.stringify(resData));
        }
      } catch (emailErr: any) {
        console.warn("[Resend API Exception]:", emailErr.message);
      }
    }

    // 2. Fallback: Attempt Nodemailer SMTP Dispatch if Resend was not used
    const transporter = getEmailTransporter();
    if (!externalSent && transporter) {
      try {
        const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@votex-election.org";
        await transporter.sendMail({
          from: `"VOTEX Security" <${fromAddress}>`,
          to: email,
          subject: `Your VOTEX E-Voting Login Code: ${otpCode}`,
          html: `
            <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 500px; margin: auto;">
              <h2 style="color: #38bdf8; margin-bottom: 8px;">VOTEX E-Voting Security Code</h2>
              <p style="color: #94a3b8; font-size: 14px;">Hello <strong>${recipientName}</strong> (${voterId}),</p>
              <p style="color: #94a3b8; font-size: 14px;">Your 4-digit verification code is:</p>
              <div style="background-color: #1e293b; padding: 18px; text-align: center; border-radius: 8px; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #10b981; margin: 20px 0;">
                ${otpCode}
              </div>
              <p style="color: #ef4444; font-size: 13px; font-weight: bold;">⏱️ This code will expire in ${expiresInMinutes} minutes.</p>
            </div>
          `,
        });
        externalSent = true;
        dispatchMethod = "smtp_nodemailer";
        console.log(`[Nodemailer SMTP] Email successfully delivered to ${email}`);
      } catch (smtpErr: any) {
        console.warn("[Nodemailer SMTP Warning] Failed to dispatch email:", smtpErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Security OTP sent to ${email}`,
      email,
      voterIdNumber: voterId,
      otpCode,
      expiresAt,
      expiresInSeconds: expiresInMinutes * 60,
      deliveredExternally: externalSent,
      dispatchMethod,
    });
  } catch (err: any) {
    console.error("send-otp endpoint error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process OTP email dispatch.",
    });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[Server] E-Voting Relayer API running on http://localhost:${PORT}`);
  });
}

export default app;
