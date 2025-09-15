import { Request, Response, Router } from 'express';
import { db } from '../../db';
import { 
  dailyOutreachBatches, 
  dailyOutreachItems,
  userOutreachPreferences,
  companies,
  contacts,
  communicationHistory
} from '@shared/schema';
import { eq, and, gte, sql, desc, isNotNull, count } from 'drizzle-orm';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { requireAuth } from '../../utils/auth';

const router = Router();

// Get streak statistics
router.get('/streak-stats', requireAuth, async (req: Request, res: Response) => {
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

    // Get all days with emails sent for streak calculation from CRM history
    const allEmailDays = await db
      .select({
        date: sql<string>`DATE(${communicationHistory.sentAt})`,
        itemsSent: sql<number>`count(*)`.as('itemsSent')
      })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          isNotNull(communicationHistory.sentAt)
        )
      )
      .groupBy(sql`DATE(${communicationHistory.sentAt})`)
      .orderBy(sql`DATE(${communicationHistory.sentAt}) DESC`);

    // Calculate current streak based on email days
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const emailDay of allEmailDays) {
      if (emailDay.itemsSent > 0 && emailDay.date) {
        const emailDate = new Date(emailDay.date);
        
        if (!lastDate) {
          tempStreak = 1;
          if (differenceInDays(today, emailDate) <= 1) {
            currentStreak = 1;
          }
        } else {
          const daysDiff = differenceInDays(lastDate, emailDate);
          
          if (daysDiff === 1) {
            tempStreak++;
            if (differenceInDays(today, emailDate) <= tempStreak) {
              currentStreak = tempStreak;
            }
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        
        lastDate = emailDate;
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

    // Get emails sent statistics from CRM history
    const emailsSentToday = await db
      .select({ count: sql<number>`count(*)` })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          gte(communicationHistory.sentAt, todayStart),
          isNotNull(communicationHistory.sentAt)
        )
      );

    const emailsSentThisWeek = await db
      .select({ count: sql<number>`count(*)` })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          gte(communicationHistory.sentAt, weekStart),
          isNotNull(communicationHistory.sentAt)
        )
      );

    const emailsSentThisMonth = await db
      .select({ count: sql<number>`count(*)` })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          gte(communicationHistory.sentAt, monthStart),
          isNotNull(communicationHistory.sentAt)
        )
      );

    const emailsSentAllTime = await db
      .select({ count: sql<number>`count(*)` })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          isNotNull(communicationHistory.sentAt)
        )
      );

    // Get companies contacted statistics from CRM history
    const companiesContactedThisWeek = await db
      .select({ count: sql<number>`count(distinct ${communicationHistory.companyId})` })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          gte(communicationHistory.sentAt, weekStart),
          isNotNull(communicationHistory.sentAt)
        )
      );

    const companiesContactedThisMonth = await db
      .select({ count: sql<number>`count(distinct ${communicationHistory.companyId})` })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          gte(communicationHistory.sentAt, monthStart),
          isNotNull(communicationHistory.sentAt)
        )
      );

    const companiesContactedAllTime = await db
      .select({ count: sql<number>`count(distinct ${communicationHistory.companyId})` })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          isNotNull(communicationHistory.sentAt)
        )
      );

    // Calculate weekly progress (days with sent emails this week) from CRM history
    const daysWithEmailsThisWeek = await db
      .select({ 
        date: sql<string>`DATE(${communicationHistory.sentAt})`,
        count: sql<number>`count(*)` 
      })
      .from(communicationHistory)
      .where(
        and(
          eq(communicationHistory.userId, userId),
          eq(communicationHistory.channel, 'email'),
          eq(communicationHistory.direction, 'outbound'),
          gte(communicationHistory.sentAt, weekStart),
          isNotNull(communicationHistory.sentAt)
        )
      )
      .groupBy(sql`DATE(${communicationHistory.sentAt})`);

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

// Get weekly activity data for streak row
router.get('/weekly-activity', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if all days should be returned
    const allDays = req.query.allDays === 'true';
    
    // Parse weekOffset parameter (default to 0 for current week)
    const weekOffset = parseInt(req.query.weekOffset as string) || 0;

    const today = new Date();
    // Calculate the target week based on offset
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (weekOffset * 7));
    
    // Use Sunday as week start when showing all days, Monday otherwise
    const weekStart = startOfWeek(targetDate, { weekStartsOn: allDays ? 0 : 1 });
    
    // Get user preferences for scheduled days
    const [preferences] = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.userId, userId));

    const scheduleDays = preferences?.scheduleDays || ['mon', 'tue', 'wed'];
    const targetDailyThreshold = 5; // Default threshold for "goal reached"

    // Configure days based on allDays parameter
    const daysOfWeek = allDays 
      ? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      : ['mon', 'tue', 'wed', 'thu', 'fri'];
    
    const dayNames = allDays
      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    // Adjust starting index based on whether we're showing all days
    const startIndex = allDays ? 0 : 1;
    const numDays = allDays ? 7 : 5;

    // Get email counts for each day of this week
    const dayActivity = [];
    
    for (let i = 0; i < numDays; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + (allDays ? i : i + 1)); // If Monday start, add 1 to skip Sunday
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);
      
      // Get email count for this day
      const [emailCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(communicationHistory)
        .where(
          and(
            eq(communicationHistory.userId, userId),
            eq(communicationHistory.channel, 'email'),
            eq(communicationHistory.direction, 'outbound'),
            gte(communicationHistory.sentAt, dayStart),
            sql`${communicationHistory.sentAt} <= ${dayEnd}`,
            isNotNull(communicationHistory.sentAt)
          )
        );
      
      dayActivity.push({
        date: currentDate.toISOString(),
        dayOfWeek: dayNames[i],
        emailsSent: emailCount?.count || 0,
        isScheduledDay: scheduleDays.includes(daysOfWeek[i])
      });
    }

    res.json({
      dayActivity,
      scheduleDays,
      targetDailyThreshold,
      weekStartDate: weekStart.toISOString()
    });
  } catch (error) {
    console.error('Error fetching weekly activity:', error);
    res.status(500).json({ error: 'Failed to fetch weekly activity' });
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