
-- Allow check deposits to be pending (with clears_at) and skip balance update until cleared.
CREATE OR REPLACE FUNCTION public.admin_add_check_deposit(
  _account_id uuid,
  _amount numeric,
  _description text,
  _transaction_date timestamp with time zone,
  _running_balance numeric,
  _clears_at timestamp with time zone DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_current numeric;
  v_new numeric;
  v_tx uuid;
  v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT user_id, balance INTO v_user, v_current
  FROM public.accounts WHERE id = _account_id FOR UPDATE;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  IF _clears_at IS NULL THEN
    v_status := 'completed';
    v_new := v_current + _amount;
    UPDATE public.accounts
      SET balance = v_new, available_balance = v_new, updated_at = now()
      WHERE id = _account_id;
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO public.transactions (
    account_id, user_id, description, amount, transaction_type,
    status, transaction_date, display_style, running_balance, clears_at
  ) VALUES (
    _account_id, v_user, _description, _amount, 'credit',
    v_status, COALESCE(_transaction_date, now()), 'check_deposit', _running_balance, _clears_at
  )
  RETURNING id INTO v_tx;

  RETURN v_tx;
END;
$function$;

-- Generate N random historical completed transactions for an account (does NOT change balance).
CREATE OR REPLACE FUNCTION public.admin_generate_random_transactions(
  _account_id uuid,
  _count integer,
  _days_back integer DEFAULT 90,
  _min_amount numeric DEFAULT 5,
  _max_amount numeric DEFAULT 500
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_i integer := 0;
  v_amt numeric;
  v_sign integer;
  v_desc text;
  v_date timestamptz;
  v_descriptions text[] := ARRAY[
    'AMAZON.COM PURCHASE',
    'STARBUCKS STORE #4521',
    'WALMART SUPERCENTER',
    'TARGET T-1899',
    'SHELL OIL 12345',
    'NETFLIX.COM',
    'SPOTIFY USA',
    'UBER TRIP',
    'LYFT RIDE',
    'WHOLE FOODS MARKET',
    'CHIPOTLE 1234',
    'MCDONALDS F1234',
    'APPLE.COM/BILL',
    'COSTCO WHOLESALE',
    'CVS PHARMACY',
    'WALGREENS #5678',
    'BEST BUY 00012',
    'DOORDASH FOOD',
    'PAYPAL TRANSFER',
    'ZELLE PAYMENT',
    'PAYROLL DEPOSIT',
    'INTEREST EARNED',
    'ATM WITHDRAWAL',
    'VENMO PAYMENT',
    'HOME DEPOT 4521',
    'TRADER JOES #234'
  ];
  v_credit_descs text[] := ARRAY[
    'PAYROLL DEPOSIT',
    'INTEREST EARNED',
    'ZELLE TRANSFER FROM',
    'VENMO CASHOUT',
    'TAX REFUND IRS TREAS',
    'MOBILE DEPOSIT'
  ];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _count IS NULL OR _count <= 0 OR _count > 200 THEN
    RAISE EXCEPTION 'Count must be between 1 and 200';
  END IF;

  SELECT user_id INTO v_user FROM public.accounts WHERE id = _account_id;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  WHILE v_i < _count LOOP
    -- 80% debits, 20% credits
    IF random() < 0.2 THEN
      v_sign := 1;
      v_desc := v_credit_descs[1 + floor(random() * array_length(v_credit_descs, 1))::int];
    ELSE
      v_sign := -1;
      v_desc := v_descriptions[1 + floor(random() * array_length(v_descriptions, 1))::int];
    END IF;

    v_amt := round((_min_amount + random() * (_max_amount - _min_amount))::numeric, 2);
    v_date := now() - (random() * _days_back || ' days')::interval;

    INSERT INTO public.transactions (
      account_id, user_id, description, amount, transaction_type,
      status, transaction_date
    ) VALUES (
      _account_id, v_user, v_desc, v_sign * v_amt,
      CASE WHEN v_sign > 0 THEN 'credit' ELSE 'debit' END,
      'completed', v_date
    );

    v_i := v_i + 1;
  END LOOP;

  RETURN v_i;
END;
$function$;
