from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Enums
class RTWStatus(str, Enum):
    VALID = "valid"
    EXPIRED = "expired"
    PENDING = "pending"
    NOT_CHECKED = "not_checked"

class RTWDocumentType(str, Enum):
    PASSPORT = "passport"
    BRP = "brp"  # Biometric Residence Permit
    SHARE_CODE = "share_code"
    VISA = "visa"
    SETTLED_STATUS = "settled_status"
    PRE_SETTLED_STATUS = "pre_settled_status"
    OTHER = "other"

class SIALicenseType(str, Enum):
    DOOR_SUPERVISOR = "door_supervisor"
    SECURITY_GUARD = "security_guard"
    CCTV = "cctv"
    CLOSE_PROTECTION = "close_protection"
    KEY_HOLDING = "key_holding"
    VEHICLE_IMMOBILISER = "vehicle_immobiliser"


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


# Right to Work Models
class RightToWorkCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_name: str
    document_type: RTWDocumentType
    document_number: str
    check_date: str  # Date when the check was performed
    expiry_date: Optional[str] = None  # When the document expires
    status: RTWStatus = RTWStatus.PENDING
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RightToWorkCreate(BaseModel):
    employee_name: str
    document_type: RTWDocumentType
    document_number: str
    check_date: str
    expiry_date: Optional[str] = None
    status: RTWStatus = RTWStatus.PENDING
    notes: Optional[str] = None

class RightToWorkUpdate(BaseModel):
    employee_name: Optional[str] = None
    document_type: Optional[RTWDocumentType] = None
    document_number: Optional[str] = None
    check_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[RTWStatus] = None
    notes: Optional[str] = None


# SIA License Models
class SIALicense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_name: str
    license_number: str
    license_type: SIALicenseType
    expiry_date: str
    is_active: bool = True
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SIALicenseCreate(BaseModel):
    employee_name: str
    license_number: str
    license_type: SIALicenseType
    expiry_date: str
    is_active: bool = True
    notes: Optional[str] = None

class SIALicenseUpdate(BaseModel):
    employee_name: Optional[str] = None
    license_number: Optional[str] = None
    license_type: Optional[SIALicenseType] = None
    expiry_date: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# ============ Right to Work Routes ============

@api_router.post("/rtw", response_model=RightToWorkCheck)
async def create_rtw_check(input: RightToWorkCreate):
    """Create a new Right to Work check record"""
    rtw_dict = input.model_dump()
    rtw_obj = RightToWorkCheck(**rtw_dict)
    
    doc = rtw_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.rtw_checks.insert_one(doc)
    return rtw_obj

@api_router.get("/rtw", response_model=List[RightToWorkCheck])
async def get_rtw_checks():
    """Get all Right to Work check records"""
    rtw_checks = await db.rtw_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in rtw_checks:
        if isinstance(check.get('created_at'), str):
            check['created_at'] = datetime.fromisoformat(check['created_at'])
        if isinstance(check.get('updated_at'), str):
            check['updated_at'] = datetime.fromisoformat(check['updated_at'])
    
    return rtw_checks

@api_router.get("/rtw/{rtw_id}", response_model=RightToWorkCheck)
async def get_rtw_check(rtw_id: str):
    """Get a specific Right to Work check record"""
    rtw_check = await db.rtw_checks.find_one({"id": rtw_id}, {"_id": 0})
    
    if not rtw_check:
        raise HTTPException(status_code=404, detail="RTW check not found")
    
    if isinstance(rtw_check.get('created_at'), str):
        rtw_check['created_at'] = datetime.fromisoformat(rtw_check['created_at'])
    if isinstance(rtw_check.get('updated_at'), str):
        rtw_check['updated_at'] = datetime.fromisoformat(rtw_check['updated_at'])
    
    return rtw_check

