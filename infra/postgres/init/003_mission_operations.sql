begin;

create table if not exists openfield.mission_watchlist (
  watch_id text primary key,
  mission_id text not null,
  subject_kind text not null check (subject_kind in ('company', 'site', 'project')),
  label text not null,
  cik text,
  identifiers jsonb not null default '{}'::jsonb,
  aliases jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  status text not null check (status in ('active', 'paused', 'retired')),
  created_at timestamptz not null,
  created_by text not null,
  notes text,
  check (cik is null or cik ~ '^\d{10}$')
);

create table if not exists openfield.mission_entities (
  entity_id text primary key,
  mission_id text not null,
  entity_type text not null check (entity_type in ('company', 'site', 'project', 'filing')),
  canonical_name text not null,
  identifiers jsonb not null default '{}'::jsonb,
  location geometry(Point, 4326),
  created_at timestamptz not null,
  created_by text not null
);

create table if not exists openfield.record_entity_links (
  link_id text primary key,
  mission_id text not null,
  record_id text not null references openfield.records(record_id),
  entity_id text not null references openfield.mission_entities(entity_id),
  relation text not null check (relation in ('about', 'filed-by', 'located-at', 'supports', 'contradicts', 'supersedes')),
  rationale text not null,
  proposed_at timestamptz not null,
  proposed_by text not null
);

create table if not exists openfield.review_items (
  review_id text primary key,
  mission_id text not null,
  review_type text not null check (review_type in ('record-entity-link', 'document-relevance')),
  subject_id text not null,
  evidence_record_ids text[] not null default '{}',
  rationale text not null,
  created_at timestamptz not null,
  created_by text not null
);

create table if not exists openfield.review_decisions (
  decision_id text primary key,
  review_id text not null references openfield.review_items(review_id),
  decision text not null check (decision in ('accept', 'reject', 'defer')),
  decided_at timestamptz not null,
  decided_by text not null,
  notes text
);

create table if not exists openfield.document_selections (
  selection_id text primary key,
  mission_id text not null,
  watch_id text not null references openfield.mission_watchlist(watch_id),
  cik text not null check (cik ~ '^\d{10}$'),
  accession_number text not null check (accession_number ~ '^\d{10}-\d{2}-\d{6}$'),
  primary_document text not null check (primary_document !~ '[\\/]'),
  form text not null,
  filed_at timestamptz not null,
  reason text not null,
  selected_at timestamptz not null,
  selected_by text not null
);

create index if not exists mission_watchlist_mission_idx
  on openfield.mission_watchlist(mission_id, status, created_at);
create index if not exists mission_entities_mission_idx
  on openfield.mission_entities(mission_id, entity_type, canonical_name);
create index if not exists mission_entities_location_gix
  on openfield.mission_entities using gist(location);
create index if not exists record_entity_links_record_idx
  on openfield.record_entity_links(record_id, entity_id);
create index if not exists review_items_mission_idx
  on openfield.review_items(mission_id, created_at);
create index if not exists review_decisions_review_idx
  on openfield.review_decisions(review_id, decided_at desc);
create index if not exists document_selections_mission_idx
  on openfield.document_selections(mission_id, selected_at);

create or replace view openfield.effective_review_decisions as
select distinct on (review_id) *
from openfield.review_decisions
order by review_id, decided_at desc, decision_id desc;

create or replace view openfield.accepted_record_entity_links as
select l.*
from openfield.record_entity_links l
join openfield.review_items r
  on r.review_type = 'record-entity-link' and r.subject_id = l.link_id
join openfield.effective_review_decisions d
  on d.review_id = r.review_id and d.decision = 'accept';

create or replace function openfield.attach_append_only_trigger(target regclass, trigger_name text)
returns void
language plpgsql
as $$
begin
  execute format('drop trigger if exists %I on %s', trigger_name, target);
  execute format(
    'create trigger %I before update or delete on %s for each row execute function openfield.reject_mutation()',
    trigger_name,
    target
  );
end;
$$;

select openfield.attach_append_only_trigger('openfield.mission_watchlist', 'mission_watchlist_append_only');
select openfield.attach_append_only_trigger('openfield.mission_entities', 'mission_entities_append_only');
select openfield.attach_append_only_trigger('openfield.record_entity_links', 'record_entity_links_append_only');
select openfield.attach_append_only_trigger('openfield.review_items', 'review_items_append_only');
select openfield.attach_append_only_trigger('openfield.review_decisions', 'review_decisions_append_only');
select openfield.attach_append_only_trigger('openfield.document_selections', 'document_selections_append_only');

drop function openfield.attach_append_only_trigger(regclass, text);

comment on table openfield.record_entity_links is
'Proposed links between evidence records and mission entities. Links become primary-timeline eligible only through a separate accepted review decision.';
comment on table openfield.document_selections is
'Operator selections authorizing retrieval of a specific public filing document; selection does not assert document relevance.';

commit;
