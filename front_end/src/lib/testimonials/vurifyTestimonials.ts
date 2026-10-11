export type VurifyTestimonial = {
  id: string
  quote: string
  name: string
  role: string
  rating: 1 | 2 | 3 | 4 | 5
  image: {
    src: string
    alt: string
  }
}

/** Fixture testimonials — swap for live copy later; shape stays stable. */
export const VURIFY_TESTIMONIALS: readonly VurifyTestimonial[] = [
  {
    id: 'maya',
    quote: 'I stopped explaining my résumé and started showing the work. Interviews finally felt fair.',
    name: 'Maya Chen',
    role: 'Product designer',
    rating: 5,
    image: {
      src: 'https://picsum.photos/seed/vurify-testimonial-maya/320/320',
      alt: 'Portrait of Maya Chen',
    },
  },
  {
    id: 'jordan',
    quote: 'Shortlists got sharper overnight. We argue about fit, not guesswork.',
    name: 'Jordan Hale',
    role: 'Hiring lead',
    rating: 5,
    image: {
      src: 'https://picsum.photos/seed/vurify-testimonial-jordan/320/320',
      alt: 'Portrait of Jordan Hale',
    },
  },
  {
    id: 'samira',
    quote: 'The proof trail made my case studies readable in minutes. Recruiters actually replied.',
    name: 'Samira Okonkwo',
    role: 'Full-stack engineer',
    rating: 4,
    image: {
      src: 'https://picsum.photos/seed/vurify-testimonial-samira/320/320',
      alt: 'Portrait of Samira Okonkwo',
    },
  },
  {
    id: 'eli',
    quote: 'We closed roles faster because the interview already carried signal.',
    name: 'Eli Park',
    role: 'People ops',
    rating: 5,
    image: {
      src: 'https://picsum.photos/seed/vurify-testimonial-eli/320/320',
      alt: 'Portrait of Eli Park',
    },
  },
]
