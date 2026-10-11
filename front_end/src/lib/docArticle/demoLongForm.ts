/** Long-form demo copy — inspired by item-reference/front-end/Doc-reference editorial structure. */

export const DOC_ARTICLE_DEMO_LONG_FORM = {
  overview: {
    title: 'Interpretation',
    paragraphs: [
      'Design engineering represents the intersection of design and engineering disciplines, where teams work together to create digital products that are functional, delightful, and maintainable. This discipline goes beyond traditional handoffs and focuses on building a shared understanding of both design intent and technical constraints.',
      'In practice, design engineering involves iterative prototyping, rapid testing, and continuous feedback between designers and engineers. Each decision, from layout to interaction, is informed by both visual design principles and technical feasibility.',
      'By bridging the gap between design and engineering, teams can maintain high visual fidelity while ensuring robust technical implementation. Designers gain insight into performance, accessibility, and maintainability constraints, while engineers develop empathy for user experience priorities.',
    ],
  },
  difference: {
    title: 'Difference',
    paragraphs: [
      'Unlike traditional design handoffs where static mockups are passed to engineers, design engineering emphasizes shared ownership of both components and system behaviors. Interactive prototypes play a key role — teams test assumptions and validate UX choices before production code.',
      'This methodology fosters empathy across roles. Designers better understand performance limitations; engineers gain appreciation for usability and accessibility. The shift from page-centric workflows to component-centric thinking ensures each element contributes to the broader product vision.',
    ],
  },
  importance: {
    title: 'Importance',
    paragraphs: [
      'Design engineering directly impacts product quality, development speed, and team efficiency. Products built this way are more consistent, easier to maintain, and more adaptable to changing requirements.',
      'A design engineering approach enables scalable design systems — standardizing patterns, components, and workflows so organizations deliver coherent experiences across teams and platforms.',
    ],
  },
  quality: {
    title: 'Quality',
    intro:
      'Quality is a defining feature of user experience. Design engineers ensure every component is consistent, performant, and accessible from the earliest stages.',
    subsections: {
      performance: {
        title: 'Performance',
        body: 'Teams focus on optimizing load times, minimizing rendering delays, and ensuring smooth transitions. Lazy loading, code splitting, and modular structures reduce overhead so interactions feel responsive and intuitive.',
      },
      accessibility: {
        title: 'Accessibility',
        body: 'Semantic HTML, ARIA attributes, keyboard navigation, and high-contrast visuals are integrated into every component. Inclusive design considers varied devices, contexts, and abilities — accessibility is a core principle, not an afterthought.',
      },
    },
  },
  iteration: {
    title: 'Iteration',
    paragraphs: [
      'Rapid iteration is at the heart of effective design engineering. Component-driven development lets designers modify visuals while engineers implement functional changes in parallel, reducing bottlenecks and speeding delivery.',
      'Tools like Storybook and shared design files facilitate visualization, testing, and documentation. Frequent iteration encourages experimentation without committing to full-scale implementation before validation.',
    ],
  },
  components: {
    title: 'Components',
    paragraphs: [
      'Modern design engineering emphasizes reusable components rather than individual pages. Each unit has defined behavior, styling, and accessibility — visual consistency with less repetitive work.',
      'Reusable components let teams scale efficiently. Designers define usage guidelines while engineers implement modular code that adapts to new requirements without breaking existing functionality.',
    ],
  },
  motion: {
    title: 'Motion',
    paragraphs: [
      'Motion guides attention, enhances feedback, and makes interfaces feel responsive. Thoughtfully applied animations communicate hierarchy and status without distracting from primary content.',
      'Design engineers develop reusable motion patterns for consistency. Timing, easing, and visual weight are considered so transitions feel natural across the system.',
    ],
  },
  collaboration: {
    title: 'Collaboration',
    paragraphs: [
      'Effective design engineering relies on deep collaboration between designers and engineers. Shared tools, regular reviews, and transparent communication align the team on goals early.',
      'Cross-functional collaboration extends to product managers, QA, and stakeholders — reducing friction during development and creating stronger ownership across disciplines.',
    ],
  },
} as const
