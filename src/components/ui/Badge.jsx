import { cn } from "../../lib/utils";

export default function Badge({ children, type = "default" }) {
  const types = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-700",
    secondary: "bg-gray-200 text-gray-700",
  };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", types[type])}>
      {children}
    </span>
  );
}