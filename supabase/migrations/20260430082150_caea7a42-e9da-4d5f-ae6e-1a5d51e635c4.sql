UPDATE public.accounts a
SET balance = sub.total, available_balance = sub.total, updated_at = now()
FROM (
  SELECT account_id, COALESCE(SUM(amount),0) AS total
  FROM public.transactions
  WHERE account_id = 'fc9588d7-a9f0-4a9a-a678-dfbc580e54c7'
  GROUP BY account_id
) sub
WHERE a.id = sub.account_id;