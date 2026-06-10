import BucketCard from "./BucketCard";

export default function GapBuckets({ gaps, buckets, setBuckets }) {
  return (
    <div className="flex-1 flex gap-3 overflow-x-auto">
      {buckets.map((bucket) => (
        <BucketCard
          key={bucket.id}
          bucket={bucket}
          gaps={gaps.filter((g) => bucket.gaps.includes(g.id))}
        />
      ))}

      {/* Add New Bucket Placeholder */}
      <div className="flex-1 min-w-[200px] flex items-center justify-center border-2 border-dashed border-primary rounded-lg bg-primary/10 cursor-pointer hover:bg-primary/20">
        <span className="text-primary fw-bold">+ Add Bucket</span>
      </div>
    </div>
  );
}
