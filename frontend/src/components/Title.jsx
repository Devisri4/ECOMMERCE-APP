// Callers pass uppercase strings (e.g. 'LATEST', 'COLLECTIONS'); render them as an editorial
// sentence-case serif heading: muted first part, ink second part. size='sm' for headings inside panels.
const toTitleCase = (s = '') => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase())

const Title = ({text1, text2, size = 'lg'}) => {
  const sizeClass = size === 'sm' ? 'text-[1.5rem]' : 'text-[1.9rem] sm:text-[2.4rem]'
  return (
    <h2 className={`mb-3 font-display font-normal leading-tight tracking-[-0.01em] ${sizeClass}`}>
      <span className='text-neutral-500'>{toTitleCase(text1)}</span>{' '}
      <span className='text-ink'>{toTitleCase(text2)}</span>
    </h2>
  )
}
export default Title
