
create type public.account_type as enum ('personal','business');
create type public.content_type as enum ('post','reel','story','tweet','event','ticket','news');
create type public.connection_status as enum ('pending','accepted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  avatar_url text,
  bio text default '',
  account_type public.account_type not null default 'personal',
  business_category text, website text, contact_email text, phone text, location text,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable" on public.profiles for select using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare base text;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), '[^a-zA-Z0-9_]', '', 'g'));
  if base = '' then base := 'user'; end if;
  if exists (select 1 from public.profiles where username = base) then base := base || substr(replace(new.id::text,'-',''),1,6); end if;
  insert into public.profiles (id, username, display_name, account_type, avatar_url)
  values (new.id, base, coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', base),
    coalesce((new.raw_user_meta_data->>'account_type')::public.account_type, 'personal'),
    new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
grant select, insert, update, delete on public.connections to authenticated;
grant select on public.connections to anon;
grant all on public.connections to service_role;
alter table public.connections enable row level security;
create policy "connections readable" on public.connections for select using (true);
create policy "request connection" on public.connections for insert to authenticated with check (auth.uid() = requester_id and status = 'pending');
create policy "accept connection" on public.connections for update to authenticated using (auth.uid() = addressee_id);
create policy "remove connection" on public.connections for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

create table public.content (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  type public.content_type not null,
  title text not null default '',
  description text not null default '',
  body text,
  media_url text,
  media_kind text,
  cover_url text,
  category text,
  starts_at timestamptz,
  location text,
  online_link text,
  price numeric(10,2) default 0,
  quantity int,
  registration_deadline timestamptz,
  expires_at timestamptz,
  music_title text,
  music_artist text,
  audience text not null default 'everyone' check (audience in ('everyone','connections','close_friends')),
  alt_text text,
  tagged text,
  hide_likes boolean not null default false,
  comments_off boolean not null default false,
  filter text,
  aspect text,
  created_at timestamptz not null default now()
);
create index on public.content (created_at desc);
create index on public.content (author_id);
grant select on public.content to anon;
grant select, insert, update, delete on public.content to authenticated;
grant all on public.content to service_role;
alter table public.content enable row level security;
create or replace function public.is_business(_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = _uid and account_type = 'business') $$;
create policy "content readable" on public.content for select using (true);
create policy "create content" on public.content for insert to authenticated with check (
  auth.uid() = author_id and (type in ('post','reel','story','tweet') or public.is_business(auth.uid())));
create policy "edit own content" on public.content for update to authenticated using (auth.uid() = author_id);
create policy "delete own content" on public.content for delete to authenticated using (auth.uid() = author_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
grant select on public.comments to anon;
grant select, insert, delete on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "comments readable" on public.comments for select using (true);
create policy "add comment" on public.comments for insert to authenticated with check (auth.uid() = author_id);
create policy "delete own comment" on public.comments for delete to authenticated using (auth.uid() = author_id);

create table public.likes (
  content_id uuid not null references public.content(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, user_id)
);
grant select on public.likes to anon;
grant select, insert, delete on public.likes to authenticated;
grant all on public.likes to service_role;
alter table public.likes enable row level security;
create policy "likes readable" on public.likes for select using (true);
create policy "like" on public.likes for insert to authenticated with check (auth.uid() = user_id);
create policy "unlike" on public.likes for delete to authenticated using (auth.uid() = user_id);

create table public.saves (
  content_id uuid not null references public.content(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, user_id)
);
grant select, insert, delete on public.saves to authenticated;
grant all on public.saves to service_role;
alter table public.saves enable row level security;
create policy "own saves read" on public.saves for select to authenticated using (auth.uid() = user_id);
create policy "save" on public.saves for insert to authenticated with check (auth.uid() = user_id);
create policy "unsave" on public.saves for delete to authenticated using (auth.uid() = user_id);

create table public.story_views (
  content_id uuid not null references public.content(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (content_id, user_id)
);
grant select, insert on public.story_views to authenticated;
grant all on public.story_views to service_role;
alter table public.story_views enable row level security;
create policy "own views" on public.story_views for select to authenticated using (auth.uid() = user_id);
create policy "add view" on public.story_views for insert to authenticated with check (auth.uid() = user_id);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 20),
  reference text not null unique default ('SAC-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  status text not null default 'reserved',
  payment_status text not null default 'unpaid',
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "see own or hosted bookings" on public.bookings for select to authenticated using (
  auth.uid() = user_id or exists (select 1 from public.content c where c.id = content_id and c.author_id = auth.uid()));
create policy "book" on public.bookings for insert to authenticated with check (auth.uid() = user_id and status = 'reserved' and payment_status = 'unpaid');
create policy "cancel own booking" on public.bookings for delete to authenticated using (auth.uid() = user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  kind text not null,
  content_id uuid references public.content(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "mark read" on public.notifications for update to authenticated using (auth.uid() = user_id);
create policy "delete own notif" on public.notifications for delete to authenticated using (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.messages (sender_id, recipient_id, created_at);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "participants read" on public.messages for select to authenticated using (auth.uid() in (sender_id, recipient_id));
create policy "send" on public.messages for insert to authenticated with check (auth.uid() = sender_id);
create policy "recipient marks read" on public.messages for update to authenticated using (auth.uid() = recipient_id);

create or replace function public.notify(_user uuid, _actor uuid, _kind text, _content uuid) returns void language plpgsql security definer set search_path = public as $$
begin if _user is not null and _user is distinct from _actor then insert into public.notifications(user_id, actor_id, kind, content_id) values (_user,_actor,_kind,_content); end if; end $$;
revoke execute on function public.notify(uuid,uuid,text,uuid) from public, anon, authenticated;

create or replace function public.trg_like() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify((select author_id from content where id = new.content_id), new.user_id, 'like', new.content_id); return new; end $$;
create trigger t_like after insert on public.likes for each row execute function public.trg_like();
create or replace function public.trg_comment() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify((select author_id from content where id = new.content_id), new.author_id, 'comment', new.content_id); return new; end $$;
create trigger t_comment after insert on public.comments for each row execute function public.trg_comment();
create or replace function public.trg_conn() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then perform public.notify(new.addressee_id, new.requester_id, 'connection_request', null);
  elsif new.status = 'accepted' and old.status = 'pending' then perform public.notify(new.requester_id, new.addressee_id, 'connection_accepted', null); end if;
  return new; end $$;
create trigger t_conn after insert or update on public.connections for each row execute function public.trg_conn();
create or replace function public.trg_msg() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.notify(new.recipient_id, new.sender_id, 'message', null); return new; end $$;
create trigger t_msg after insert on public.messages for each row execute function public.trg_msg();
create or replace function public.trg_booking() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify((select author_id from content where id = new.content_id), new.user_id, 'registration', new.content_id);
  insert into public.notifications(user_id, actor_id, kind, content_id) values (new.user_id, null, 'booking_confirmed', new.content_id);
  return new; end $$;
create trigger t_booking after insert on public.bookings for each row execute function public.trg_booking();

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

create policy "media read auth" on storage.objects for select to authenticated using (bucket_id = 'media');
create policy "media upload own folder" on storage.objects for insert to authenticated with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media delete own" on storage.objects for delete to authenticated using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
