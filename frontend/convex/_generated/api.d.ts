/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analysisEvents from "../analysisEvents.js";
import type * as analysisRequests from "../analysisRequests.js";
import type * as auth from "../auth.js";
import type * as autoAssign from "../autoAssign.js";
import type * as engine from "../engine.js";
import type * as engineJobs from "../engineJobs.js";
import type * as engineLogs from "../engineLogs.js";
import type * as engineProfiles from "../engineProfiles.js";
import type * as http from "../http.js";
import type * as keyboardShortcuts from "../keyboardShortcuts.js";
import type * as matchSummaries from "../matchSummaries.js";
import type * as matches from "../matches.js";
import type * as migrations from "../migrations.js";
import type * as notifications from "../notifications.js";
import type * as positionProfiles from "../positionProfiles.js";
import type * as ratings from "../ratings.js";
import type * as savedFilters from "../savedFilters.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analysisEvents: typeof analysisEvents;
  analysisRequests: typeof analysisRequests;
  auth: typeof auth;
  autoAssign: typeof autoAssign;
  engine: typeof engine;
  engineJobs: typeof engineJobs;
  engineLogs: typeof engineLogs;
  engineProfiles: typeof engineProfiles;
  http: typeof http;
  keyboardShortcuts: typeof keyboardShortcuts;
  matchSummaries: typeof matchSummaries;
  matches: typeof matches;
  migrations: typeof migrations;
  notifications: typeof notifications;
  positionProfiles: typeof positionProfiles;
  ratings: typeof ratings;
  savedFilters: typeof savedFilters;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
