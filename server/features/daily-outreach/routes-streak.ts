import { Request, Response, Router } from 'express';
import { db } from '../../db';
import { 
  dailyOutreachBatches, 
  dailyOutreachItems,
  userOutreachPreferences,
  companies,
  contacts
} from '@shared/schema';
import { eq, and, gte, sql, desc, isNotNull, count } from 'drizzle-orm';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, differenceInDays } from 'date-fns';

const router = Router();

// Get streak statistics
router.get('/streak-stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Get user preferences for weekly goal
    const [preferences] = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.userId, userId));

    const weeklyGoal = preferences?.scheduleDays?.length || 3;

    // Get all batches for streak calculation
    const allBatches = await db
      .select({
        createdAt: dailyOutreachBatches.createdAt,
        itemsSent: sql<number>`
          (SELECT COUNT(*) 
           FROM ${dailyOutreachItems} 
           WHERE ${dailyOutreachItems.batchId} = ${dailyOutreachBatches.id} 
           AND ${dailyOutreachItems.sentAt} IS NOT NULL)
        `.as('itemsSent')
      })
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.userId, userId))
      .orderBy(desc(dailyOutreachBatches.createdAt));

    // Calculate current streak
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const batch of allBatches) {
      if (batch.itemsSent > 0 && batch.createdAt) {
        const batchDate = new Date(batch.createdAt);
        
        if (!lastDate) {
          tempStreak = 1;
          if (differenceInDays(today, batchDate) <= 1) {
            currentStreak = 1;
          }
        } else {
          const daysDiff = differenceInDays(lastDate, batchDate);
          
          if (daysDiff === 1) {
            tempStreak++;
            if (differenceInDays(today, batchDate) <= tempStreak) {
              currentStreak = tempStreak;
            }
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        
        lastDate = batchDate;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Get today's batch if exists
    const [todaysBatch] = await db
      .select({
        id: dailyOutreachBatches.id,
        token: dailyOutreachBatches.secureToken,
        createdAt: dailyOutreachBatches.createdAt
      })
      .from(dailyOutreachBatches)
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          gte(dailyOutreachBatches.createdAt, todayStart)
        )
      )
      .orderBy(desc(dailyOutreachBatches.createdAt))
      .limit(1);
    
    // Get the actual item count separately if batch exists
    let itemCount = 0;
    if (todaysBatch) {
      const [countResult] = await db
        .select({ count: count() })
        .from(dailyOutreachItems)
        .where(eq(dailyOutreachItems.batchId, todaysBatch.id));
      
      itemCount = Number(countResult?.count || 0);
      
      // Add itemCount to the batch object
      (todaysBatch as any).itemCount = itemCount;
    }
    
    // Debug logging
    console.log('[Streak Stats] Today\'s batch for user', userId, ':', {
      found: !!todaysBatch,
      batchId: todaysBatch?.id,
      token: todaysBatch?.token?.substring(0, 8) + '...',
      itemCount: itemCount,
      todayStart: todayStart.toISOString(),
      createdAt: todaysBatch?.createdAt
    });

    // Get available companies and contacts count
    const availableCompaniesResult = await db
      .select({ count: sql<number>`count(distinct ${companies.id})` })
      .from(companies)
      .innerJoin(contacts, eq(contacts.companyId, companies.id))
      .where(
        and(
          eq(companies.userId, userId),
          isNotNull(contacts.email)
        )
      );

    const availableContactsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .innerJoin(companies, eq(companies.id, contacts.companyId))
      .where(
        and(
          eq(companies.userId, userId),
          isNotNull(contacts.email)
        )
      );

    // Get emails sent statistics
    const emailsSentToday = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachBatches.id, dailyOutreachItems.batchId))
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          gte(dailyOutreachItems.sentAt, todayStart),
          isNotNull(dailyOutreachItems.sentAt)
        )
      );

    const emailsSentThisWeek = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachBatches.id, dailyOutreachItems.batchId))
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          gte(dailyOutreachItems.sentAt, weekStart),
          isNotNull(dailyOutreachItems.sentAt)
        )
      );

    const emailsSentThisMonth = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachBatches.id, dailyOutreachItems.batchId))
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          gte(dailyOutreachItems.sentAt, monthStart),
          isNotNull(dailyOutreachItems.sentAt)
        )
      );

    const emailsSentAllTime = await db
      .select({ count: sql<number>`count(*)` })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachBatches.id, dailyOutreachItems.batchId))
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          isNotNull(dailyOutreachItems.sentAt)
        )
      );

    // Get companies contacted statistics
    const companiesContactedThisWeek = await db
      .select({ count: sql<number>`count(distinct ${dailyOutreachItems.companyId})` })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachBatches.id, dailyOutreachItems.batchId))
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          gte(dailyOutreachItems.sentAt, weekStart),
          isNotNull(dailyOutreachItems.sentAt)
        )
      );

    const companiesContactedThisMonth = await db
      .select({ count: sql<number>`count(distinct ${dailyOutreachItems.companyId})` })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachBatches.id, dailyOutreachItems.batchId))
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          gte(dailyOutreachItems.sentAt, monthStart),
          isNotNull(dailyOutreachItems.sentAt)
        )
      );

    const companiesContactedAllTime = await db
      .select({ count: sql<number>`count(distinct ${dailyOutreachItems.companyId})` })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachBatches.id, dailyOutreachItems.batchId))
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          isNotNull(dailyOutreachItems.sentAt)
        )
      );

    // Calculate weekly progress (days with sent emails this week)
    const daysWithEmailsThisWeek = await db
      .select({ 
        date: sql<string>`DATE(${dailyOutreachItems.sentAt})`,
        count: sql<number>`count(*)` 
      })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachBatches.id, dailyOutreachItems.batchId))
      .where(
        and(
          eq(dailyOutreachBatches.userId, userId),
          gte(dailyOutreachItems.sentAt, weekStart),
          isNotNull(dailyOutreachItems.sentAt)
        )
      )
      .groupBy(sql`DATE(${dailyOutreachItems.sentAt})`);

    const weeklyProgress = daysWithEmailsThisWeek.length;

    res.json({
      currentStreak,
      longestStreak,
      weeklyGoal,
      weeklyProgress,
      availableCompanies: availableCompaniesResult[0]?.count || 0,
      availableContacts: availableContactsResult[0]?.count || 0,
      emailsSentToday: emailsSentToday[0]?.count || 0,
      emailsSentThisWeek: emailsSentThisWeek[0]?.count || 0,
      emailsSentThisMonth: emailsSentThisMonth[0]?.count || 0,
      emailsSentAllTime: emailsSentAllTime[0]?.count || 0,
      companiesContactedThisWeek: companiesContactedThisWeek[0]?.count || 0,
      companiesContactedThisMonth: companiesContactedThisMonth[0]?.count || 0,
      companiesContactedAllTime: companiesContactedAllTime[0]?.count || 0,
      todaysBatch: todaysBatch || undefined
    });
  } catch (error) {
    console.error('Error fetching streak stats:', error);
    res.status(500).json({ error: 'Failed to fetch streak statistics' });
  }
});

// Update vacation mode settings
router.put('/vacation', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { isOnVacation, vacationStartDate, vacationEndDate } = req.body;

    // Update or insert vacation settings in preferences
    const existingPrefs = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.userId, userId))
      .limit(1);

    if (existingPrefs.length > 0) {
      await db
        .update(userOutreachPreferences)
        .set({
          enabled: existingPrefs[0].enabled,
          updatedAt: new Date()
        })
        .where(eq(userOutreachPreferences.userId, userId));
    } else {
      await db
        .insert(userOutreachPreferences)
        .values({
          userId,
          enabled: true
        });
    }

    res.json({ 
      success: true, 
      message: isOnVacation ? 'Vacation mode activated' : 'Vacation mode deactivated' 
    });
  } catch (error) {
    console.error('Error updating vacation mode:', error);
    res.status(500).json({ error: 'Failed to update vacation mode' });
  }
});

export default router;