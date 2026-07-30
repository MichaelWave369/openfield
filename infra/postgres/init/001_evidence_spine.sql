begin;

create extension if not exists postgis;
create extension if not exists pgcrypto;
create schema if not exists openfield;

create table if not exists openfield.source_registrations (
  source_id text not null,
  version integer not null check (version > 0),
  display_name text not null,
  owner_name text not null,
  description text not null,
  access_mode text not null check (access_mode in ('fixture', 'api', 'feed', 'document', 'manual')),
  expected_refresh_seconds integer not null check (expected_refresh_seconds > 0),
  geographic_coverage jsonb not null default '[]'::jsonb,
  missions jsonb not null default '[]'::jsonb,
  privacy_class text not null check (privacy_class in ('public', 'restricted')),
  license jsonb not null,
  synthetic boolean not null,
  enabled boolean not null,
  approved_at timestamptz not null,
  primary key (source_id, version)
);

create table if not exists openfield.artifacts (
  artifact_hash text primary key check (artifact_hash ~ '^sha256:[0-9a-f]{64}$'),
  media_type text not null,
  byte_length bigint not null check (byte_length >= 0),
  collected_at timestamptz not null,
  storage_uri text,
  content bytea,
  inserted_at timestamptz not null default clock_timestamp(),
  check (storage_uri is not null or content is not null)
);

create table if not exists openfield.receipts (
  receipt_id text primary key,
  artifact_hash text not null references openfield.artifacts(artifact_hash),
  payload_hash text not null check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb not null,
  signature_algorithm text check (signature_algorithm is null or signature_algorithm = 'Ed25519'),
  signature_key_id text,
  signature_value_base64 text,
  recorded_at timestamptz not null,
  inserted_at timestamptz not null default clock_timestamp(),
  check (
    (signature_algorithm is null and signature_key_id is null and signature_value_base64 is null)
    or
    (signature_algorithm is not null and signature_key_id is not null and signature_value_base64 is not null)
  )
);

create table if not exists openfield.records (
  record_id text primary key,
  record_key text not null,
  mission_id text not null,
  kind text not null check (kind in ('observation', 'claim', 'inference', 'forecast', 'contradiction', 'unknown')),
  title text not null,
  summary text not null,
  location geometry(Point, 4326),
  valid_from timestamptz not null,
  valid_to timestamptz,
  recorded_at timestamptz not null,
  supersedes_record_id text references openfield.records(record_id),
  receipt_ids text[] not null default '{}',
  dependency_record_ids text[] not null default '{}',
  confidence jsonb not null,
  synthetic boolean not null,
  inserted_at timestamptz not null default clock_timestamp(),
  check (valid_to is null or valid_to > valid_from)
);

create table if not exists openfield.source_health (
  health_id text primary key,
  source_id text not null,
  checked_at timestamptz not null,
  last_attempt_at timestamptz not null,
  last_success_at timestamptz,
  consecutive_failures integer not null check (consecutive_failures >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  records_observed integer not null check (records_observed >= 0),
  upstream_status integer,
  message text,
  inserted_at timestamptz not null default clock_timestamp()
);

create index if not exists records_location_gix on openfield.records using gist(location);
create index if not exists records_mission_recorded_idx on openfield.records(mission_id, recorded_at desc);
create index if not exists records_key_recorded_idx on openfield.records(record_key, recorded_at desc);
create index if not exists records_valid_time_idx on openfield.records(valid_from, valid_to);
create index if not exists receipts_artifact_idx on openfield.receipts(artifact_hash);
create index if not exists source_health_latest_idx on openfield.source_health(source_id, checked_at desc);

create or replace function openfield.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only; % is prohibited', tg_table_name, tg_op;
end;
$$;

drop trigger if exists artifacts_append_only on openfield.artifacts;
create trigger artifacts_append_only
before update or delete on openfield.artifacts
for each row execute function openfield.reject_mutation();

drop trigger if exists receipts_append_only on openfield.receipts;
create trigger receipts_append_only
before update or delete on openfield.receipts
for each row execute function openfield.reject_mutation();

drop trigger if exists records_append_only on openfield.records;
create trigger records_append_only
before update or delete on openfield.records
for each row execute function openfield.reject_mutation();

drop trigger if exists source_health_append_only on openfield.source_health;
create trigger source_health_append_only
before update or delete on openfield.source_health
for each row execute function openfield.reject_mutation();

create or replace view openfield.latest_records as
select distinct on (record_key) *
from openfield.records
order by record_key, recorded_at desc;

comment on table openfield.records is
'Bitemporal evidence records. valid_* describes the world; recorded_at describes when OpenField knew it.';
comment on table openfield.receipts is
'Canonical receipt envelopes linking artifacts, sources, transformations, licensing, and optional Ed25519 signatures.';

commit;
