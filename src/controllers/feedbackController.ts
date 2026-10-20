import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';

export const submitRating = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, toUserId, rating, feedback, categories } = req.body;
    const fromUserId = req.user!.id;

    if (!eventId || !toUserId || !rating) {
      return res.status(400).json({ error: 'Event ID, target user ID, and star rating (1-5) are required.' });
    }

    const numericRating = parseInt(rating);
    if (numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }

    const ratingRecord = await prisma.rating.create({
      data: {
        eventId,
        fromUserId,
        toUserId,
        rating: numericRating,
        feedback: feedback || '',
        categories: categories ? JSON.stringify(categories) : null,
      }
    });

    // Update target promoter average rating if target is a promoter
    const targetPromoter = await prisma.promoter.findUnique({ where: { userId: toUserId } });
    if (targetPromoter) {
      const allPromoterRatings = await prisma.rating.findMany({
        where: { toUserId }
      });
      const avg = allPromoterRatings.reduce((sum, r) => sum + r.rating, 0) / allPromoterRatings.length;
      await prisma.promoter.update({
        where: { id: targetPromoter.id },
        data: {
          rating: parseFloat(avg.toFixed(1)),
          ratingCount: allPromoterRatings.length,
        }
      });
    }

    return res.status(201).json(ratingRecord);
  } catch (error: any) {
    console.error('Submit rating error:', error);
    return res.status(500).json({ error: 'Failed to submit feedback.' });
  }
};
