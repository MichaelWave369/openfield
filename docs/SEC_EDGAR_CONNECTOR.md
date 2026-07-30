# SEC EDGAR Submissions Connector

## Scope

`SecEdgarSubmissionsConnector` uses the official SEC submissions endpoint:

```text
https://data.sec.gov/submissions/CIK##########.json
```

It accepts an operator-configured CIK and form allowlist. The default forms are `8-K`, `10-K`, `10-Q`, `S-1`, and `424B*`.

## Admission boundary

The connector records only filing metadata published by the SEC:

- company name;
- form;
- accession number;
- filing date;
- acceptance time;
- primary document metadata.

It does not claim that a filing concerns a data center, proves construction, confirms financing, or predicts project completion.

## Fair access

- A declared application and administrative-contact User-Agent is mandatory.
- Requests are serialized.
- Minimum spacing is 125 milliseconds, limiting the process to at most eight requests per second.
- HTTP failures emit explicit health and no observations.
- Old observations are never replayed with a new collection timestamp.

## Custody

The exact JSON response bytes are stored as one content-addressed artifact. Derived filing observations point to the receipt for those bytes. The raw artifact is registered as non-redistributable by default until downstream source-term review explicitly permits a broader export.
