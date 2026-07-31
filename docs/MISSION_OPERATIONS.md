# Data Center Watch Mission Operations

OpenField v0.4 turns the evidence spine into an analyst-operated mission workflow.

## Flow

```text
Operator watchlist
  -> SEC submissions metadata
  -> explicit document selection
  -> exact archive bytes + signed receipt
  -> proposed entity link
  -> analyst review decision
  -> accepted mission timeline
  -> verification-backed mission packet
```

## Watchlists

A watchlist entry is an append-only operator instruction. It may identify a company by CIK, a site, or a project. A watch entry does not state that the subject owns, controls, finances, develops, or operates a data center.

Pausing or retiring a watch should be represented by a later governed state record in a future lifecycle extension; existing watch decisions remain reconstructable.

## Entity linking

Record-to-entity links are proposals. Every proposed link must carry a separate review item that cites the linked evidence record. The primary timeline includes a link only after the latest known review decision is `accept`.

Acceptance confirms the relationship expressed by the link, such as an exact CIK identifying the filer. It does not promote the underlying record from observation to inference or from claim to fact.

## Timelines

Mission timelines preserve:

- the original record kind;
- valid time and recorded time;
- the accepted entity relation;
- confidence decomposition;
- a human-readable claim boundary;
- the review status that admitted the link.

## Mission packets

A mission evidence packet combines watch entries, entities, document selections, accepted timeline entries, unresolved reviews, and Verification Package v2. Unresolved and deferred reviews remain visible rather than being silently omitted.
