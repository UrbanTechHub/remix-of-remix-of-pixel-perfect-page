CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  _account_id uuid,
  _op text,
  _amount numeric
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_current numeric;
  v_new numeric;
  v_delta numeric;
  v_desc text;
  v_type text;
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
  ELSIF _op = 'debit' THEN
    v_new := v_current - _amount;
    v_delta := -_amount;
    v_desc := 'Debit Adjustment';
    v_type := 'debit';
  ELSIF _op = 'set' THEN
    v_new := _amount;
    v_delta := NULL;
  ELSE
    RAISE EXCEPTION 'Invalid op';
  END IF;

  UPDATE public.accounts
    SET balance = v_new, available_balance = v_new, updated_at = now()
    WHERE id = _account_id;

  IF v_delta IS NOT NULL THEN
    INSERT INTO public.transactions (account_id, user_id, description, amount, transaction_type, status)
    VALUES (_account_id, v_user, v_desc, v_delta, v_type, 'completed');
  END IF;

  RETURN v_new;
END;
$$;