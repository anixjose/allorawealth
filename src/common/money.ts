import { Prisma } from '@prisma/client';

/**
 * All money in this system is Prisma.Decimal, numeric(18,2) at the DB level
 * (2dp — Rupees and Paise, matching INR). Never use JS `number` for money —
 * floating point rounding is exactly the kind of silent drift a double-entry
 * ledger must never allow.
 */
export type Money = Prisma.Decimal;

export const toMoney = (value: Prisma.Decimal.Value): Money => new Prisma.Decimal(value);

export const ZERO: Money = new Prisma.Decimal(0);

export const sumMoney = (values: Prisma.Decimal.Value[]): Money =>
  values.reduce<Money>((acc, v) => acc.plus(v), ZERO);

export const isZero = (value: Prisma.Decimal.Value): boolean => toMoney(value).isZero();

/**
 * decimal.js normalizes trailing zeros on arithmetic (10000.00 - 6000 =>
 * "4000", not "4000.00"), which is fine internally but reads badly in an
 * API response for money. Format to a fixed 2dp string at API boundaries
 * that display currency directly (blueprint §22's "INR 7,600.00" style).
 */
export const formatMoney = (value: Prisma.Decimal.Value): string => toMoney(value).toFixed(2);
