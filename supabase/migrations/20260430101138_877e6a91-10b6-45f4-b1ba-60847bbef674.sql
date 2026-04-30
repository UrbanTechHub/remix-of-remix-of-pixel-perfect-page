-- Drop old random generator
DROP FUNCTION IF EXISTS public.admin_generate_random_transactions(uuid, integer, integer, numeric, numeric);

-- New, richer random transaction generator with:
--  * Realistic merchants + human Zelle/Venmo names
--  * Optional check_deposit entries
--  * Optional "target net" mode that ensures the sum of generated amounts equals
--    a specific positive (credit) or negative (debit) delta, AND updates the
--    account balance accordingly.
CREATE OR REPLACE FUNCTION public.admin_generate_random_transactions(
  _account_id uuid,
  _count integer,
  _days_back integer DEFAULT 90,
  _min_amount numeric DEFAULT 5,
  _max_amount numeric DEFAULT 500,
  _include_checks boolean DEFAULT true,
  _target_net numeric DEFAULT NULL,
  _target_direction text DEFAULT NULL  -- 'credit' or 'debit' when _target_net is set
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_i integer := 0;
  v_amt numeric;
  v_sign integer;
  v_desc text;
  v_date timestamptz;
  v_is_check boolean;
  v_running numeric;
  v_balance numeric;
  v_total_signed numeric := 0;
  v_remaining numeric;
  v_tx_type text;
  v_status text;
  v_style text;
  v_people text[] := ARRAY[
    'JOHN SMITH','SARAH JOHNSON','MICHAEL BROWN','EMILY DAVIS','DAVID WILSON',
    'JESSICA MARTINEZ','ROBERT GARCIA','LISA ANDERSON','JAMES TAYLOR','MARIA RODRIGUEZ',
    'CHRIS LEE','AMANDA WHITE','KEVIN HALL','RACHEL GREEN','BRIAN KING'
  ];
  v_merchants text[] := ARRAY[
    'AMAZON.COM*RT4521','STARBUCKS STORE 04521','WALMART SUPERCENTER 1899',
    'TARGET T-1899 ATLANTA','SHELL OIL 12345678','NETFLIX.COM LOS GATOS',
    'SPOTIFY USA NEW YORK','UBER TRIP 8829','LYFT *RIDE THU 8AM',
    'WHOLE FOODS MKT 10234','CHIPOTLE 1234 ATLANTA','MCDONALDS F1234',
    'APPLE.COM/BILL 866-712-7753','COSTCO WHSE #0123','CVS/PHARMACY #05678',
    'WALGREENS #5678','BEST BUY 00012345','DOORDASH*PANDA EXPRESS',
    'HOME DEPOT #4521','TRADER JOES #234','EXXONMOBIL 7777',
    'AT&T*BILL PAYMENT','VERIZON*WIRELESS','COMCAST CABLE COMM',
    'GEICO AUTO PAYMENT','DELTA AIR 0061234','HILTON HOTELS ATL',
    'PANERA BREAD #1209','DUNKIN #305988','SUBWAY 12389'
  ];
  v_credit_descs text[] := ARRAY[
    'PAYROLL DIRECT DEP',
    'INTEREST EARNED',
    'TAX REFUND IRS TREAS 310',
    'SSA TREAS 310 XXSOC SEC',
    'VENMO CASHOUT'
  ];
  v_pick_idx integer;
  v_kind integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF _count IS NULL OR _count <= 0 OR _count > 200 THEN
    RAISE EXCEPTION 'Count must be between 1 and 200';
  END IF;

  SELECT user_id, balance INTO v_user, v_balance
  FROM public.accounts WHERE id = _account_id FOR UPDATE;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  -- Determine target net signed amount when requested
  IF _target_net IS NOT NULL THEN
    IF _target_direction NOT IN ('credit','debit') THEN
      RAISE EXCEPTION 'target_direction must be credit or debit';
    END IF;
    IF _target_net <= 0 THEN
      RAISE EXCEPTION 'target_net must be positive';
    END IF;
    v_remaining := CASE WHEN _target_direction = 'credit' THEN _target_net ELSE -_target_net END;
  END IF;

  v_running := v_balance;

  WHILE v_i < _count LOOP
    v_date := now() - (random() * _days_back || ' days')::interval;

    -- Decide kind: 0=merchant debit, 1=human zelle/venmo, 2=credit, 3=check deposit
    v_kind := floor(random() * 100)::int;

    IF _include_checks AND v_kind < 8 THEN
      -- 8% check deposits
      v_sign := 1;
      v_is_check := true;
      v_pick_idx := 1 + floor(random() * array_length(v_people,1))::int;
      v_desc := 'BKOFAMERICA' || E'\n' ||
                'MOBILE ' || to_char(v_date,'MM/DD') || E'\n' ||
                'XXXXX' || lpad((floor(random()*99999))::text,5,'0') || E'\n' ||
                'DEPOSIT *MOBILE IN' || E'\n' ||
                'DES:PE' || to_char(v_date,'MM/DD/YY');
    ELSIF v_kind < 25 THEN
      -- 17% credits (payroll, interest, etc.)
      v_sign := 1;
      v_is_check := false;
      v_pick_idx := 1 + floor(random() * array_length(v_credit_descs,1))::int;
      v_desc := v_credit_descs[v_pick_idx] || E'\n' ||
                'DES:PE' || to_char(v_date,'MM/DD/YY');
    ELSIF v_kind < 45 THEN
      -- 20% Zelle/Venmo to a person
      v_sign := CASE WHEN random() < 0.5 THEN 1 ELSE -1 END;
      v_is_check := false;
      v_pick_idx := 1 + floor(random() * array_length(v_people,1))::int;
      v_desc := CASE WHEN random() < 0.5 THEN 'ZELLE ' ELSE 'VENMO ' END ||
                CASE WHEN v_sign > 0 THEN 'FROM ' ELSE 'TO ' END ||
                v_people[v_pick_idx] || E'\n' ||
                'DES:PE' || to_char(v_date,'MM/DD/YY');
    ELSE
      -- merchant debit
      v_sign := -1;
      v_is_check := false;
      v_pick_idx := 1 + floor(random() * array_length(v_merchants,1))::int;
      v_desc := v_merchants[v_pick_idx] || E'\n' ||
                'DES:PE' || to_char(v_date,'MM/DD/YY');
    END IF;

    -- Amount: in target mode, vary around an even split; else random in range
    IF _target_net IS NOT NULL AND v_i = _count - 1 THEN
      -- final entry: take whatever is left to hit target exactly
      v_amt := round(abs(v_remaining)::numeric, 2);
      v_sign := CASE WHEN v_remaining >= 0 THEN 1 ELSE -1 END;
      IF v_amt < 0.01 THEN v_amt := 0.01; END IF;
    ELSIF _target_net IS NOT NULL THEN
      -- average remaining over remaining count, jitter ±40%
      v_amt := round((abs(v_remaining) / GREATEST(_count - v_i, 1) * (0.6 + random() * 0.8))::numeric, 2);
      IF v_amt < 0.01 THEN v_amt := 0.01; END IF;
      v_sign := CASE WHEN v_remaining >= 0 THEN 1 ELSE -1 END;
    ELSE
      v_amt := round((_min_amount + random() * (_max_amount - _min_amount))::numeric, 2);
    END IF;

    v_tx_type := CASE WHEN v_sign > 0 THEN 'credit' ELSE 'debit' END;
    v_status := 'completed';
    v_style := CASE WHEN v_is_check THEN 'check_deposit' ELSE NULL END;

    INSERT INTO public.transactions (
      account_id, user_id, description, amount, transaction_type,
      status, transaction_date, display_style
    ) VALUES (
      _account_id, v_user, v_desc, v_sign * v_amt, v_tx_type,
      v_status, v_date, v_style
    );

    v_total_signed := v_total_signed + (v_sign * v_amt);
    IF _target_net IS NOT NULL THEN
      v_remaining := v_remaining - (v_sign * v_amt);
    END IF;

    v_i := v_i + 1;
  END LOOP;

  -- If target mode, apply net delta to the account balance
  IF _target_net IS NOT NULL THEN
    UPDATE public.accounts
      SET balance = balance + v_total_signed,
          available_balance = available_balance + v_total_signed,
          updated_at = now()
      WHERE id = _account_id;
  END IF;

  RETURN v_i;
END;
$$;