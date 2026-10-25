// ============================================================
// MOT DE PASSE OUBLIÉ — code à 6 chiffres par e-mail ou SMS
// (accepte { identifier, channel } ; l'ancien format { email } / { phone } reste valide)
// ============================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hashMailCode = (userId: number, code: string) =>
  createHash("sha256").update(`mail:${userId}:${code}`).digest("hex");

async function findResetUser(identifier: string) {
  const value = identifier.trim();
  if (EMAIL_RE.test(value)) {
    return prisma.user.findFirst({
      where: { email: { equals: value, mode: "insensitive" }, status: "ACTIVE" },
      select: { id: true, email: true, phone: true },
    });
  }
  const byPhone = await findActiveUserByPhone(value);
  if (!byPhone) return null;
  return prisma.user.findUnique({ where: { id: byPhone.id }, select: { id: true, email: true, phone: true } });
}

export async function forgotPassword(req: Request, res: Response): Promise<Response> {
  const generic = { success: true, message: "Si ce compte existe, un code de vérification vient d'être envoyé." };
  try {
    const identifier = String(req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? "").trim();
    const isEmail = EMAIL_RE.test(identifier);

    if (!identifier || identifier.length > 254 || (!isEmail && !normalizePhone(identifier))) {
      return res.status(400).json({ success: false, message: isEmail || !identifier ? "Adresse e-mail invalide." : "Numéro de téléphone invalide." });
    }

    const channel: "email" | "sms" = isEmail
      ? (req.body?.channel === "sms" ? "sms" : "email")
      : "sms";

    if (channel === "email" && !isEmailConfigured()) {
      return res.status(503).json({ success: false, code: "EMAIL_DELIVERY_UNAVAILABLE", message: "L'envoi d'e-mail n'est pas configuré (RESEND_API_KEY / RESET_EMAIL_FROM). Contactez l'administrateur." });
    }
    if (channel === "sms" && !isSmsConfigured()) {
      return res.status(503).json({ success: false, code: "SMS_DELIVERY_UNAVAILABLE", message: "L'envoi de SMS n'est pas configuré. Contactez l'administrateur." });
    }

    const user = await findResetUser(identifier);
    // Réponse identique : on ne révèle pas l'existence d'un compte.
    if (!user) return res.status(200).json(generic);

    const recent = await prisma.passwordResetToken.count({
      where: { userId: user.id, expiresAt: { gt: new Date(Date.now() - 50 * 60 * 1000) } },
    });
    if (recent >= 4) {
      return res.status(429).json({ success: false, message: "Trop de demandes. Réessayez dans une heure." });
    }

    const code = String(randomInt(100000, 1000000));
    const tokenHash = channel === "email" ? hashMailCode(user.id, code) : hashSmsCode(user.id, code);

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });

    let sent = false;
    if (channel === "email") {
      sent = await sendEmail(
        String(user.email),
        "Votre code de vérification — Ndao Hifanosika",
        `Votre code de vérification est : ${code}\n\nIl expire dans 10 minutes. Ne le partagez jamais.\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
      );
    } else if (user.phone) {
      sent = await sendSms(
        String(user.phone),
        `Ndao Hifanosika : votre code de verification est ${code}. Il expire dans 10 minutes. Ne le partagez jamais.`,
      );
    }

    if (!sent) {
      await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      return res.status(503).json({
        success: false,
        code: channel === "email" ? "EMAIL_DELIVERY_UNAVAILABLE" : "SMS_DELIVERY_UNAVAILABLE",
        message: channel === "email"
          ? "L'e-mail n'a pas pu être envoyé. Vérifiez la configuration Resend ou réessayez plus tard."
          : "Le SMS n'a pas pu être envoyé (aucun numéro enregistré ou service indisponible).",
      });
    }

    return res.status(200).json(generic);
  } catch (error) {
    logger.error("Erreur lors de la demande de réinitialisation.", error);
    return sendError(res, error, "Erreur interne du serveur.");
  }
}

export async function verifyResetCode(req: Request, res: Response): Promise<Response> {
  try {
    const identifier = String(req.body?.identifier ?? req.body?.email ?? req.body?.phone ?? "").trim();
    const code = String(req.body?.code ?? "").trim();

    if (identifier && code) {
      const invalid = { success: false, message: "Code incorrect ou expiré." };
      if (!/^\d{6}$/.test(code)) return res.status(400).json(invalid);

      const user = await findResetUser(identifier);
      if (!user) return res.status(400).json(invalid);

      const record = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { expiresAt: "desc" },
      });
      if (!record || record.attempts >= 5) return res.status(400).json(invalid);

      if (record.tokenHash !== hashMailCode(user.id, code) && record.tokenHash !== hashSmsCode(user.id, code)) {
        await prisma.passwordResetToken.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
        return res.status(400).json(invalid);
      }

      const rawToken = randomBytes(32).toString("hex");
      await prisma.$transaction([
        prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hashResetToken(rawToken), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
        }),
      ]);

      return res.status(200).json({ success: true, token: rawToken, data: { resetToken: rawToken }, message: "Code vérifié." });
    }

    // Ancien format : vérification d'un jeton de lien
    const token = String(req.body?.token || "");
    if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ success: false, message: "Code incorrect ou expiré." });
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date() || record.attempts >= 5) {
      return res.status(400).json({ success: false, message: "Lien de réinitialisation invalide ou expiré." });
    }
    return res.status(200).json({ success: true, message: "Lien de réinitialisation valide." });
  } catch (error) {
    logger.error("Erreur lors de la vérification du code de réinitialisation.", error);
    return sendError(res, error, "Erreur interne du serveur.");
  }
}

