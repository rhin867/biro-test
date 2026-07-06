-- 1. Lock down SECURITY DEFINER functions: only service_role/postgres may EXECUTE.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_request_user_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.current_request_user_key() TO service_role;

-- 2. Constrain leaderboard inserts so forged/absurd scores are blocked at the DB level.
DROP POLICY IF EXISTS "Anyone can submit a result" ON public.test_leaderboard;
CREATE POLICY "Validated leaderboard submissions"
  ON public.test_leaderboard
  FOR INSERT
  WITH CHECK (
    length(test_id) BETWEEN 1 AND 200
    AND length(user_key) BETWEEN 3 AND 120
    AND length(display_name) BETWEEN 1 AND 80
    AND score >= 0
    AND max_score > 0
    AND score <= max_score
    AND accuracy >= 0
    AND accuracy <= 100
    AND time_taken >= 0
    AND time_taken <= 86400
  );
