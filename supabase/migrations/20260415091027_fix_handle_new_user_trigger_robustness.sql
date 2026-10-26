/*
  # Fix handle_new_user trigger robustness

  ## Problem
  The signup endpoint was returning a 500 error because:
  - The trigger fires on auth.users INSERT and creates a profile
  - The application code also tried to INSERT a profile for the same user
  - Any exception in the trigger causes the entire signup transaction to fail (500)

  ## Changes
  - Updated handle_new_user() to wrap the insert in an exception handler
  - If profile creation fails for any reason, the error is logged but signup continues
  - This prevents trigger failures from blocking user signup
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, organization, created_at, updated_at)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'organization', ''),
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE
      SET
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name, ''),
        organization = COALESCE(EXCLUDED.organization, public.profiles.organization, ''),
        updated_at = NOW()
      WHERE EXCLUDED.full_name != '' OR EXCLUDED.organization != '';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;
