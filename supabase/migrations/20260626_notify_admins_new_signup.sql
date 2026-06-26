-- Admin alert on new signup, wired the same way as every other notification:
-- a SECURITY DEFINER trigger that inserts a `notifications` row, which the
-- existing trg_notify_push trigger then delivers as an APNs push. No dashboard
-- Database Webhook needed (that feature isn't enabled; push runs on pg_net
-- triggers like this one).
--
-- It inserts one notification per admin, with the NEW user as the actor and a
-- short message, so the push reads "@username · just created an account"
-- (title = actor name, body = message) and renders cleanly in-app, reusing the
-- existing friend_activity type. No raw secrets here, so this applies via the
-- SQL editor or Management API without the base64 dance the push secret needs.
--
-- The body is wrapped so an alert failure can NEVER block account creation.

create or replace function public.notify_admins_new_signup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    insert into notifications (user_id, type, actor_id, message)
    select au.user_id, 'friend_activity', NEW.id, 'just created an account'
    from admin_users au
    where au.user_id <> NEW.id;
  exception when others then
    -- best-effort: never let a notification failure roll back the signup
    null;
  end;
  return NEW;
end; $$;

revoke execute on function public.notify_admins_new_signup() from public, anon, authenticated;

drop trigger if exists trg_notify_admins_new_signup on public.profiles;
create trigger trg_notify_admins_new_signup after insert on public.profiles
  for each row execute function public.notify_admins_new_signup();
