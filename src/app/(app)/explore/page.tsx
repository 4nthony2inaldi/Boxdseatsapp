import ExploreSearch from "@/components/explore/ExploreSearch";

export default function ExplorePage() {
  return (
    <div className="max-w-lg mx-auto pb-5">
      <div className="px-4 pt-2 mb-3">
        <h1 className="font-display text-[22px] text-text-primary tracking-wide">
          Explore
        </h1>
      </div>
      <ExploreSearch />
    </div>
  );
}
