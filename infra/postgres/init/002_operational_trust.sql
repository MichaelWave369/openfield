begin;

create table if not exists openfield.signing_key_registrations (
  key_id text not null,
  version integer not null check (version > 0),
  algorithm text not null check (algorithm = 'Ed25519'),
  public_key_base64 text not null,
  status text not null check (status in ('active', 'retired', 'revoked')),
  valid_from timestamptz not null,
  valid_to timestamptz,
  recorded_at timestamptz not null,
  invalidates_signatures_from timestamptz,
  reason text,
  supersedes_version integer,
  inserted_at timestamptz not null default clock_timestamp(),
  primary key (key_id, version),
  foreign key (key_id, supersedes_version)
    references openfield.signing_key_registrations(key_id, version),
  check (valid_to is null or valid_to > valid_from),
  check (
    (status = 'revoked' and invalidates_signatures_from is not null)
    or
    (status <> 'revoked' and invalidates_signatures_from is null)
  )
);

create table if not exists openfield.privacy_directives (
  directive_id text primary key,
  target_type text not null check (target_type in ('artifact', 'receipt', 'record', 'source')),
  target_id text not null,
  action text not null check (action in ('suppress-content', 'suppress-export', 'restore')),
  reason_code text not null check (
    reason_code in ('personal-data', 'legal', 'security', 'source-terms', 'operator-error', 'other')
  ),
  rationale text not null check (length(trim(rationale)) > 0),
  requested_at timestamptz not null,
  approved_at timestamptz not null,
  approved_by text not null check (length(trim(approved_by)) > 0),
  effective_at timestamptz not null,
  supersedes_directive_id text references openfield.privacy_directives(directive_id),
  inserted_at timestamptz not null default clock_timestamp(),
  check (approved_at >= requested_at)
);

create table if not exists openfield.connector_executions (
  execution_id text primary key,
  connector_id text not null,
  source_id text not null,
  outcome text not null check (
    outcome in ('succeeded', 'upstream-failure', 'ingestion-rejected', 'connector-error')
  ),
  started_at timestamptz not null,
  finished_at timestamptz not null,
  payload_hash text not null check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb not null,
  signature_algorithm text not null check (signature_algorithm = 'Ed25519'),
  signature_key_id text not null,
  signature_value_base64 text not null,
  inserted_at timestamptz not null default clock_timestamp(),
  check (finished_at >= started_at)
);

create index if not exists signing_keys_recorded_idx
  on openfield.signing_key_registrations(key_id, recorded_at desc, version desc);
create index if not exists privacy_target_effective_idx
  on openfield.privacy_directives(target_type, target_id, effective_at desc);
create index if not exists connector_executions_connector_idx
  on openfield.connector_executions(connector_id, finished_at desc);
create index if not exists connector_executions_source_idx
  on openfield.connector_executions(source_id, finished_at desc);

drop trigger if exists signing_keys_append_only on openfield.signing_key_registrations;
create trigger signing_keys_append_only
before update or delete on openfield.signing_key_registrations
for each row execute function openfield.reject_mutation();

drop trigger if exists privacy_directives_append_only on openfield.privacy_directives;
create trigger privacy_directives_append_only
before update or delete on openfield.privacy_directives
for each row execute function openfield.reject_mutation();

drop trigger if exists connector_executions_append_only on openfield.connector_executions;
create trigger connector_executions_append_only
before update or delete on openfield.connector_executions
for each row execute function openfield.reject_mutation();

create or replace view openfield.latest_signing_key_state as
select distinct on (key_id) *
from openfield.signing_key_registrations
order by key_id, version desc;

create or replace view openfield.current_privacy_state as
select distinct on (target_type, target_id) *
from openfield.privacy_directives
where effective_at <= clock_timestamp()
order by target_type, target_id, effective_at desc, approved_at desc;

comment on table openfield.signing_key_registrations is
'Append-only public signing-key lifecycle. Rotation creates a new key ID; status changes append a new version.';
comment on table openfield.privacy_directives is
'Append-only suppression and restoration directives. Evidence hashes remain auditable while content/export access is governed.';
comment on table openfield.connector_executions is
'Signed execution receipts for successful, failed, and rejected connector runs.';

commit;
