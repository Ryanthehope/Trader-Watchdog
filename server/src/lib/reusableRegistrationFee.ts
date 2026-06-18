import { prisma } from "../db.js";

export async function findReusableRegistrationFeePaidAt(
  email: string,
  excludeApplicationId?: string
) {
  const prior = await prisma.application.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      status: "DECLINED",
      registrationFeePaidAt: { not: null },
      createdMemberId: null,
      ...(excludeApplicationId
        ? { id: { not: excludeApplicationId } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { registrationFeePaidAt: true },
  });

  return prior?.registrationFeePaidAt ?? null;
}

export async function ensureReusableRegistrationFeeForApplication(
  applicationId: string
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
  });

  if (!application) return null;
  if (application.registrationFeePaidAt) return application;
  if (application.status === "DECLINED") return application;
  if (application.createdMemberId) return application;

  const reusableRegistrationFeePaidAt = await findReusableRegistrationFeePaidAt(
    application.email,
    application.id
  );
  if (!reusableRegistrationFeePaidAt) return application;

  return prisma.application.update({
    where: { id: application.id },
    data: { registrationFeePaidAt: reusableRegistrationFeePaidAt },
  });
}