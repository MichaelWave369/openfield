# SEC EDGAR Filing Document Connector

The v0.4 connector retrieves only a filing document explicitly selected by an operator.

## Official path

The connector constructs the SEC archive URL from:

- numeric CIK without leading zeroes in the archive path;
- accession number without dashes in the archive directory;
- a validated primary-document filename.

The path shape is:

```text
https://www.sec.gov/Archives/edgar/data/{CIK}/{ACCESSION_WITHOUT_DASHES}/{PRIMARY_DOCUMENT}
```

The accession number and primary document originate in SEC submissions metadata. Operators must not paste arbitrary external URLs into the connector.

## Fair access

The connector:

- requires an identifying User-Agent with an administrative contact;
- serializes requests;
- enforces a minimum 125 ms interval, an internal ceiling of eight requests per second;
- sends no automatic background traffic;
- preserves no stale success when a request fails;
- applies a configurable document-size admission limit, 20 MB by default.

## Truth boundary

Successful retrieval proves only that OpenField received bytes at the official archive path at the recorded time. It does not establish that the document mentions a data center or supports any project, financing, site-control, construction, energy, or completion claim.

Document relevance requires a separate review item and explicit analyst decision.
