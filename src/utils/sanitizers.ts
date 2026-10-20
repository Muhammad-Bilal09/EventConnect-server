import { Role } from '@prisma/client';

// Strip confidential details based on recipient role
export function sanitizeUserForRole(targetUser: any, viewerRole: Role) {
  if (!targetUser) return null;
  
  const base = {
    id: targetUser.id,
    name: targetUser.name,
    role: targetUser.role,
    status: targetUser.status,
  };

  // ADMIN gets full access
  if (viewerRole === Role.ADMIN) {
    return {
      ...base,
      email: targetUser.email,
      clientProfile: targetUser.clientProfile,
      promoterProfile: targetUser.promoterProfile,
    };
  }

  // PROMOTER viewing CLIENT details
  if (targetUser.role === Role.CLIENT) {
    return {
      ...base,
      clientProfile: targetUser.clientProfile ? {
        id: targetUser.clientProfile.id,
        company: targetUser.clientProfile.company,
        // Exclude phone, email, notes!
      } : null,
    };
  }

  // CLIENT viewing PROMOTER details
  if (targetUser.role === Role.PROMOTER) {
    return {
      ...base,
      promoterProfile: targetUser.promoterProfile ? {
        id: targetUser.promoterProfile.id,
        photoUrl: targetUser.promoterProfile.photoUrl,
        rating: targetUser.promoterProfile.rating,
        skills: targetUser.promoterProfile.skills,
        experience: targetUser.promoterProfile.experience,
        // Exclude phone, email!
      } : null,
    };
  }

  return base;
}

export function sanitizeEventForRole(event: any, viewerRole: Role) {
  if (!event) return null;

  const sanitizedClient = event.client ? {
    id: event.client.id,
    company: event.client.company,
    user: sanitizeUserForRole(event.client.user, viewerRole),
  } : null;

  const sanitizedPromoters = event.assignedPromoters?.map((ap: any) => ({
    id: ap.id,
    assignedAt: ap.assignedAt,
    status: ap.status,
    promoter: {
      id: ap.promoter.id,
      photoUrl: ap.promoter.photoUrl,
      rating: ap.promoter.rating,
      skills: ap.promoter.skills,
      user: sanitizeUserForRole(ap.promoter.user, viewerRole),
    },
  }));

  return {
    ...event,
    client: sanitizedClient,
    assignedPromoters: sanitizedPromoters,
  };
}
