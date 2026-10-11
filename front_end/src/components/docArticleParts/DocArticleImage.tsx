type DocArticleImageProps = {
  src: string
  alt: string
  caption?: string
  className?: string
}

export function DocArticleImage({ src, alt, caption, className = '' }: DocArticleImageProps) {
  return (
    <figure className={['theme-doc-article__figure', className].filter(Boolean).join(' ')}>
      <div className="theme-doc-article__figure-frame">
        <img src={src} alt={alt} className="theme-doc-article__figure-image" loading="lazy" decoding="async" />
      </div>
      {caption ? (
        <figcaption className="theme-doc-article__figure-caption type-caption type-faint">{caption}</figcaption>
      ) : null}
    </figure>
  )
}
