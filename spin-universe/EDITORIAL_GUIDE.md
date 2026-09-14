# SPINiverse paper-page guide

These are the reusable decisions for SPIN, SIREN, MINER, and Agent-SIREN.

For site-wide positioning, voice, and visual identity, see [BRANDING.md](BRANDING.md).

## Audience and voice

- Write for an intelligent visitor who has not read the paper. Researchers can open the paper or detailed results.
- Aim for an academic project page with public-facing clarity, not a product launch page. Each paper may keep one memorable claim in its hero; the rest of the page should earn that claim with method, scope, and evidence.
- Lead with the practical consequence, then explain the mechanism in plain language and introduce the paper's own terminology.
- Maximize impact while keeping the central claim defensible. Put qualifiers where they define the comparison (for example, “among evaluated open guards”), not as generic self-protection.
- Prefer concrete verbs and outcomes. Remove vague metaphors, unexplained acronyms, and sentences that do not answer “so what?”
- Avoid repeated imperative headlines, anthropomorphism, mirrored slogans, and stacks of sentence fragments. Method steps should usually use descriptive labels such as “Layer-wise probing” or direct findings such as “SIREN improves all four matched comparisons.”
- Let measured results, comparison design, and visuals provide the impact. Avoid adjective-led claims when a metric or named baseline can make the same point.
- Give unfamiliar work its historical context: what people normally did then, what was missing, and why this result changed the picture.
- Frame the core problem concretely: visible outputs are not a complete record of the model’s internal computation. Use human or scientific analogies only when they clarify measurement, and return immediately to the paper’s actual experiment.
- For the four-paper umbrella story, unite the work around measuring and using task-relevant internal representations—not claims that every method is linear, sparse, or strongest in the middle.
- Make efficiency part of the value proposition: a frozen backbone and compact readout reduce adaptation cost, discriminative reads avoid text decoding, and early exit is the payoff when useful evidence appears before the final layer.

## Page hierarchy

The finished SPIN page is the reference implementation for individual paper pages.

1. A compact hero: method name, paper-title-style description, three keywords, authors, and one entry for each resource.
2. Motivation or background: the prior practice and the paper's research question in one short paragraph.
3. Method: the paper's own terminology, one explanatory interaction, and descriptive method steps.
4. Experiments and results: evaluation scope, three or four headline measurements, the main result graphic, and a short interpretation.
5. One paper-specific analysis or deployment section when it adds evidence not already shown.
6. Complete result tables only as optional disclosure.

Move headline numbers into the results section rather than treating the hero as an advertisement. Use the conventional motivation-method-results sequence unless the paper itself provides a compelling reason not to.

## SPIN-derived page standard

- Keep the method name prominent but moderate in size. The line below it should read like a paper title, not a campaign slogan.
- When the title already explains the method, omit a second hero synopsis. Expand the acronym typographically in the title when that is both accurate and readable.
- Use a three-item keyword row to establish task, model family, and methodological area. Do not add an eyebrow that repeats venue or task; place venue information in a keyword or metadata only when it is useful to the reader.
- A hero schematic should be graphical. Remove tiny captions, stage names, score labels, and explanatory prose unless a label is necessary to understand the comparison.
- Use normal research-page section names: “Motivation,” “Method,” “Experiments and results,” “Analysis,” or a paper-specific technical question. Avoid generic launch-page labels such as “The payoff,” “The interface change,” and “Main findings.”
- Section headings should be readable, not billboard-sized. Reserve the largest typography for the project identity and measured result numbers.
- In structured analysis tabs, make the tab and its heading form a deliberate question-and-answer pair. SPIN uses “What, which, and where?” with headings that naturally continue each question.
- Remove decorative numbering, repeated kickers, redundant chart captions, interaction instructions for obvious controls, and labels whose only purpose is to fill space.
- Keep labels inside diagrams only when they distinguish an input, method, baseline, output, or measured quantity. A label such as “positive” or “negative” can be useful; “one score,” “class,” or “cross-layer readout” usually repeats what the graphic already shows.
- State the evaluation scope once above a result. Dataset cards need not repeat the metric when the surrounding text or axis already defines it.
- Detailed tables must remain auditable: align grouped headers with their data columns, keep comparison names explicit, and put them behind a disclosure when the overview already carries the result.
- After JavaScript redraws an accessible SVG, preserve the IDs referenced by `aria-labelledby`; after removing visible copy, remove or relax JavaScript dependencies on that element.
- Bump local CSS or JavaScript query versions after visible changes so review browsers do not display a stale page.

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

- Keep paragraphs short. A module should make one claim, explain one mechanism, or report one result—not all three again.
- State the evaluation scope and comparator near headline results. Prefer “highest mean macro-F1 among the evaluated open guards” to “best guard.”
- Use stable search terms in titles, descriptions, first-page explanations, and structured data: the task, internal representations, frozen backbone, the method name, the principal comparison, and the efficiency mechanism. Do not keyword-stuff visible footer copy.
- Give each resource—paper, code, demo, poster—one clear entry on the page. Do not repeat the same CTA at the bottom.
- Use recognizable icons for resource types so visitors can scan before reading.
- Expand a paper acronym once, near the first plain-language explanation.
- Avoid repeating the same claim in the hero, method section, and footer.
- Prefer a short narrative paragraph over a second rail of disconnected statistics.
- Keep relative and absolute gains unambiguous, but move audit-level detail into the expandable results.
- Run a deletion test on every small line of copy: if the title, chart, or adjacent paragraph already communicates it, remove it.
