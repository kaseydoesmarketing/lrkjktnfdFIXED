import { 
  users, tests, titles, analyticsPolls, titleSummaries, accounts, sessions, testRotationLogs,
  type User, type InsertUser, type Test, type InsertTest, type Title, type InsertTitle,
  type AnalyticsPoll, type InsertAnalyticsPoll, type TitleSummary, type InsertTitleSummary,
  type Account, type Session
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { nanoid } from "nanoid";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  updateUserYouTubeTokens(userId: string, tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    youtubeChannelId: string;
    youtubeChannelTitle: string | null;
  }): Promise<void>;
  updateUserLogin(userId: string): Promise<void>;
  hasYouTubeChannel(userId: string): Promise<boolean>;
  
  // Accounts
  createAccount(account: Omit<Account, 'id'>): Promise<Account>;
  getAccountByProvider(provider: string, providerAccountId: string): Promise<Account | undefined>;
  getAccountByUserId(userId: string, provider: string): Promise<Account | undefined>;
  updateAccountTokens(accountId: string, tokens: { 
    accessToken: string; 
    refreshToken: string | null; 
    expiresAt?: number | null;
    youtubeChannelId?: string;
    youtubeChannelTitle?: string | null;
    youtubeChannelThumbnail?: string | null;
  }): Promise<Account>;
  
  // Sessions
  createSession(session: Omit<Session, 'id'>): Promise<Session>;
  getSession(sessionToken: string): Promise<Session | undefined>;
  deleteSession(sessionToken: string): Promise<void>;
  
  // Tests
  getTestsByUserId(userId: string): Promise<Test[]>;
  getTest(id: string): Promise<Test | undefined>;
  createTest(test: InsertTest): Promise<Test>;
  updateTestStatus(id: string, status: string): Promise<Test>;
  updateTest(id: string, updates: Partial<Test>): Promise<Test>;
  deleteTest(id: string): Promise<void>;
  
  // Titles
  getTitlesByTestId(testId: string): Promise<Title[]>;
  getTitle(id: string): Promise<Title | undefined>;
  createTitle(title: InsertTitle): Promise<Title>;
  updateTitleActivation(id: string, activatedAt: Date): Promise<Title>;
  deleteTitlesByTestId(testId: string): Promise<void>;
  
  // Analytics
  createAnalyticsPoll(poll: InsertAnalyticsPoll): Promise<AnalyticsPoll>;
  getAnalyticsPollsByTitleId(titleId: string): Promise<AnalyticsPoll[]>;
  deleteAnalyticsPollsByTitleId(titleId: string): Promise<void>;
  
  // Summaries
  createTitleSummary(summary: InsertTitleSummary): Promise<TitleSummary>;
  getTitleSummaryByTitleId(titleId: string): Promise<TitleSummary | undefined>;
  getTitleSummariesByTestId(testId: string): Promise<TitleSummary[]>;
  deleteTitleSummary(titleId: string): Promise<void>;
  
  // Subscription methods
  updateUserSubscription(userId: string, status: string, tier: string | null): Promise<User>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  
  // Admin methods
  getAllUsers(): Promise<User[]>;
  
  // Temporary OAuth storage
  saveTempTokens(userId: string, data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    channels: any[];
  }): Promise<void>;
  getTempTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    channels: any[];
  } | null>;
  deleteTempTokens(userId: string): Promise<void>;
  
  // Account OAuth updates
  upsertAccount(userId: string, data: {
    accessToken: string;
    refreshToken: string;
    youtubeChannelId: string;
    youtubeChannelTitle: string;
    expiresAt: number;
  }): Promise<void>;
  getAllTests(): Promise<Test[]>;
  
  // Scheduler methods
  getActiveTests(): Promise<Test[]>;
  updateTestCurrentTitle(testId: string, newIndex: number): Promise<void>;
  logRotationEvent(testId: string, titleId: string, titleText: string, rotatedAt: Date, titleOrder: number): Promise<void>;
  isValidSession(expires: Date): boolean;
  
  // Winner selection
  determineTestWinner(testId: string): Promise<string | null>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return user || undefined;
    } catch (error) {
      console.error('getUserByEmail error:', error);
      throw error;
    }
  }



  async createUser(insertUser: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, id })
      .returning();
    return user;
  }

  async updateUser(id: string, updateUser: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(updateUser)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async updateUserYouTubeTokens(userId: string, tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    youtubeChannelId: string;
    youtubeChannelTitle: string | null;
  }): Promise<void> {
    await db
      .update(users)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        youtubeChannelId: tokens.youtubeChannelId,
        youtubeChannelTitle: tokens.youtubeChannelTitle,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  async updateUserLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async hasYouTubeChannel(userId: string): Promise<boolean> {
    const account = await this.getAccountByUserId(userId, 'google');
    return !!(account && account.youtubeChannelId);
  }

  // Accounts
  async createAccount(account: Omit<Account, 'id'>): Promise<Account> {
    const id = crypto.randomUUID();
    const [newAccount] = await db
      .insert(accounts)
      .values({ ...account, id })
      .returning();
    return newAccount;
  }

  async getAccountByProvider(provider: string, providerAccountId: string): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.provider, provider), eq(accounts.providerAccountId, providerAccountId)));
    return account || undefined;
  }

  async getAccountByUserId(userId: string, provider: string = 'google'): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)))
      .limit(1);
    return account || undefined;
  }

  async updateAccountTokens(accountId: string, tokens: { 
    accessToken: string; 
    refreshToken: string | null; 
    expiresAt?: number | null;
    youtubeChannelId?: string;
    youtubeChannelTitle?: string | null;
    youtubeChannelThumbnail?: string | null;
  }): Promise<Account> {
    const updateData: any = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };
    
    if (tokens.expiresAt !== undefined) {
      updateData.expiresAt = tokens.expiresAt;
    }
    
    if (tokens.youtubeChannelId !== undefined) {
      updateData.youtubeChannelId = tokens.youtubeChannelId;
    }
    
    if (tokens.youtubeChannelTitle !== undefined) {
      updateData.youtubeChannelTitle = tokens.youtubeChannelTitle;
    }
    
    if (tokens.youtubeChannelThumbnail !== undefined) {
      updateData.youtubeChannelThumbnail = tokens.youtubeChannelThumbnail;
    }
    
    const [account] = await db
      .update(accounts)
      .set(updateData)
      .where(eq(accounts.id, accountId))
      .returning();
    return account;
  }

  async updateUserTokens(userId: string, tokens: {
    oauthToken: string;
    refreshToken: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        oauthToken: tokens.oauthToken,
        refreshToken: tokens.refreshToken
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Sessions
  async createSession(session: Omit<Session, 'id'>): Promise<Session> {
    const id = crypto.randomUUID();
    const [newSession] = await db
      .insert(sessions)
      .values({ ...session, id })
      .returning();
    return newSession;
  }

  async getSession(sessionToken: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken));
    return session || undefined;
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
  }

  // Tests
  async getTestsByUserId(userId: string): Promise<Test[]> {
    return await db
      .select()
      .from(tests)
      .where(eq(tests.userId, userId))
      .orderBy(desc(tests.createdAt));
  }

  async getTest(id: string): Promise<Test | undefined> {
    const [test] = await db.select().from(tests).where(eq(tests.id, id));
    return test || undefined;
  }

  async createTest(insertTest: InsertTest): Promise<Test> {
    const id = crypto.randomUUID();
    const [test] = await db
      .insert(tests)
      .values({ ...insertTest, id })
      .returning();
    return test;
  }

  async updateTestStatus(id: string, status: string): Promise<Test> {
    const [test] = await db
      .update(tests)
      .set({ status })
      .where(eq(tests.id, id))
      .returning();
    return test;
  }

  async updateTest(id: string, updates: Partial<Test>): Promise<Test> {
    const [test] = await db
      .update(tests)
      .set(updates)
      .where(eq(tests.id, id))
      .returning();
    return test;
  }

  async deleteTest(id: string): Promise<void> {
    // Delete in order to respect foreign key constraints
    // First get all titles for this test
    const testTitles = await db.select().from(titles).where(eq(titles.testId, id));
    const titleIds = testTitles.map(t => t.id);
    
    // Delete analytics polls for all titles
    for (const titleId of titleIds) {
      await db.delete(analyticsPolls).where(eq(analyticsPolls.titleId, titleId));
    }
    
    // Delete title summaries for all titles
    for (const titleId of titleIds) {
      await db.delete(titleSummaries).where(eq(titleSummaries.titleId, titleId));
    }
    
    // Delete titles
    await db.delete(titles).where(eq(titles.testId, id));
    
    // Finally delete the test
    await db.delete(tests).where(eq(tests.id, id));
  }

  // Titles
  async getTitlesByTestId(testId: string): Promise<Title[]> {
    return await db
      .select()
      .from(titles)
      .where(eq(titles.testId, testId))
      .orderBy(titles.order);
  }

  async getTitle(id: string): Promise<Title | undefined> {
    const [title] = await db.select().from(titles).where(eq(titles.id, id));
    return title || undefined;
  }

  async createTitle(insertTitle: InsertTitle): Promise<Title> {
    const id = crypto.randomUUID();
    const [title] = await db
      .insert(titles)
      .values({ ...insertTitle, id })
      .returning();
    return title;
  }

  async updateTitleActivation(id: string, activatedAt: Date): Promise<Title> {
    const [title] = await db
      .update(titles)
      .set({ activatedAt })
      .where(eq(titles.id, id))
      .returning();
    return title;
  }

  async deleteTitlesByTestId(testId: string): Promise<void> {
    await db.delete(titles).where(eq(titles.testId, testId));
  }

  // Analytics
  async createAnalyticsPoll(insertPoll: InsertAnalyticsPoll): Promise<AnalyticsPoll> {
    const id = crypto.randomUUID();
    const [poll] = await db
      .insert(analyticsPolls)
      .values({ ...insertPoll, id })
      .returning();
    return poll;
  }

  async getAnalyticsPollsByTitleId(titleId: string): Promise<AnalyticsPoll[]> {
    return await db
      .select()
      .from(analyticsPolls)
      .where(eq(analyticsPolls.titleId, titleId))
      .orderBy(desc(analyticsPolls.polledAt));
  }

  async deleteAnalyticsPollsByTitleId(titleId: string): Promise<void> {
    await db.delete(analyticsPolls).where(eq(analyticsPolls.titleId, titleId));
  }

  // Summaries
  async createTitleSummary(insertSummary: InsertTitleSummary): Promise<TitleSummary> {
    const id = crypto.randomUUID();
    const [summary] = await db
      .insert(titleSummaries)
      .values({ ...insertSummary, id })
      .returning();
    return summary;
  }

  async getTitleSummaryByTitleId(titleId: string): Promise<TitleSummary | undefined> {
    const [summary] = await db
      .select()
      .from(titleSummaries)
      .where(eq(titleSummaries.titleId, titleId));
    return summary || undefined;
  }

  async getTitleSummariesByTestId(testId: string): Promise<TitleSummary[]> {
    return await db
      .select({
        id: titleSummaries.id,
        titleId: titleSummaries.titleId,
        totalViews: titleSummaries.totalViews,
        totalImpressions: titleSummaries.totalImpressions,
        finalCtr: titleSummaries.finalCtr,
        finalAvd: titleSummaries.finalAvd,
        completedAt: titleSummaries.completedAt,
      })
      .from(titleSummaries)
      .innerJoin(titles, eq(titleSummaries.titleId, titles.id))
      .where(eq(titles.testId, testId));
  }

  async deleteTitleSummary(titleId: string): Promise<void> {
    await db.delete(titleSummaries).where(eq(titleSummaries.titleId, titleId));
  }

  // Subscription management
  async updateUserSubscription(userId: string, status: string, tier: string | null): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        subscriptionStatus: status,
        subscriptionTier: tier
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserSubscription(userId: string): Promise<{ status: string | null, tier: string | null } | null> {
    const [user] = await db
      .select({
        subscriptionStatus: users.subscriptionStatus,
        subscriptionTier: users.subscriptionTier
      })
      .from(users)
      .where(eq(users.id, userId));
    
    return user ? {
      status: user.subscriptionStatus,
      tier: user.subscriptionTier
    } : null;
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllTests(): Promise<Test[]> {
    return await db.select().from(tests).orderBy(desc(tests.createdAt));
  }

  async getActiveTests(): Promise<Test[]> {
    return await db.select().from(tests).where(eq(tests.status, 'active'));
  }

  async updateTestCurrentTitle(testId: string, newIndex: number): Promise<void> {
    await db.update(tests)
      .set({
        currentTitleIndex: newIndex,
        lastRotationAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(tests.id, testId));
  }

  async logRotationEvent(testId: string, titleId: string, titleText: string, rotatedAt: Date, titleOrder: number): Promise<void> {
    await db.insert(testRotationLogs).values({
      id: nanoid(),
      testId,
      titleId,
      titleText,
      rotatedAt,
      rotationOrder: titleOrder
    });
  }

  isValidSession(expires: Date): boolean {
    return new Date() < expires;
  }

  async determineTestWinner(testId: string): Promise<string | null> {
    const test = await this.getTest(testId);
    if (!test) return null;

    const titleSummaries = await this.getTitleSummariesByTestId(testId);
    if (!titleSummaries.length) return null;

    let winningTitle: TitleSummary | null = null;

    // Determine winner based on the metric
    switch (test.winnerMetric) {
      case 'ctr':
        winningTitle = titleSummaries.reduce((prev, current) => 
          current.finalCtr > prev.finalCtr ? current : prev
        );
        break;
      
      case 'views':
        winningTitle = titleSummaries.reduce((prev, current) => 
          current.totalViews > prev.totalViews ? current : prev
        );
        break;
      
      case 'combined':
        // Combined metric: normalize CTR and views, then combine
        const maxCtr = Math.max(...titleSummaries.map(t => t.finalCtr));
        const maxViews = Math.max(...titleSummaries.map(t => t.totalViews));
        
        winningTitle = titleSummaries.reduce((prev, current) => {
          const prevScore = (prev.finalCtr / maxCtr) * 0.5 + (prev.totalViews / maxViews) * 0.5;
          const currentScore = (current.finalCtr / maxCtr) * 0.5 + (current.totalViews / maxViews) * 0.5;
          return currentScore > prevScore ? current : prev;
        });
        break;
    }

    if (winningTitle) {
      const title = await this.getTitle(winningTitle.titleId);
      return title?.text || null;
    }

    return null;
  }

  // Temporary OAuth storage implementation
  async saveTempTokens(userId: string, data: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    channels: any[];
  }): Promise<void> {
    await db.execute(sql`
      INSERT INTO temp_oauth (user_id, access_token, refresh_token, expires_at, channels)
      VALUES (${userId}, ${data.accessToken}, ${data.refreshToken}, ${data.expiresAt}, ${JSON.stringify(data.channels)})
      ON CONFLICT (user_id) 
      DO UPDATE SET
        access_token = ${data.accessToken},
        refresh_token = ${data.refreshToken},
        expires_at = ${data.expiresAt},
        channels = ${JSON.stringify(data.channels)},
        created_at = NOW()
    `);
  }

  async getTempTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    channels: any[];
  } | null> {
    const result = await db.execute(sql`
      SELECT access_token, refresh_token, expires_at, channels
      FROM temp_oauth
      WHERE user_id = ${userId}
    `);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      accessToken: row.access_token as string,
      refreshToken: row.refresh_token as string,
      expiresAt: row.expires_at as number,
      channels: row.channels as any[]
    };
  }

  async deleteTempTokens(userId: string): Promise<void> {
    await db.execute(sql`
      DELETE FROM temp_oauth WHERE user_id = ${userId}
    `);
  }

  async upsertAccount(userId: string, data: {
    accessToken: string;
    refreshToken: string;
    youtubeChannelId: string;
    youtubeChannelTitle: string;
    expiresAt: number;
  }): Promise<void> {
    // Check if account exists
    const existing = await this.getAccountByUserId(userId, 'google');
    
    if (existing) {
      // Update existing account
      await db.update(accounts)
        .set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          youtubeChannelId: data.youtubeChannelId,
          youtubeChannelTitle: data.youtubeChannelTitle,
          expiresAt: data.expiresAt,
          updatedAt: new Date()
        })
        .where(and(
          eq(accounts.userId, userId),
          eq(accounts.provider, 'google')
        ));
    } else {
      // Create new account
      await this.createAccount({
        userId,
        provider: 'google',
        providerAccountId: userId, // Using userId as provider account ID for simplicity
        type: 'oauth',
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        youtubeChannelId: data.youtubeChannelId,
        youtubeChannelTitle: data.youtubeChannelTitle,
        expiresAt: data.expiresAt,
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.force-ssl',
        idToken: null,
        sessionState: null,
        youtubeChannelThumbnail: null
      });
    }
  }
}

export const storage = new DatabaseStorage();
