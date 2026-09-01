/**
 * Default style shipped with the app — the same sheet, template and sample
 * documents as `src/Core/DefaultAssets.swift` in the macOS original.
 */

/** Base style: uses only fonts installed on the system so it
    works on the first try; can be changed from the editor. Same files
    that seed the "My style" preset in `src/lib/styles/my-style/`. */
export { default as templateHTML } from './styles/my-style/template.html?raw';
export { default as css } from './styles/my-style/style.css?raw';

/** Sample document used for sidebar thumbnails. */
export const sampleMarkdown = `# Ada Lovelace

Mexico City · ada@example.com · +52 55 0000 0000 · [linkedin.com/in/ada](https://linkedin.com)

## Profile

Engineer with eight years of experience building analytical
computing systems and automation tools for small teams.

## Experience

### Lead Engineer
**Analytical Engine Co.** · *2021 — present*

- Designed the notes compiler and its PDF export pipeline.
- Cut render time by 60% through template caching.
- Mentored three members of the platform team.

### Software Engineer
**Difference Ltd.** · *2018 — 2021*

- Migrated the document pipeline to a dependency-free architecture.

## Education

### Applied Mathematics
**University of London** · *2014 — 2018*

## Skills

Swift · WebKit · Typography · Print CSS · Automation
`;

export const welcomeMarkdown = `# Document title

Write or paste your Markdown here. The panel on the left defines
how it will look when exported.

## Section

- Point one
- Point two
`;
