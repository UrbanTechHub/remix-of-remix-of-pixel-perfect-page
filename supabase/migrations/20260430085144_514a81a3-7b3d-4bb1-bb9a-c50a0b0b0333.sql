
-- Add clears_at column for pending credits
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS clears_at timestamptz;

-- Update admin_adjust_balance to support a clearing date for credits
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  _account_id uuid,
  _op text,
  _amount numeric,
  _clears_at timestamptz DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_current numeric;
  v_new numeric;
  v_delta numeric;
  v_desc text;
  v_type text;
  v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT user_id, balance INTO v_user, v_current FROM public.accounts WHERE id = _account_id FOR UPDATE;
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;

  IF _op = 'credit' THEN
    v_new := v_current + _amount;
    v_delta := _amount;
    v_desc := 'Credit Adjustment';
    v_type := 'credit';
    v_status := CASE WHEN _clears_at IS NOT NULL AND _clears_at > now() THEN 'pending' ELSE 'completed' END;
  ELSIF _op = 'debit' THEN
    v_new := v_current - _amount;
    v_delta := -_amount;
    v_desc := 'Debit Adjustment';
    v_type := 'debit';
    v_status := 'completed';
  ELSIF _op = 'set' THEN
    v_new := _amount;
    v_delta := NULL;
    v_status := 'completed';
  ELSE
    RAISE EXCEPTION 'Invalid op';
  END IF;

  UPDATE public.accounts
    SET balance = v_new, available_balance = v_new, updated_at = now()
    WHERE id = _account_id;

  IF v_delta IS NOT NULL THEN
    INSERT INTO public.transactions (account_id, user_id, description, amount, transaction_type, status, clears_at)
    VALUES (
      _account_id, v_user, v_desc, v_delta, v_type, v_status,
      CASE WHEN v_status = 'pending' THEN _clears_at ELSE NULL END
    );
  END IF;

  RETURN v_new;
END;
$function$;

-- Approve / clear a pending transaction now
CREATE OR REPLACE FUNCTION public.admin_clear_pending_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.transactions
    SET status = 'completed', clears_at = NULL
    WHERE id = _transaction_id AND status = 'pending';
END;
$$;

-- Cancel a pending credit (reverse the balance change)
CREATE OR REPLACE FUNCTION public.admin_cancel_pending_transaction(_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_amount numeric;
  v_account uuid;
  v_balance numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT amount, account_id INTO v_amount, v_account
  FROM public.transactions WHERE id = _transaction_id AND status = 'pending' FOR UPDATE;

  IF v_account IS NULL THEN
    RAISE EXCEPTION 'Pending transaction not found';
  END IF;

  SELECT balance INTO v_balance FROM public.accounts WHERE id = v_account FOR UPDATE;
  UPDATE public.accounts
    SET balance = v_balance - v_amount, available_balance = v_balance - v_amount, updated_at = now()
    WHERE id = v_account;

  DELETE FROM public.transactions WHERE id = _transaction_id;
END;
$$;

-- Edit amount / clearing date of a pending transaction
CREATE OR REPLACE FUNCTION public.admin_edit_pending_transaction(
  _transaction_id uuid,
  _new_amount numeric,
  _new_clears_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_amount numeric;
  v_account uuid;
  v_balance numeric;
  v_delta numeric;
  v_signed_new numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT amount, account_id INTO v_old_amount, v_account
  FROM public.transactions WHERE id = _transaction_id AND status = 'pending' FOR UPDATE;

  IF v_account IS NULL THEN
    RAISE EXCEPTION 'Pending transaction not found';
  END IF;

  -- Preserve sign (credits positive, debits negative)
  v_signed_new := CASE WHEN v_old_amount >= 0 THEN abs(_new_amount) ELSE -abs(_new_amount) END;
  v_delta := v_signed_new - v_old_amount;

  SELECT balance INTO v_balance FROM public.accounts WHERE id = v_account FOR UPDATE;
  UPDATE public.accounts
    SET balance = v_balance + v_delta, available_balance = v_balance + v_delta, updated_at = now()
    WHERE id = v_account;

  UPDATE public.transactions
    SET amount = v_signed_new, clears_at = _new_clears_at
    WHERE id = _transaction_id;
END;
$$;
