/**
 * Evaluates whether a matched platform-bank transaction pair falls across
 * accounting period boundaries (e.g., January platform transaction settling in February).
 */
export const evaluateSettlementTiming = ({
  transactionDate,
  settlementDate,
  periodStart = '2026-01-01',
  periodEnd = '2026-01-31'
}) => {
  const isPlatformInPeriod = transactionDate >= periodStart && transactionDate <= periodEnd;
  const isSettlementAfterPeriod = settlementDate > periodEnd;
  const isSettlementBeforePeriod = settlementDate < periodStart;

  if (isPlatformInPeriod && isSettlementAfterPeriod) {
    return {
      timing_status: 'SETTLED_AFTER_PERIOD',
      is_timing_difference: true,
      in_period_settled: false,
      description: `Transaction initiated on ${transactionDate} in period [${periodStart} to ${periodEnd}], but settled by bank on ${settlementDate}. Classified as timing difference / in-transit asset.`
    };
  }

  if (isPlatformInPeriod && isSettlementBeforePeriod) {
    return {
      timing_status: 'SETTLED_BEFORE_PERIOD',
      is_timing_difference: true,
      in_period_settled: false,
      description: `Transaction initiated on ${transactionDate}, but bank settlement is dated ${settlementDate} prior to reporting period.`
    };
  }

  return {
    timing_status: 'SETTLED_IN_PERIOD',
    is_timing_difference: false,
    in_period_settled: true,
    description: `Settled within reporting period on ${settlementDate}.`
  };
};
