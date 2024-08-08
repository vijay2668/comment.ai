import { clsx } from "clsx";
import { BsQuestionDiamond } from "react-icons/bs";
import { FiFlag, FiThumbsDown, FiThumbsUp } from "react-icons/fi";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

export const customStyles = {
  content: {
    width: "fit-content",
    height: "fit-content",
    padding: "0",
    backgroundColor: "transparent",
    border: "none",
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
    "--tw-shadow":
      "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    "--tw-shadow-colored":
      "0 20px 25px -5px var(--tw-shadow-color), 0 8px 10px -6px var(--tw-shadow-color)",
    boxShadow:
      "var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)",
  },
};

export const commentHeaders = [
  "cid",
  "text",
  "time",
  "author",
  "channel",
  "votes",
  "replies",
  "photo",
  "heart",
  "reply",
  "publishedAt"
]

export const fileTypes = [
  "txt",
  "html",
  "json",
  "csv",
  "xls"
]

export const sentimentKeys = [
  "positives",
  "negatives",
  "questions",
  "neutrals",
  "comments",
];

export const data = (data) => {
  return {
    responsive: true,
    labels: ["Positive", "Negative", "Question", "Neutral"],
    datasets: [
      {
        label: "Poll",
        data,
        backgroundColor: ["#22c55e", "#ef4444", "#3b82f6", "#6b7280"],
        borderColor: ["#0E1420", "#0E1420", "#0E1420", "#0E1420"],
        hoverOffset: 5,
        dataVisibility: new Array(data.length).fill(true),
      },
    ],
  };
  
}

export const textCenter = (comments) => {
  return {
    id: "textCenter",
    beforeDatasetsDraw(chart, args, pluginOptions) {
      const { ctx, data } = chart;
      ctx.save();
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `Total: ${comments?.length}`,
        chart.getDatasetMeta(0).data[0].x,
        chart.getDatasetMeta(0).data[0].y,
      );
    },
  };
}

export const progressbarData = ({ comments, sentiment }) => {
  const totalComments = comments?.length || 0;

  return [
    {
      count: sentiment?.positives?.length || 0,
      label: "Positive",
      color: "#22c55e",
      percentage: totalComments ? Math.floor((sentiment?.positives?.length || 0) / totalComments * 100) : 0,
      icon: FiThumbsUp,
    },
    {
      count: sentiment?.negatives?.length || 0,
      label: "Negative",
      color: "#ef4444",
      percentage: totalComments ? Math.floor((sentiment?.negatives?.length || 0) / totalComments * 100) : 0,
      icon: FiThumbsDown,
    },
    {
      count: sentiment?.questions?.length || 0,
      label: "Question",
      color: "#3b82f6",
      percentage: totalComments ? Math.floor((sentiment?.questions?.length || 0) / totalComments * 100) : 0,
      icon: BsQuestionDiamond,
    },
    {
      count: sentiment?.neutrals?.length || 0,
      label: "Neutral",
      color: "#6b7280",
      percentage: totalComments ? Math.floor((sentiment?.neutrals?.length || 0) / totalComments * 100) : 0,
      icon: FiFlag,
    },
  ];
};
