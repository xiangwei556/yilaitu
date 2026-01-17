from fastapi import APIRouter

from .category import router as category_router
from .model_ref import router as model_ref_router
from .scene import router as scene_router
from .pose import router as pose_router
from .background import router as background_router

router = APIRouter()

router.include_router(category_router, tags=["Category"])
router.include_router(model_ref_router, tags=["Model Reference"])
router.include_router(scene_router, tags=["Scene"])
router.include_router(pose_router, tags=["Pose"])
router.include_router(background_router, tags=["Background"])
