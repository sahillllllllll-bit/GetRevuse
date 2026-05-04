// components/analytics/ProjectDetails.jsx
import RatingChart from "./RatingChart";

export default function ProjectDetails({ project, onBack }) {
  return (
    <div className="space-y-6">

      <button onClick={onBack} className="text-blue-600">
        ← Back
      </button>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow">

        <h2 className="text-xl font-semibold mb-2">
          {project.name}
        </h2>

        <p className="text-sm text-gray-500 mb-4">
          Plan: {project.plan}
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>Total Reviews: {project.totalReviews}</div>
          <div>Positive: {project.positive}</div>
          <div>Negative: {project.negative}</div>
          <div>Avg Rating: {project.rating}</div>
        </div>
      </div>

      {/* Chart */}
      <RatingChart data={project.chartData} />
    </div>
  );
}