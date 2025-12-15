/**
 * AdminLayout - Layout chuẩn cho các trang Admin
 * 
 * Cấu trúc:
 * - Container: h-[calc(100vh-64px)] flex flex-col overflow-hidden
 * - Header (toolbar): flex-none (cố định)
 * - Content: flex-1 overflow-y-auto (scrollable)
 * 
 * Giải quyết:
 * - Header không bị mất khi scroll
 * - Modal không bị cắt/tràn màn hình
 * - Scroll mượt mà trong content area
 */

export default function AdminLayout({ children, className = "" }) {
  return (
    <div className={`h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-gray-50 ${className}`}>
      {children}
    </div>
  );
}

/**
 * AdminHeader - Header/Toolbar cố định cho trang Admin
 * Sử dụng: <AdminHeader>...</AdminHeader>
 */
export function AdminHeader({ children, className = "" }) {
  return (
    <div className={`flex-none p-4 md:p-6 bg-white border-b border-gray-200 shadow-sm z-10 ${className}`}>
      {children}
    </div>
  );
}

/**
 * AdminContent - Content area scrollable cho trang Admin
 * Sử dụng: <AdminContent>...</AdminContent>
 */
export function AdminContent({ children, className = "" }) {
  return (
    <div className={`flex-1 overflow-y-auto p-4 md:p-6 relative ${className}`}>
      {children}
    </div>
  );
}

