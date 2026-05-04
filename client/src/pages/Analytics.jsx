// pages/Analytics.jsx
import { useEffect, useState } from "react";
import StatsCards from "../components/analytics/StatsCards";
import ProjectsList from "../components/analytics/ProjectsList";
import ProjectDetails from "../components/analytics/ProjectDetails";
import { fetchAnalytics } from "../services/analyticsService";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics()
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-6">

      {/* TOP STATS */}
      <StatsCards stats={data.stats} />

      {!selectedProject ? (
        <ProjectsList
          projects={data.projects}
          onSelect={setSelectedProject}
        />
      ) : (
        <ProjectDetails
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
}