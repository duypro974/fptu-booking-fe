import { useEffect, useState } from "react";
import { api } from "../../services/api";
import Badge from "../../components/ui/Badge";
import Card from "../../components/ui/Card";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    api.getMyBookings().then(data => setBookings(data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Lịch sử đặt phòng</h1>
      
      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-600">Phòng</th>
              <th className="p-4 font-medium text-gray-600">Thời gian</th>
              <th className="p-4 font-medium text-gray-600">Slot</th>
              <th className="p-4 font-medium text-gray-600 text-right">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bookings.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{item.roomName}</td>
                <td className="p-4 text-gray-600">{item.date}</td>
                <td className="p-4 text-gray-600">{item.slot}</td>
                <td className="p-4 text-right">
                  <Badge type={
                    item.status === 'approved' ? 'success' : 
                    item.status === 'rejected' ? 'danger' : 'warning'
                  }>
                    {item.status === 'approved' ? 'Thành công' : 
                     item.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt'}
                  </Badge>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">Chưa có lịch sử đặt phòng nào.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}