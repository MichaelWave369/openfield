# Governed Connector Contract

A connector is not merely an API client. It is a declared authority boundary.

Every connector manifest must include:

- stable connector ID and version;
- exactly one source registration version;
- collection method;
- rate-limit behavior;
- explicit failure behavior;
- source owner and description;
- license and redistribution permissions;
- expected refresh interval;
- approved missions and geographic coverage;
- public or restricted privacy class;
- synthetic/live status.

## Admission checks

The ingestion service rejects a batch when:

- health metadata names a different source;
- the source is disabled;
- the public ingestion path receives a restricted source;
- a record targets an unauthorized mission;
- a record points to a missing artifact;
- record and source disagree about synthetic status;
- a receipt signer is absent.

## No stale fallback

On source failure, connectors must choose one of two declared behaviors:

- emit nothing; or
- emit explicit source-health metadata only.

A connector must never replay old observations as though newly collected.
