# SPINiverse brand specification

This is the site-wide source of truth for SPINiverse positioning, voice, and visual design. For detailed paper-page structure and result presentation, also see [EDITORIAL_GUIDE.md](EDITORIAL_GUIDE.md).

## North star

SPINiverse is an academic research collection presented with public-facing clarity. It should be memorable enough to invite a broad technical audience in, and precise enough that collaborators and researchers trust what they find.

The central idea is operational, not metaphysical:

- AI models form task-relevant internal states while processing an input.
- Small task-specific methods can measure and use those states.
- Their value is established through classification, safety, and retrieval results.

`Model mind-reading` is the public hook. It is a metaphor for measuring internal representations, not a claim about consciousness, thought, or complete mechanistic understanding. The surrounding copy must make that distinction evident without adding defensive disclaimers.

## Audience

Write first for an intelligent visitor who has not read the papers. Assume curiosity, not specialized terminology. Researchers should find the comparison scope and evidence credible; everyone else should understand the research question and practical consequence.

The desired impression is:

> An ambitious academic research program with a clear idea and strong evidence.

It should not read like a product launch, a laboratory wiki, or an AI-generated collection of slogans.

## Message architecture

### Homepage

The homepage establishes the shared question; it does not summarize every method.

1. Identity and one memorable public frame.
2. One concise, sourced research premise.
3. The four papers as an academic research index.
4. One optional interactive example.
5. A minimal collaboration footer.

Keep headline metrics, implementation details, and audit tables on the paper pages. The homepage should make visitors want to open a project, not pre-empt it.

### Paper pages

Each paper page should explain:

1. The domain problem.
2. What the paper does in its own terminology.
3. The main comparison and result.
4. Why the method is useful in that domain.
5. One paper-specific visual or interaction.

Follow the more detailed hierarchy in [EDITORIAL_GUIDE.md](EDITORIAL_GUIDE.md).

## Voice

### Use

- Complete, natural sentences.
- Concrete nouns and verbs from the papers.
- Plain language before technical terminology.
- Historical context when it genuinely explains the research question.
- One memorable line when the surrounding evidence earns it.
- Direct transitions such as `But today, we can look inside.`

### Avoid

- Repeated `Statement. Punchline.` constructions.
- Sequences of imperative slogans such as `Ask every layer. Keep what matters. Read them together.`
- Mirrored fragments such as `Same model. Different interface.`
- Generic startup language: `revolutionary`, `unlock`, `transform`, `game-changing`, or unscoped `best` and `state of the art`.
- Decorative jargon, unexplained acronyms, and abstractions such as `interface` when a concrete term will do.
- Calling outputs `speech`, internal states `thought`, or models `minds` in technical claims. A single editorial metaphor may use this language; the scientific explanation should not.
- Repeating the same claim in the hero, section heading, card, and footer.

If a sentence sounds like a landing-page template, replace it with a factual sentence from the paper or combine the fragments into normal prose.

## Terminology

Prefer these public-facing terms:

- `internal states` or `internal representations`
- `task-relevant information`
- `measure`, `probe`, `select`, `combine`, `classify`, `detect`, and `retrieve`
- `frozen model` or `frozen backbone` when freezing is part of the comparison
- `task-specific parameters` before introducing `probe` or `readout`

Use `probe`, `readout`, `sparse`, `early exit`, and other paper terminology where technically necessary, especially on paper pages. Do not make them umbrella slogans unless all four projects support the same statement.

The four projects are united by using internal representations for practical tasks. They are not all united by sparsity, linearity, a particular layer, or a single training regime.

Use `large language models` only where that scope is accurate. For the full four-project collection, prefer `models` or `AI models` because MINER also covers multimodal systems.

## Human and scientific analogies

Analogies should clarify measurement, not imply biological equivalence.

- Electroencephalography (EEG) is an instrumentation analogy: internal electrical activity becomes a measurable, useful signal. It is not described as literal thought-reading.
- SPIN and related methods are closer to training, calibrating, and validating a task-specific instrument than to discovering a model's complete reasoning process.
- Do not call model evaluation a `clinical trial` on the site. Use the analogy to guide the story, then describe the actual experiment.
- `Model mind-reading` may remain as the memorable brand phrase because the technical copy immediately operationalizes it.

## Historical material and quotations

Use the HLC-style editorial pattern: one real source or object, one verifiable fact, and one conceptual bridge to the research.

