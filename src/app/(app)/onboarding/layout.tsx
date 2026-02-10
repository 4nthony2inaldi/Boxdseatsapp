export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The onboarding page sits within the (app) group which has
  // AppHeader and BottomNav. We keep the header for brand presence
  // but the bottom nav is hidden by the pb-24 padding already.
  // The onboarding page provides its own navigation via step buttons.
  return <>{children}</>;
}
