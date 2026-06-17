type SectionLabelProps = {
  children: React.ReactNode;
  /** aria-level hint for assistive tech when nesting differs from the default <h2>. */
  level?: 2 | 3;
};

export default function SectionLabel({ children, level }: SectionLabelProps) {
  return (
    <h2
      aria-level={level}
      className="font-display text-[13px] text-text-muted tracking-[2px] uppercase mb-2.5"
    >
      {children}
    </h2>
  );
}
