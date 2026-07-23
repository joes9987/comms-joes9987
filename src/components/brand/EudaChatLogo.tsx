export function EudaChatLogo ({ className }: { className?: string }) {
  return (
    <span className={className ? `brand-mark ${className}` : 'brand-mark'} aria-hidden="true">
      EC
    </span>
  )
}
