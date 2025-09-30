/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as friendships from "../friendships.js";
import type * as games from "../games.js";
import type * as promocodeTypes from "../promocodeTypes.js";
import type * as promocodes from "../promocodes.js";
import type * as rating from "../rating.js";
import type * as stats from "../stats.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  friendships: typeof friendships;
  games: typeof games;
  promocodeTypes: typeof promocodeTypes;
  promocodes: typeof promocodes;
  rating: typeof rating;
  stats: typeof stats;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
