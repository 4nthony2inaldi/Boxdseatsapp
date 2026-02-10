type SectionLabelProps = {
  children: React.ReactNode;
};

export default function SectionLabel({ children }: SectionLabelProps) {
  return (
    <div className="font-display text-[13px] text-text-muted tracking-[2px] uppercase mb-2.5">
      {children}
    </div>
  );
}