- Prefer primary sources and authentic historical images over decorative quotations.
- Keep quoted text verbatim and clearly attributed.
- Visually distinguish our editorial response from the historical quotation. Never make new copy look like a continuation of the source.
- Record creator, year, license, and source URL in the HTML or repository.
- Store site assets locally when licensing permits.
- Use historical material once with purpose; do not turn every section into an artifact panel.

The Turing module is the reference treatment: a short quotation from *Computing Machinery and Intelligence*, a public-domain 1951 portrait, a restrained print treatment, and a separate contemporary response.

## Evidence and claims

- Let results carry the promotional weight.
- State the comparator and evaluation scope near any headline result.
- Keep qualifiers that define the experiment, such as `among evaluated open guards`; remove generic self-protective language.
- Distinguish measured results from explanatory schematics.
- Label theoretical conversions, estimates, and measured latency according to what the paper supports.
- Use `state of the art` only when the evaluation scope justifies it.
- Expand acronyms once and provide one clear entry each for paper, code, demo, and poster.
- Keep precise numbers on paper pages. Use the homepage primarily for research titles, domains, venues, and concise summaries.

## Visual system

The visual language combines the structure of an academic research index with a restrained editorial identity.

### Typography

- Poppins: navigation, metadata, labels, and restrained display headings.
- Source Serif 4: research prose, quotations, paper titles, and editorial transitions.
- IBM Plex Mono: archival metadata, compact technical labels, and small numeric annotations.

Large type is reserved for the site identity, an attributed quotation, or a primary measured result. Ordinary section headings should not compete with the evidence.

### Color

- Paper: `#f7f7f4` and `#ffffff`
- Primary ink: `#353535`
- Secondary ink: `#585858`
- Muted metadata: `#666865`
- Archival crimson: `#863b4a`
- Link and technical accent: `#4e609e`
- Rules: low-opacity ink, never heavy card borders

Use crimson for a deliberate editorial or archival moment, not as a generic highlight on every section.

### Layout

- Favor generous whitespace, thin rules, square edges, and editorial grids.
- Use moderate headings rather than full-screen marketing statements.
- Treat the four papers as equal research entries, not product feature cards.
- Keep one clear visual hierarchy per module.
- Remove decorative elements that do not explain evidence, provenance, or navigation.

### Imagery

- Prefer paper figures, authentic archival material, and purpose-built diagrams.
- Avoid generic AI brains, glowing circuitry, stock robots, and decorative generated imagery.
- Historical portraits may use grayscale, contrast, multiply blending, halftone texture, and low opacity so they behave as print texture rather than hero photography.
- Preserve legibility of the source text and citation above any image treatment.

## Interaction

- Every interaction must explain a paper-specific idea.
- Show the main evidence without requiring hover.
- Avoid instructions when the control is self-evident.
- Do not repeat one visualization or resource in multiple persistent modules.
- Keep explanatory schematics clearly separate from measured traces.
- Respect reduced-motion preferences and provide a readable non-WebGL fallback.

## Responsive design and accessibility

- Test at desktop, tablet, and phone widths; do not accept horizontal overflow.
- Keep supporting text at approximately 14px or larger.
- Preserve logical reading order when grids stack.
- Use semantic headings, visible keyboard focus, sufficient contrast, and descriptive link labels.
- Give informative images useful alternative text. Mark texture-only portraits and graphics as decorative.
- Do not rely on color, hover, or animation as the sole carrier of information.

## Working locally

Preview from the repository root:

```bash
cd /ada1/projects/chess/maia_interp/difanj0713.github.io
python3 -m http.server 8080
```

Open `http://localhost:8080/spin-universe/`.

Before handing off a revision:

1. Run `git diff --check`.
2. Check desktop and mobile layouts for overflow and awkward wrapping.
3. Verify internal links, local assets, and interactive controls.
4. Record licensing provenance for new external assets.
5. Bump the CSS or JavaScript query version when those assets change.
6. Keep changes local until the user explicitly asks to commit or push.

## Anti-AI-slop check

Apply this deletion test to prominent copy:

> Could the sentence appear unchanged on an unrelated AI company’s homepage?

If yes, replace it with a paper-specific fact, a sourced editorial premise, or nothing.

Also revise passages built from repeated imperatives, mirrored fragments, generic contrasts, rhetorical questions without an empirical answer, or several consecutive `Statement. Punchline.` beats.

## Final review question

For every module, ask:

> Does this help a visitor understand the research, trust the evidence, or find the next useful detail?

If the answer is no, remove it.
