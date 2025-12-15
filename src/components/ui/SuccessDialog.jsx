import { createPortal } from "react-dom";
import { CheckCircle, X } from "lucide-react";
import Button from "./Button";

export default function SuccessDialog({ title, message, bookingCode, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      ></div>

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-zoom-in z-10">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
          {title || "Thành công!"}
        </h3>

        {/* Message */}
        <div className="text-center space-y-2 mb-6">
          <p className="text-gray-700">{message}</p>
          {bookingCode && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-gray-600 mb-1">Mã booking:</p>
              <p className="text-lg font-bold text-orange-600">{bookingCode}</p>
            </div>
          )}
        </div>

        {/* Button */}
        <Button
          onClick={onClose}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          Đã hiểu
        </Button>
      </div>
    </div>,
    document.body
  );
}

