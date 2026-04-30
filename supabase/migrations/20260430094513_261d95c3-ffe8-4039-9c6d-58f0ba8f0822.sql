
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS display_style text,
  ADD COLUMN IF NOT EXISTS running_balance numeric;

CREATE OR REPLACE FUNCTION public.admin_add_check_deposit(
  _account_id uuid,
  _amount numeric,
  _description text,
  _transaction_date timestamp with time zone,
  _running_balance numeric
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

  v_new := v_current + _amount;

  UPDATE public.accounts
    SET balance = v_new, available_balance = v_new, updated_at = now()
    WHERE id = _account_id;

  INSERT INTO public.transactions (
    account_id, user_id, description, amount, transaction_type,
    status, transaction_date, display_style, running_balance
  ) VALUES (
    _account_id, v_user, _description, _amount, 'credit',
    'completed', COALESCE(_transaction_date, now()), 'check_deposit', _running_balance
  )
  RETURNING id INTO v_tx;

  RETURN v_tx;
END;
$function$;