@api_router.put("/rtw/{rtw_id}", response_model=RightToWorkCheck)
async def update_rtw_check(rtw_id: str, input: RightToWorkUpdate):
    """Update a Right to Work check record"""
    existing = await db.rtw_checks.find_one({"id": rtw_id})
    
    if not existing:
        raise HTTPException(status_code=404, detail="RTW check not found")
    
    update_data = input.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.rtw_checks.update_one(
        {"id": rtw_id},
        {"$set": update_data}
    )
    
    updated = await db.rtw_checks.find_one({"id": rtw_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated

@api_router.delete("/rtw/{rtw_id}")
async def delete_rtw_check(rtw_id: str):
    """Delete a Right to Work check record"""
    result = await db.rtw_checks.delete_one({"id": rtw_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="RTW check not found")
    
    return {"message": "RTW check deleted successfully"}


# ============ SIA License Routes ============

@api_router.post("/sia", response_model=SIALicense)
async def create_sia_license(input: SIALicenseCreate):
    """Create a new SIA license record"""
    sia_dict = input.model_dump()
    sia_obj = SIALicense(**sia_dict)
    
    doc = sia_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.sia_licenses.insert_one(doc)
    return sia_obj

@api_router.get("/sia", response_model=List[SIALicense])
async def get_sia_licenses():
    """Get all SIA license records"""
    sia_licenses = await db.sia_licenses.find({}, {"_id": 0}).to_list(1000)
    
    for license in sia_licenses:
        if isinstance(license.get('created_at'), str):
            license['created_at'] = datetime.fromisoformat(license['created_at'])
        if isinstance(license.get('updated_at'), str):
            license['updated_at'] = datetime.fromisoformat(license['updated_at'])
    
    return sia_licenses

@api_router.get("/sia/{sia_id}", response_model=SIALicense)
async def get_sia_license(sia_id: str):
    """Get a specific SIA license record"""
    sia_license = await db.sia_licenses.find_one({"id": sia_id}, {"_id": 0})
    
    if not sia_license:
        raise HTTPException(status_code=404, detail="SIA license not found")
    
    if isinstance(sia_license.get('created_at'), str):
        sia_license['created_at'] = datetime.fromisoformat(sia_license['created_at'])
    if isinstance(sia_license.get('updated_at'), str):
        sia_license['updated_at'] = datetime.fromisoformat(sia_license['updated_at'])
    
    return sia_license

@api_router.put("/sia/{sia_id}", response_model=SIALicense)
async def update_sia_license(sia_id: str, input: SIALicenseUpdate):
    """Update an SIA license record"""
    existing = await db.sia_licenses.find_one({"id": sia_id})
    
    if not existing:
        raise HTTPException(status_code=404, detail="SIA license not found")
    
    update_data = input.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.sia_licenses.update_one(
        {"id": sia_id},
        {"$set": update_data}
    )
    
    updated = await db.sia_licenses.find_one({"id": sia_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated

@api_router.delete("/sia/{sia_id}")
async def delete_sia_license(sia_id: str):
    """Delete an SIA license record"""
    result = await db.sia_licenses.delete_one({"id": sia_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SIA license not found")
    
    return {"message": "SIA license deleted successfully"}


# ============ Dashboard Stats ============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # RTW stats
    rtw_total = await db.rtw_checks.count_documents({})
    rtw_valid = await db.rtw_checks.count_documents({"status": "valid"})
    rtw_expired = await db.rtw_checks.count_documents({"status": "expired"})
    rtw_pending = await db.rtw_checks.count_documents({"status": "pending"})
    
    # SIA stats
    sia_total = await db.sia_licenses.count_documents({})
    sia_active = await db.sia_licenses.count_documents({"is_active": True})
    sia_expiring_soon = await db.sia_licenses.count_documents({
        "expiry_date": {"$lte": today},
        "is_active": True
    })
    
    return {
        "rtw": {
            "total": rtw_total,
            "valid": rtw_valid,
            "expired": rtw_expired,
            "pending": rtw_pending
        },
        "sia": {
            "total": sia_total,
            "active": sia_active,
            "expiring_soon": sia_expiring_soon
        }
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
