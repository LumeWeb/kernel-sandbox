import defer from "p-defer";
import { KernelAuthStatus } from "@lumeweb/libweb";

let authStatus: KernelAuthStatus;
let authStatusKnown = false;
let authStatusDefer = defer();
let queriesNonce = 1;
let queries: any = {};
let loggedInDefer = defer();

export function getAuthStatusKnown() {
  return authStatusKnown;
}
export function setAuthStatusKnown(status: boolean) {
  authStatusKnown = status;
}

export function getAuthStatus(): KernelAuthStatus {
  return authStatus;
}

export function setAuthStatus(status: KernelAuthStatus) {
  authStatus = status;
}

export function getAuthStatusDefer() {
  return authStatusDefer;
}
export function getQueriesNonce(): number {
  return queriesNonce;
}
export function getQueries() {
  return queries;
}
export function deleteQuery(nonce: any) {
  delete queries[nonce];
}
export function getQuery(nonce: any) {
  return queries[nonce];
}
export function increaseQueriesNonce() {
  queriesNonce++;
}

export function addQuery(nonce: any, func: Function) {
  queries[nonce] = func;
}
export function getLoggedInDefer() {
  return loggedInDefer;
}
export function resetLoggedInDefer() {
  loggedInDefer = defer();
}
