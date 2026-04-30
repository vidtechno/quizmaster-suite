-- Recreate triggers that were missing after prior schema changes

-- 1) Auto-generate test_code on INSERT into tests
DROP TRIGGER IF EXISTS trg_tests_set_code ON public.tests;
CREATE TRIGGER trg_tests_set_code
BEFORE INSERT ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.tg_tests_set_code();

-- 2) Auto-generate access_code on INSERT into groups
DROP TRIGGER IF EXISTS trg_groups_set_code ON public.groups;
CREATE TRIGGER trg_groups_set_code
BEFORE INSERT ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.tg_groups_set_code();

-- 3) Auto-create profile when a new auth user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) updated_at maintenance
DROP TRIGGER IF EXISTS trg_tests_updated_at ON public.tests;
CREATE TRIGGER trg_tests_updated_at
BEFORE UPDATE ON public.tests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_groups_updated_at ON public.groups;
CREATE TRIGGER trg_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();