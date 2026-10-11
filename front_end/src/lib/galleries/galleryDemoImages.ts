import type { GalleryExpandItem } from './galleryExpand'

/** Theme gallery showcase demo pool — Unsplash URLs shared with landing placeholders. */
export const GALLERY_DEMO_IMAGES: readonly GalleryExpandItem[] = [
  {
    src: 'https://images.unsplash.com/photo-1505515888495-c1897b0b5740?q=80&w=1740&auto=format&fit=crop',
    alt: 'Richly colored building with a beautiful sky',
    num: '01',
    title: 'City bloom',
    text: 'Warm facades against an open sky — tap to expand; drag or scroll to dismiss.',
  },
  {
    src: 'https://images.unsplash.com/photo-1521464302861-ce943915d1c3?q=80&w=1742&auto=format&fit=crop',
    alt: 'Golden Gate bridge at golden hour',
    num: '02',
    title: 'Golden hour',
    text: 'Suspension lines and amber light.',
  },
  {
    src: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1740&auto=format&fit=crop',
    alt: 'Orange petaled flowers',
  },
  {
    src: 'https://images.unsplash.com/photo-1496293455970-f8581aae0e3b?q=80&w=2013&auto=format&fit=crop',
    alt: 'Gray turntable playing',
    num: '04',
    title: 'On rotation',
    text: 'Image-only slides work too — omit title and text on the item.',
  },
  {
    src: 'https://images.unsplash.com/photo-1517784229726-7b866d820438?q=80&w=1733&auto=format&fit=crop',
    alt: 'Group of penguins',
  },
  {
    src: 'https://images.unsplash.com/photo-1481414981591-5732874c7193?q=80&w=1746&auto=format&fit=crop',
    alt: 'High-angle photography of stairs',
  },
  {
    src: 'https://images.unsplash.com/photo-1625794084867-8ddd239946b1?q=80&w=1740&auto=format&fit=crop',
    alt: 'Close-up photography of dog',
  },
  {
    src: 'https://images.unsplash.com/photo-1504275107627-0c2ba7a43dba?q=80&w=1974&auto=format&fit=crop',
    alt: 'Assorted color lockers',
  },
  {
    src: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?q=80&w=1752&auto=format&fit=crop',
    alt: 'Brown coated monkey on branch',
  },
  {
    src: 'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?q=80&w=1740&auto=format&fit=crop',
    alt: 'Mountain range with a lake in the foreground',
  },
  {
    src: 'https://images.unsplash.com/photo-1532798210189-ca8e366884b9?q=80&w=1740&auto=format&fit=crop',
    alt: 'Low angle photography of gray concrete building',
  },
]

/** Resize Unsplash `w=` for hero / carousel slots. */
export function galleryDemoImageSrc(src: string, width: number): string {
  const url = new URL(src)
  url.searchParams.set('w', String(width))
  return url.toString()
}

/** Landing hero + profile nav — gallery index 6 (“Portrait study” in showcase). */
export const GALLERY_DEMO_PORTRAIT_SRC = galleryDemoImageSrc(GALLERY_DEMO_IMAGES[6].src, 960)
