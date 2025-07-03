import { pgTable, text, serial, integer, bigint, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  youtubeId: text("youtube_id").unique(),
  oauthToken: text("oauth_token"), // Encrypted
  refreshToken: text("refresh_token"), // Encrypted
  subscriptionStatus: text("subscription_status").default("none"), // "none", "active", "cancelled"
  subscriptionTier: text("subscription_tier"), // "pro", "authority"
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: bigint("expires_at", { mode: "number" }),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id").notNull(),
  expires: timestamp("expires").notNull(),
});

export const tests = pgTable("tests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title"),
  rotationIntervalMinutes: integer("rotation_interval_minutes").notNull(),
  status: text("status").notNull().default("pending"), // "pending", "active", "paused", "completed", "cancelled"
  winnerMetric: text("winner_metric").notNull().default("ctr"), // "ctr", "views", "combined"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  currentTitleIndex: integer("current_title_index").notNull().default(0), // Current active title index
});

export const titles = pgTable("titles", {
  id: text("id").primaryKey(),
  testId: text("test_id").notNull(),
  text: text("text").notNull(),
  order: integer("order").notNull(), // Rotation order (0, 1, 2...)
  activatedAt: timestamp("activated_at"),
});

export const analyticsPolls = pgTable("analytics_polls", {
  id: text("id").primaryKey(),
  titleId: text("title_id").notNull(),
  polledAt: timestamp("polled_at").defaultNow().notNull(),
  views: integer("views").notNull(),
  impressions: integer("impressions").notNull(),
  ctr: real("ctr").notNull(),
  averageViewDuration: integer("average_view_duration").notNull(), // Seconds
});

export const titleSummaries = pgTable("title_summaries", {
  id: text("id").primaryKey(),
  titleId: text("title_id").notNull().unique(),
  totalViews: integer("total_views").notNull(),
  totalImpressions: integer("total_impressions").notNull(),
  finalCtr: real("final_ctr").notNull(),
  finalAvd: integer("final_avd").notNull(), // Average View Duration
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const testRotationLogs = pgTable("test_rotation_logs", {
  id: text("id").primaryKey(),
  testId: text("test_id").notNull(),
  titleId: text("title_id").notNull(),
  titleText: text("title_text").notNull(),
  rotatedAt: timestamp("rotated_at").defaultNow().notNull(),
  rotationOrder: integer("rotation_order").notNull(),
  durationMinutes: integer("duration_minutes"), // How long this title was active
  viewsAtRotation: integer("views_at_rotation").default(0),
  ctrAtRotation: real("ctr_at_rotation").default(0),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tests: many(tests),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const testsRelations = relations(tests, ({ one, many }) => ({
  user: one(users, { fields: [tests.userId], references: [users.id] }),
  titles: many(titles),
}));

export const titlesRelations = relations(titles, ({ one, many }) => ({
  test: one(tests, { fields: [titles.testId], references: [tests.id] }),
  analyticsPolls: many(analyticsPolls),
  summary: one(titleSummaries, { fields: [titles.id], references: [titleSummaries.titleId] }),
}));

export const analyticsPollsRelations = relations(analyticsPolls, ({ one }) => ({
  title: one(titles, { fields: [analyticsPolls.titleId], references: [titles.id] }),
}));

export const titleSummariesRelations = relations(titleSummaries, ({ one }) => ({
  title: one(titles, { fields: [titleSummaries.titleId], references: [titles.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertTestSchema = createInsertSchema(tests).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertTitleSchema = createInsertSchema(titles).omit({
  id: true,
  activatedAt: true,
});

export const insertAnalyticsPollSchema = createInsertSchema(analyticsPolls).omit({
  id: true,
  polledAt: true,
});

export const insertTitleSummarySchema = createInsertSchema(titleSummaries).omit({
  id: true,
  completedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;

export type Test = typeof tests.$inferSelect;
export type InsertTest = z.infer<typeof insertTestSchema>;

export type Title = typeof titles.$inferSelect;
export type InsertTitle = z.infer<typeof insertTitleSchema>;

export type AnalyticsPoll = typeof analyticsPolls.$inferSelect;
export type InsertAnalyticsPoll = z.infer<typeof insertAnalyticsPollSchema>;

export type TitleSummary = typeof titleSummaries.$inferSelect;
export type InsertTitleSummary = z.infer<typeof insertTitleSummarySchema>;
