// components/analytics/ProjectsList.jsx
export default function ProjectsList({ projects = [], onSelect }) {
  
  // optional empty state
  if (!projects.length) {
    return (
      <div className="text-gray-500 dark:text-gray-400">
        No projects found
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {projects.map((p) => (
        <div
          key={p.id}
          onClick={() => onSelect?.(p)}
          className="p-4 border rounded-xl cursor-pointer hover:shadow bg-white dark:bg-gray-900"
        >
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {p.name || "Unnamed Project"}
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400">
            Rating: {p.rating ?? 0} ⭐
          </p>
        </div>
      ))}
    </div>
  );
}