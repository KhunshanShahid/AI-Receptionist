from fastapi import APIRouter
from app.services.logger import get_logs

router = APIRouter()


@router.get("/admin/logs")
def admin_logs(limit: int = 100):
    logs = get_logs(limit)
    return {"total": len(logs), "logs": logs}
