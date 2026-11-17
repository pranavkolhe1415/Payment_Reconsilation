import { Decimal, toDecimal, add, sub, formatMoney } from '../utils/decimalUtils.js';

/**
 * Computes high-precision financial ledger totals and reconciliation metrics using decimal.js.
 * Strictly separates reporting period cash from eventual settlement totals,
 * isolates duplicate inflations, and preserves exact source precision for aggregate rounding drift.
 */
export const calculateReconciliationSummary = ({
  platformRecords = [],
  rawBankRecords = [],
  dedupedBankRecords = [],
  duplicateBankRecords = [],
  matchedPairs = [],
  timingDifferences = [],
  precisionDriftRecords = [],
  orphanRefunds = []
}) => {
  // 1. Platform Totals
  let platformGrossVolume = new Decimal(0);
  for (const p of platformRecords) {
    platformGrossVolume = platformGrossVolume.plus(toDecimal(p.amount));
  }

  // 2. Raw Ingested Bank Totals
  let bankRawVolume = new Decimal(0);
  for (const b of rawBankRecords) {
    bankRawVolume = bankRawVolume.plus(toDecimal(b.settlement_amount));
  }

  // 3. Duplicate Bank Totals (Quarantined)
  let duplicateVolume = new Decimal(0);
  for (const dup of duplicateBankRecords) {
    duplicateVolume = duplicateVolume.plus(toDecimal(dup.settlement_amount));
  }

  // 4. Deduplicated Bank Totals
  let bankDedupedVolume = new Decimal(0);
  for (const b of dedupedBankRecords) {
    bankDedupedVolume = bankDedupedVolume.plus(toDecimal(b.settlement_amount));
  }

  // 5. Matched Payments Bank Total vs Platform Total
  let matchedPlatformVolume = new Decimal(0);
  let matchedBankVolume = new Decimal(0);
  let aggregateRoundingDiff = new Decimal(0);

  for (const pair of matchedPairs) {
    const pAmt = toDecimal(pair.platform.amount);
    const bAmt = toDecimal(pair.bank.settlement_amount);

    matchedPlatformVolume = matchedPlatformVolume.plus(pAmt);
    matchedBankVolume = matchedBankVolume.plus(bAmt);

    // Exact delta without premature rounding
    const rowDelta = bAmt.minus(pAmt);
    aggregateRoundingDiff = aggregateRoundingDiff.plus(rowDelta);
  }

  // 6. Timing Differences (Settled after reporting period)
  let timingDifferenceVolume = new Decimal(0);
  for (const timing of timingDifferences) {
    timingDifferenceVolume = timingDifferenceVolume.plus(toDecimal(timing.bank.settlement_amount));
  }

  // 7. Cash Settled within Reporting Period (January Close)
  const reportingPeriodSettledCash = matchedBankVolume.minus(timingDifferenceVolume);

  // 8. Orphan Refunds Total
  let orphanRefundVolume = new Decimal(0);
  for (const orphan of orphanRefunds) {
    orphanRefundVolume = orphanRefundVolume.plus(toDecimal(orphan.settlement_amount));
  }

  return {
    platform: {
      total_records: platformRecords.length,
      gross_amount: formatMoney(platformGrossVolume),
      currency: platformRecords[0]?.currency || 'INR'
    },
    bank_ingested: {
      total_records: rawBankRecords.length,
      gross_amount: formatMoney(bankRawVolume),
      currency: rawBankRecords[0]?.currency || 'INR'
    },
    deduplication: {
      duplicate_records_count: duplicateBankRecords.length,
      quarantined_amount: formatMoney(duplicateVolume),
      prevented_inflation_amount: formatMoney(duplicateVolume),
      deduped_records_count: dedupedBankRecords.length,
      deduped_net_amount: formatMoney(bankDedupedVolume)
    },
    reconciliation: {
      matched_records_count: matchedPairs.length,
      matched_platform_amount: formatMoney(matchedPlatformVolume),
      matched_bank_amount: formatMoney(matchedBankVolume),
      net_matched_difference: formatMoney(matchedBankVolume.minus(matchedPlatformVolume)),
      
      // Timing separation
      timing_differences_count: timingDifferences.length,
      timing_differences_amount: formatMoney(timingDifferenceVolume),
      reporting_period_settled_cash: formatMoney(reportingPeriodSettledCash),
      eventual_settlement_cash: formatMoney(matchedBankVolume),

      // Rounding drift
      precision_drift_records_count: precisionDriftRecords.length,
      aggregate_rounding_difference: aggregateRoundingDiff.toFixed(3),

      // Orphan refund
      orphan_refunds_count: orphanRefunds.length,
      orphan_refunds_amount: formatMoney(orphanRefundVolume)
    }
  };
};
