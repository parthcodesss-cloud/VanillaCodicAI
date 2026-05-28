import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

export default function SkillRadar({ radarData }) {
  if (!radarData) return null;

  const data = {
    labels: radarData.labels,
    datasets: [
      {
        label: "Skill Level",
        data: radarData.data,
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        borderColor: "rgba(129, 140, 248, 0.8)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(129, 140, 248, 1)",
        pointBorderColor: "#1a1a2e",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
    scales: {
      r: {
        beginAtZero: true,
        suggestedMin: 0,
        suggestedMax: 100,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 25,
          display: false,
        },
        grid: {
          color: "rgba(255, 255, 255, 0.06)",
        },
        angleLines: {
          color: "rgba(255, 255, 255, 0.06)",
        },
        pointLabels: {
          color: "rgba(148, 163, 184, 0.9)",
          font: { size: 10, family: "Inter", weight: "500" },
        },
      },
    },
  };

  return (
    <div style={{ width: "100%", maxWidth: 260, margin: "0 auto" }}>
      <Radar data={data} options={options} />
    </div>
  );
}
