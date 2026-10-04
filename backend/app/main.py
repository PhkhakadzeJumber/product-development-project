from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, appointments, catalog, clinical, doctors, feedback_chat, slots
from app.core.config import settings

app = FastAPI(title="Hospital Appointment & Treatment Tracking API")

origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


for r in (auth.router, catalog.router, doctors.router, slots.router,
          appointments.router, clinical.router, feedback_chat.router):
    app.include_router(r, prefix="/api/v1")
