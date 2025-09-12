// A simple text-based logo component for C9N.AI
export function C9nLogo({ className }: { className?: string }) {
  return (
    <span className={`font-bold text-2xl tracking-tight ${className}`}>
      C<span className="text-[#2CE4B8]">9</span>N.AI
    </span>
  )
}

// You can add more complex SVG icons here if needed.
