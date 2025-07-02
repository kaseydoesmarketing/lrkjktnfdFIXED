import { 
  users, tests, titles, analyticsPolls, titleSummaries, accounts, sessions,
  type User, type InsertUser, type Test, type InsertTest, type Title, type InsertTitle,
  type AnalyticsPoll, type InsertAnalyticsPoll, type TitleSummary, type InsertTitleSummary,
  type Account, type Session
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User>;
  
  // Accounts
  createAccount(account: Omit<Account, 'id'>): Promise<Account>;
  getAccountByProvider(provider: string, providerAccountId: string): Promise<Account | undefined>;
  getAccountByUserId(userId: string, provider: string): Promise<Account | undefined>;
  updateAccountTokens(accountId: string, tokens: { accessToken: string; refreshToken: string; expiresAt: number | null; }): Promise<Account>;
  
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
  
  // Analytics
  createAnalyticsPoll(poll: InsertAnalyticsPoll): Promise<AnalyticsPoll>;
  getAnalyticsPollsByTitleId(titleId: string): Promise<AnalyticsPoll[]>;
  
  // Summaries
  createTitleSummary(summary: InsertTitleSummary): Promise<TitleSummary>;
  getTitleSummaryByTitleId(titleId: string): Promise<TitleSummary | undefined>;
  getTitleSummariesByTestId(testId: string): Promise<TitleSummary[]>;
  
  // Subscription methods
  updateUserSubscription(userId: string, status: string, tier: string | null): Promise<User>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  
  // Admin methods
  getAllUsers(): Promise<User[]>;
  getAllTests(): Promise<Test[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
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

  async getAccountByUserId(userId: string, provider: string): Promise<Account | undefined> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.provider, provider)));
    return account || undefined;
  }

  async updateAccountTokens(accountId: string, tokens: { 
    accessToken: string; 
    refreshToken: string; 
    expiresAt: number | null; 
  }): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      })
      .where(eq(accounts.id, accountId))
      .returning();
    return account;
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
}

export const storage = new DatabaseStorage();
