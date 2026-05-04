// components/analytics/StatsCards.jsx
export default function StatsCards({ stats }) {
  // fallback to prevent crash
  const safeStats = stats || {};

  const items = [
    { label: "Total Reviews", value: safeStats.totalReviews ?? 0 },
    { label: "Positive", value: safeStats.positive ?? 0 },
    { label: "Negative", value: safeStats.negative ?? 0 },
    { label: "Auto Replies", value: safeStats.autoReplies ?? 0 },
    { label: "Pending Approval", value: safeStats.pending ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {item.label}
          </p>

          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}