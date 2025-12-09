import { cn } from "../../lib/utils";

// Thêm ...props vào để nhận onClick, onMouseEnter...
export default function Card({ children, className = "", noPadding = false, ...props }) {
  return (
    <div 
      className={cn(
        "bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-200",
        !noPadding && "p-6",
        className
      )}
      {...props} // Dòng quan trọng: Truyền tất cả các props còn lại (như onClick) vào thẻ div
    >
      {children}
    </div>
  );
}