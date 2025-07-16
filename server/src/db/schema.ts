import { pgTable, text, serial, integer, bigint, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  subscriptionStatus: text("subscription_status").default("free"),
  subscriptionTier: text("subscription_tier").default("free"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull().default("google"),
  type: text("type").notNull().default("oauth"),
  readAccessToken: text("read_access_token_encrypted"),
  readRefreshToken: text("read_refresh_token_encrypted"),
  writeAccessToken: text("write_access_token_encrypted"),
  writeRefreshToken: text("write_refresh_token_encrypted"),
  readTokenExpiresAt: timestamp("read_token_expires_at"),
  writeTokenExpiresAt: timestamp("write_token_expires_at"),
  youtubeChannelId: text("youtube_channel_id"),
  youtubeChannelTitle: text("youtube_channel_title"),
  youtubeChannelThumbnail: text("youtube_channel_thumbnail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tests = pgTable("tests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  videoId: text("video_id").notNull(),
  videoTitle: text("video_title"),
  rotationIntervalMinutes: integer("rotation_interval_minutes").notNull().default(1440),
  status: text("status").notNull().default("pending"),
  winnerMetric: text("winner_metric").notNull().default("ctr"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  currentTitleIndex: integer("current_title_index").notNull().default(0),
});

export const titles = pgTable("titles", {
  id: text("id").primaryKey(),
  testId: text("test_id").notNull(),
  text: text("text").notNull(),
  order: integer("order").notNull(),
  activatedAt: timestamp("activated_at"),
  isActive: boolean("is_active").default(false),
});

export const analyticsPolls = pgTable("analytics_polls", {
  id: text("id").primaryKey(),
  titleId: text("title_id").notNull(),
  polledAt: timestamp("polled_at").defaultNow().notNull(),
  views: integer("views").notNull(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull().default(0),
  ctr: real("ctr").notNull(),
  averageViewDuration: integer("average_view_duration").notNull(),
});

export const titleSummaries = pgTable("title_summaries", {
  id: text("id").primaryKey(),
  titleId: text("title_id").notNull().unique(),
  totalViews: integer("total_views").notNull(),
  totalImpressions: integer("total_impressions").notNull(),
  finalCtr: real("final_ctr").notNull(),
  finalAvd: integer("final_avd").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const quotaUsage = pgTable("quota_usage", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  operation: text("operation").notNull(),
  cost: integer("cost").notNull(),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const extensionConnections = pgTable("extension_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  extensionId: text("extension_id").notNull(),
  lastConnected: timestamp("last_connected").notNull(),
  status: text("status").notNull().default("disconnected"),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  tests: many(tests),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
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
