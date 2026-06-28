from fastapi import APIRouter
from app.services.logger import get_logs
from app.services.booking import get_all_bookings

router = APIRouter()


@router.get("/admin/logs")
def admin_logs(limit: int = 100):
    logs = get_logs(limit)
    return {"total": len(logs), "logs": logs}


@router.get("/booking/all")
def all_bookings():
    bookings = get_all_bookings()
    return {"total": len(bookings), "bookings": bookings}
