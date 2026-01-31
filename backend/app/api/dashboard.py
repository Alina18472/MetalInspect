from fastapi import APIRouter

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_stats():
    return {
        "total_ingots": 1247,
        "defects_found": 18,
        "defect_rate": 1.44,
        "avg_confidence": 94.7
    }
