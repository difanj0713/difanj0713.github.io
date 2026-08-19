# SPINiverse paper-page guide

These are the reusable decisions for SPIN, SIREN, MINER, and Agent-SIREN.

## Audience and voice

- Write for an intelligent visitor who has not read the paper. Researchers can open the paper or detailed results.
- Lead with the practical consequence, then explain the mechanism in plain language.
- Maximize impact while keeping the central claim defensible. Do not weaken the hero with review-style caveats.
- Prefer concrete verbs and outcomes. Remove vague metaphors, unexplained acronyms, and sentences that do not answer “so what?”
- Give unfamiliar work its historical context: what people normally did then, what was missing, and why this result changed the picture.
- Frame the core problem as an interface gap: visible tokens are not a complete record of the model’s internal computation. Keep any human analogy to one line so the story does not drift into anthropomorphism or mechanistic interpretability.
- For the four-paper umbrella story, unite the work around a better interface to internal computation—not claims that every method is linear, sparse, or strongest in the middle.
- Make efficiency part of the value proposition: a frozen backbone and compact readout reduce adaptation cost, discriminative reads avoid text decoding, and early exit is the payoff when useful evidence appears before the final layer.

## Page hierarchy

1. One short claim in the hero.
2. One sentence explaining what the method actually does.
3. Three or four large, immediately readable proof points.
4. The main measured result before implementation details.
5. One paper-specific interactive explanation.
6. Detailed tables only as optional disclosure.

## Visual and interaction rules

- Use visuals to replace prose, not decorate it.
- Each interactive component must explain a distinct idea from that paper.
- Show the complete body of evidence before asking the visitor to hover, tap, or filter it.
- Do not repeat a chart’s visible conclusion in a second persistent readout, and omit interaction instructions when the interaction is self-evident.
- Keep result graphics measured and clearly distinguish them from explanatory schematics.
- When a paper variable drives an explorer, expose the real variable and explain its meaning in one plain sentence; use schematic motion only to communicate its effect.
- Use short labels, large numbers, strong contrast, visible keyboard focus, and mobile-first ordering.
- On phones, keep the headline evidence and the endpoint of a method diagram visible without horizontal swiping; reserve sideways scrolling for audit tables.

## Editing rules

- Give each resource—paper, code, demo, poster—one clear entry on the page. Do not repeat the same CTA at the bottom.
- Use recognizable icons for resource types so visitors can scan before reading.
- Expand a paper acronym once, near the first plain-language explanation.
- Avoid repeating the same claim in the hero, method section, and footer.
- Prefer a short narrative paragraph over a second rail of disconnected statistics.
- Keep relative and absolute gains unambiguous, but move audit-level detail into the expandable results.
