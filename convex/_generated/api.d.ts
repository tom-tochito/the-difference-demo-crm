/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as client from "../client.js";
import type * as clientAccess from "../clientAccess.js";
import type * as demoAccounts from "../demoAccounts.js";
import type * as demoFixtures from "../demoFixtures.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as platform from "../platform.js";
import type * as retireLegacy from "../retireLegacy.js";
import type * as savings from "../savings.js";
import type * as shipping from "../shipping.js";
import type * as shippingModel from "../shippingModel.js";
import type * as shippingSeed from "../shippingSeed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  client: typeof client;
  clientAccess: typeof clientAccess;
  demoAccounts: typeof demoAccounts;
  demoFixtures: typeof demoFixtures;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  platform: typeof platform;
  retireLegacy: typeof retireLegacy;
  savings: typeof savings;
  shipping: typeof shipping;
  shippingModel: typeof shippingModel;
  shippingSeed: typeof shippingSeed;
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
