import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

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

    // If RESEND_API_KEY or SMTP configured, attempt external dispatch
    const resendApiKey = process.env.RESEND_API_KEY;
    let externalSent = false;

    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "VOTEX Security <noreply@votex-election.org>",
            to: [email],
            subject: `Your VOTEX E-Voting Login Code: ${otpCode}`,
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 500px; margin: auto;">
                <h2 style="color: #38bdf8; margin-bottom: 8px;">VOTEX E-Voting Security Code</h2>
                <p style="color: #94a3b8; font-size: 14px;">Hello <strong>${recipientName}</strong> (${voterId}),</p>
                <p style="color: #94a3b8; font-size: 14px;">Your one-time verification code for the electronic voting portal is:</p>
                <div style="background-color: #1e293b; padding: 18px; text-align: center; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981; margin: 20px 0;">
                  ${otpCode}
                </div>
                <p style="color: #ef4444; font-size: 13px; font-weight: bold;">⏱️ This code will expire in ${expiresInMinutes} minutes.</p>
                <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #334155; padding-top: 12px;">
                  If you did not request this login code, please ignore this email. Zero-Knowledge Cryptographic E-Voting Platform.
                </p>
              </div>
            `,
          }),
        });
        if (response.ok) {
          externalSent = true;
          console.log(`[Resend API] Email successfully delivered to ${email}`);
        }
      } catch (emailErr) {
        console.warn("[Email Dispatch Warning] Could not send via Resend API:", emailErr);
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
