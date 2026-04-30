CREATE OR REPLACE FUNCTION public.submit_user_transfer(
  _from_account_id uuid,
  _transfer_type text,
  _amount numeric,
  _currency text,
  _recipient_name text,
  _recipient_account text,
  _recipient_bank text,
  _routing_number text,
  _swift_code text,
  _bank_address text,
  _memo text,
  _details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_acct_user uuid;
  v_balance numeric;
  v_new_balance numeric;
  v_transfer_id uuid;
  v_recipient text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT user_id, balance INTO v_acct_user, v_balance
  FROM public.accounts WHERE id = _from_account_id FOR UPDATE;

  IF v_acct_user IS NULL THEN
    RAISE EXCEPTION 'Account not found';
  END IF;
  IF v_acct_user <> v_user THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  INSERT INTO public.transfers (
    user_id, from_account_id, transfer_type, amount, currency,
    recipient_name, recipient_account, recipient_bank,
    routing_number, swift_code, bank_address, memo, details, status
  ) VALUES (
    v_user, _from_account_id, _transfer_type, _amount, COALESCE(_currency,'USD'),
    _recipient_name, _recipient_account, _recipient_bank,
    _routing_number, _swift_code, _bank_address, _memo, _details, 'pending'
  ) RETURNING id INTO v_transfer_id;

  v_new_balance := v_balance - _amount;
  UPDATE public.accounts
    SET balance = v_new_balance, available_balance = v_new_balance, updated_at = now()
    WHERE id = _from_account_id;

  v_recipient := COALESCE(_recipient_name, 'recipient');
  INSERT INTO public.transactions (account_id, user_id, description, amount, transaction_type, status)
  VALUES (
    _from_account_id, v_user,
    initcap(_transfer_type) || ' transfer to ' || v_recipient,
    -_amount, 'transfer', 'pending'
  );

  RETURN v_transfer_id;
END;
$$;