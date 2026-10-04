from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.db.session import get_db
from app.models.catalog import Hospital, Region, Specialization
from app.models.clinical import Drug
from app.models.enums import UserRole
from app.models.user_account import UserAccount
from app.schemas.misc import DrugImageUpdate, DrugOut

router = APIRouter(tags=["catalog"])


@router.get("/regions")
def list_regions(db: Session = Depends(get_db)):
    """Public — needed for registration forms (logged-out users)."""
    return db.query(Region).all()


@router.get("/hospitals")
def list_hospitals(region_id: int | None = None, db: Session = Depends(get_db)):
    """Public — needed for doctor/admin registration forms (logged-out users)."""
    q = db.query(Hospital)
    if region_id:
        q = q.filter_by(region_id=region_id)
    return q.all()


@router.get("/specializations")
def list_specializations(db: Session = Depends(get_db)):
    """Public — needed for doctor registration form (logged-out users)."""
    return db.query(Specialization).all()


@router.get("/drugs", response_model=list[DrugOut])
def list_drugs(search: str | None = None, db: Session = Depends(get_db), _: UserAccount = Depends(get_current_user)):
    q = db.query(Drug)
    if search:
        q = q.filter(Drug.name.ilike(f"%{search}%"))
    return q.limit(100).all()


@router.get("/drugs/{drug_id}", response_model=DrugOut)
def get_drug(drug_id: int, db: Session = Depends(get_db), _: UserAccount = Depends(get_current_user)):
    drug = db.get(Drug, drug_id)
    if not drug:
        raise HTTPException(404, "Drug not found")
    return drug


@router.patch("/drugs/{drug_id}", response_model=DrugOut)
def update_drug_image(drug_id: int, data: DrugImageUpdate, db: Session = Depends(get_db),
                      _: UserAccount = Depends(require_role(UserRole.HOSPITAL_ADMIN))):
    drug = db.get(Drug, drug_id)
    if not drug:
        raise HTTPException(404, "Drug not found")
    if data.image_url is not None:
        drug.image_url = data.image_url
    db.commit()
    db.refresh(drug)
    return drug
