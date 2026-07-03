revoke all on function public.handle_new_user() from public;
revoke all on function public.update_updated_at_column() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.update_updated_at_column() from anon, authenticated;

alter function public.handle_new_user() owner to postgres;
alter function public.update_updated_at_column() owner to postgres;

grant execute on function public.handle_new_user() to postgres;
grant execute on function public.update_updated_at_column() to postgres;
