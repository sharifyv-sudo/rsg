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
import hashlib

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

# ========== Auth Configuration ==========
# Admin credentials
ADMIN_EMAIL = "info@rightservicegroup.co.uk"
ADMIN_PASSWORD_HASH = hashlib.sha256("LondonE7".encode()).hexdigest()

# Default password for new staff members
DEFAULT_STAFF_PASSWORD = "RSG2025"

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    user_type: Optional[str] = None  # "admin" or "staff"
    user_id: Optional[str] = None
    user_name: Optional[str] = None

class TimeClockEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    clock_in: str  # ISO datetime
    clock_out: Optional[str] = None  # ISO datetime
    date: str  # YYYY-MM-DD
    hours_worked: Optional[float] = None
    job_id: Optional[str] = None
    job_name: Optional[str] = None
    notes: Optional[str] = None
    clock_in_latitude: Optional[float] = None
    clock_in_longitude: Optional[float] = None
    clock_out_latitude: Optional[float] = None
    clock_out_longitude: Optional[float] = None
    location_verified: bool = False

class ClockInRequest(BaseModel):
    job_id: str  # Required - must specify which job
    latitude: float  # Required - GPS latitude
    longitude: float  # Required - GPS longitude
    notes: Optional[str] = None

class ClockOutRequest(BaseModel):
    latitude: float  # Required - GPS latitude
    longitude: float  # Required - GPS longitude
    notes: Optional[str] = None

class JobSignupRequest(BaseModel):
    job_id: str

# ========== Models ==========

class Contract(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    client: str
    budget: float  # Total budget in GBP
    start_date: str  # ISO date string
    end_date: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"  # active, completed, on_hold
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContractCreate(BaseModel):
    name: str
    client: str
    budget: float
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"

class ContractUpdate(BaseModel):
    name: Optional[str] = None
    client: Optional[str] = None
    budget: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None  # Contact number
    department: str
    position: str
    annual_salary: float  # In GBP
    hourly_rate: Optional[float] = None  # For job-based pay
    contract_id: Optional[str] = None  # Assigned contract
    bank_account: Optional[str] = None
    sort_code: Optional[str] = None
    tax_code: Optional[str] = "1257L"  # Default UK tax code
    ni_number: Optional[str] = None
    availability: str = "available"  # available, unavailable, on_leave
    password_hash: Optional[str] = None  # For staff portal login
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    department: str
    position: str
    annual_salary: float
    hourly_rate: Optional[float] = None
    contract_id: Optional[str] = None
    bank_account: Optional[str] = None
    sort_code: Optional[str] = None
    tax_code: Optional[str] = "1257L"
    ni_number: Optional[str] = None
    availability: str = "available"

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    annual_salary: Optional[float] = None
    contract_id: Optional[str] = None
    bank_account: Optional[str] = None
    sort_code: Optional[str] = None
    tax_code: Optional[str] = None
    ni_number: Optional[str] = None
    availability: Optional[str] = None

class Deduction(BaseModel):
    name: str
    amount: float

class Payslip(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    period_month: int  # 1-12
    period_year: int
    gross_salary: float  # Monthly gross
    tax_deduction: float = 0.0  # PAYE (optional)
    ni_deduction: float = 0.0  # National Insurance (optional)
    other_deductions: List[Deduction] = []
    bonuses: float = 0.0
    net_salary: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PayslipCreate(BaseModel):
    employee_id: str
    period_month: int
    period_year: int
    tax_deduction: float = 0.0
    ni_deduction: float = 0.0
    other_deductions: List[Deduction] = []
    bonuses: float = 0.0

class DashboardStats(BaseModel):
    total_employees: int
    total_monthly_payroll: float
    average_salary: float
    departments: List[dict]
    recent_payslips: List[dict]

# ========== Job/Event Models ==========

JOB_TYPES = ["Steward", "Security", "Event Staff", "Hospitality", "Cleaning", "Parking", "Other"]

# Maximum distance in meters for clock in/out
MAX_CLOCK_DISTANCE_METERS = 500

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates in meters using Haversine formula"""
    import math
    R = 6371000  # Earth's radius in meters
    
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

class AssignedEmployee(BaseModel):
    employee_id: str
    employee_name: str
    position: str
    phone: Optional[str] = None

class Job(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Arsenal vs Chelsea - Emirates Stadium"
    client: str  # Client name
    date: str  # Job date (ISO string)
    location: str
    latitude: Optional[float] = None  # GPS latitude
    longitude: Optional[float] = None  # GPS longitude
    start_time: str  # e.g., "09:00"
    end_time: str  # e.g., "18:00"
    job_type: str  # Steward, Security, etc.
    staff_required: int
    hourly_rate: float  # Pay rate per hour in GBP
    notes: Optional[str] = None
    assigned_employees: List[AssignedEmployee] = []
    status: str = "upcoming"  # upcoming, in_progress, completed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JobCreate(BaseModel):
    name: str
    client: str
    date: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_time: str
    end_time: str
    job_type: str
    staff_required: int
    hourly_rate: float
    notes: Optional[str] = None
    status: str = "upcoming"

class JobUpdate(BaseModel):
    name: Optional[str] = None
    client: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    job_type: Optional[str] = None
    staff_required: Optional[int] = None
    hourly_rate: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class AssignEmployeesRequest(BaseModel):
    employee_ids: List[str]

# ========== Auth Endpoints ==========

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Authenticate user with shared credentials"""
    password_hash = hashlib.sha256(request.password.encode()).hexdigest()
    
    if request.email.lower() == ADMIN_EMAIL.lower() and password_hash == ADMIN_PASSWORD_HASH:
        # Generate a simple session token
        token = hashlib.sha256(f"{request.email}{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()
        return LoginResponse(
            success=True,
            message="Login successful",
            token=token,
            user_type="admin",
            user_id="admin",
            user_name="Administrator"
        )
    
    # Check if it's a staff member login
    employee = await db.employees.find_one({"email": {"$regex": f"^{request.email}$", "$options": "i"}}, {"_id": 0})
    if employee:
        # Check password - use stored hash or default
        stored_hash = employee.get('password_hash')
        if not stored_hash:
            # Use default password for new staff
            stored_hash = hashlib.sha256(DEFAULT_STAFF_PASSWORD.encode()).hexdigest()
        
        if password_hash == stored_hash:
            token = hashlib.sha256(f"{request.email}{datetime.now(timezone.utc).isoformat()}".encode()).hexdigest()
            return LoginResponse(
                success=True,
                message="Login successful",
                token=token,
                user_type="staff",
                user_id=employee['id'],
                user_name=employee['name']
            )
    
    raise HTTPException(status_code=401, detail="Invalid email or password")

@api_router.get("/auth/verify")
async def verify_token():
    """Verify if user is authenticated (token checked on frontend)"""
    return {"valid": True}

# ========== Staff Portal Endpoints ==========

@api_router.get("/staff/{employee_id}/jobs")
async def get_staff_assigned_jobs(employee_id: str):
    """Get jobs assigned to a specific staff member"""
    jobs = await db.jobs.find({}, {"_id": 0}).to_list(1000)
    assigned_jobs = []
    for job in jobs:
        for emp in job.get('assigned_employees', []):
            if emp.get('employee_id') == employee_id:
                assigned_jobs.append(job)
                break
    return assigned_jobs

@api_router.get("/staff/{employee_id}/available-jobs")
async def get_available_jobs_for_staff(employee_id: str):
    """Get jobs that staff can sign up for (upcoming, not full, not already assigned)"""
    jobs = await db.jobs.find({"status": "upcoming"}, {"_id": 0}).to_list(1000)
    available_jobs = []
    for job in jobs:
        assigned_ids = [e.get('employee_id') for e in job.get('assigned_employees', [])]
        # Show jobs that aren't full and staff isn't already assigned to
        if len(assigned_ids) < job.get('staff_required', 0) and employee_id not in assigned_ids:
            job['spots_remaining'] = job.get('staff_required', 0) - len(assigned_ids)
            available_jobs.append(job)
    return available_jobs

@api_router.post("/staff/{employee_id}/signup-job")
async def staff_signup_for_job(employee_id: str, request: JobSignupRequest):
    """Staff member signs up for an available job"""
    # Get the employee
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get the job
    job = await db.jobs.find_one({"id": request.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if already assigned
    assigned_ids = [e.get('employee_id') for e in job.get('assigned_employees', [])]
    if employee_id in assigned_ids:
        raise HTTPException(status_code=400, detail="Already signed up for this job")
    
    # Check if job is full
    if len(assigned_ids) >= job.get('staff_required', 0):
        raise HTTPException(status_code=400, detail="Job is fully staffed")
    
    # Add employee to job
    new_assignment = {
        "employee_id": employee['id'],
        "employee_name": employee['name'],
        "position": employee['position'],
        "phone": employee.get('phone', '')
    }
    
    await db.jobs.update_one(
        {"id": request.job_id},
        {"$push": {"assigned_employees": new_assignment}}
    )
    
    return {"message": "Successfully signed up for job", "job_name": job['name']}

@api_router.post("/staff/{employee_id}/withdraw-job/{job_id}")
async def staff_withdraw_from_job(employee_id: str, job_id: str):
    """Staff member withdraws from a job"""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Remove employee from assigned list
    await db.jobs.update_one(
        {"id": job_id},
        {"$pull": {"assigned_employees": {"employee_id": employee_id}}}
    )
    
    return {"message": "Successfully withdrawn from job"}

@api_router.get("/staff/{employee_id}/payslips")
async def get_staff_payslips(employee_id: str):
    """Get payslips for a specific staff member"""
    payslips = await db.payslips.find({"employee_id": employee_id}, {"_id": 0}).to_list(100)
    for ps in payslips:
        if isinstance(ps.get('created_at'), str):
            ps['created_at'] = datetime.fromisoformat(ps['created_at'])
    return sorted(payslips, key=lambda x: (x.get('period_year', 0), x.get('period_month', 0)), reverse=True)

@api_router.get("/staff/{employee_id}/timeclock")
async def get_staff_timeclock(employee_id: str):
    """Get time clock entries for a staff member"""
    entries = await db.timeclock.find({"employee_id": employee_id}, {"_id": 0}).to_list(100)
    return sorted(entries, key=lambda x: x.get('clock_in', ''), reverse=True)

@api_router.post("/staff/{employee_id}/clock-in")
async def staff_clock_in(employee_id: str, request: ClockInRequest):
    """Staff member clocks in"""
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check if already clocked in today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.timeclock.find_one({
        "employee_id": employee_id,
        "date": today,
        "clock_out": None
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already clocked in today")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Get job name if provided
    job_name = None
    if request.job_id:
        job = await db.jobs.find_one({"id": request.job_id}, {"_id": 0})
        if job:
            job_name = job.get('name')
    
    entry = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_id,
        "employee_name": employee['name'],
        "clock_in": now,
        "clock_out": None,
        "date": today,
        "hours_worked": None,
        "job_id": request.job_id,
        "job_name": job_name,
        "notes": request.notes
    }
    
    await db.timeclock.insert_one(entry)
    return {"message": "Clocked in successfully", "clock_in": now}

@api_router.post("/staff/{employee_id}/clock-out")
async def staff_clock_out(employee_id: str, request: ClockOutRequest):
    """Staff member clocks out"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find open clock-in entry
    entry = await db.timeclock.find_one({
        "employee_id": employee_id,
        "date": today,
        "clock_out": None
    })
    
    if not entry:
        raise HTTPException(status_code=400, detail="No active clock-in found for today")
    
    now = datetime.now(timezone.utc)
    clock_in_time = datetime.fromisoformat(entry['clock_in'].replace('Z', '+00:00'))
    hours_worked = round((now - clock_in_time).total_seconds() / 3600, 2)
    
    await db.timeclock.update_one(
        {"id": entry['id']},
        {"$set": {
            "clock_out": now.isoformat(),
            "hours_worked": hours_worked,
            "notes": request.notes or entry.get('notes')
        }}
    )
    
    return {"message": "Clocked out successfully", "hours_worked": hours_worked}

@api_router.get("/staff/{employee_id}/status")
async def get_staff_clock_status(employee_id: str):
    """Check if staff is currently clocked in"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entry = await db.timeclock.find_one({
        "employee_id": employee_id,
        "date": today,
        "clock_out": None
    }, {"_id": 0})
    
    return {
        "is_clocked_in": entry is not None,
        "current_entry": entry
    }

@api_router.post("/staff/{employee_id}/change-password")
async def staff_change_password(employee_id: str, old_password: str, new_password: str):
    """Staff member changes their password"""
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify old password
    stored_hash = employee.get('password_hash') or hashlib.sha256(DEFAULT_STAFF_PASSWORD.encode()).hexdigest()
    if hashlib.sha256(old_password.encode()).hexdigest() != stored_hash:
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    # Update password
    new_hash = hashlib.sha256(new_password.encode()).hexdigest()
    await db.employees.update_one({"id": employee_id}, {"$set": {"password_hash": new_hash}})
    
    return {"message": "Password changed successfully"}

# ========== Employee Endpoints ==========

@api_router.get("/")
async def root():
    return {"message": "Payroll System API - British Pound (£)"}

@api_router.get("/employees")
async def get_employees():
    employees = await db.employees.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    for emp in employees:
        if isinstance(emp.get('created_at'), str):
            emp['created_at'] = datetime.fromisoformat(emp['created_at'])
    return employees

@api_router.get("/employees/available")
async def get_available_employees(job_date: Optional[str] = None):
    """Get employees with their availability status for a given date"""
    employees = await db.employees.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    # Get all jobs on that date to check who's already assigned
    assigned_employee_ids = set()
    if job_date:
        jobs_on_date = await db.jobs.find({"date": job_date}, {"_id": 0}).to_list(1000)
        for job in jobs_on_date:
            for assigned in job.get('assigned_employees', []):
                assigned_employee_ids.add(assigned.get('employee_id'))
    
    # Add assignment status to employees
    for emp in employees:
        emp['is_assigned_on_date'] = emp['id'] in assigned_employee_ids
        if isinstance(emp.get('created_at'), str):
            emp['created_at'] = datetime.fromisoformat(emp['created_at'])
    
    return employees

@api_router.post("/employees", response_model=Employee)
async def create_employee(input: EmployeeCreate):
    employee_dict = input.model_dump()
    employee = Employee(**employee_dict)
    
    doc = employee.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.employees.insert_one(doc)
    return employee

@api_router.get("/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if isinstance(employee.get('created_at'), str):
        employee['created_at'] = datetime.fromisoformat(employee['created_at'])
    return employee

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, input: EmployeeUpdate):
    existing = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.employees.update_one({"id": employee_id}, {"$set": update_data})
    
    updated = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str):
    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}

# ========== Payslip Endpoints ==========

@api_router.get("/payslips", response_model=List[Payslip])
async def get_payslips():
    payslips = await db.payslips.find({}, {"_id": 0}).to_list(1000)
    for ps in payslips:
        if isinstance(ps.get('created_at'), str):
            ps['created_at'] = datetime.fromisoformat(ps['created_at'])
    return payslips

@api_router.post("/payslips", response_model=Payslip)
async def create_payslip(input: PayslipCreate):
    # Get employee
    employee = await db.employees.find_one({"id": input.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Calculate monthly gross
    monthly_gross = employee['annual_salary'] / 12
    
    # Calculate total deductions
    other_deductions_total = sum(d.amount for d in input.other_deductions)
    total_deductions = input.tax_deduction + input.ni_deduction + other_deductions_total
    
    # Calculate net salary
    net_salary = monthly_gross + input.bonuses - total_deductions
    
    payslip = Payslip(
        employee_id=input.employee_id,
        employee_name=employee['name'],
        period_month=input.period_month,
        period_year=input.period_year,
        gross_salary=round(monthly_gross, 2),
        tax_deduction=input.tax_deduction,
        ni_deduction=input.ni_deduction,
        other_deductions=[d.model_dump() for d in input.other_deductions],
        bonuses=input.bonuses,
        net_salary=round(net_salary, 2)
    )
    
    doc = payslip.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.payslips.insert_one(doc)
    return payslip

@api_router.get("/payslips/{payslip_id}", response_model=Payslip)
async def get_payslip(payslip_id: str):
    payslip = await db.payslips.find_one({"id": payslip_id}, {"_id": 0})
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    if isinstance(payslip.get('created_at'), str):
        payslip['created_at'] = datetime.fromisoformat(payslip['created_at'])
    return payslip

@api_router.delete("/payslips/{payslip_id}")
async def delete_payslip(payslip_id: str):
    result = await db.payslips.delete_one({"id": payslip_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payslip not found")
    return {"message": "Payslip deleted successfully"}

# ========== Contract Endpoints ==========

@api_router.get("/contracts")
async def get_contracts():
    contracts = await db.contracts.find({}, {"_id": 0}).to_list(1000)
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate labor costs per contract
    for contract in contracts:
        contract_employees = [e for e in employees if e.get('contract_id') == contract['id']]
        contract['employee_count'] = len(contract_employees)
        contract['labor_cost'] = sum(e.get('annual_salary', 0) for e in contract_employees)
        contract['monthly_labor_cost'] = contract['labor_cost'] / 12
        contract['budget_remaining'] = contract['budget'] - contract['labor_cost']
        contract['budget_utilization'] = (contract['labor_cost'] / contract['budget'] * 100) if contract['budget'] > 0 else 0
        if isinstance(contract.get('created_at'), str):
            contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    
    return contracts

@api_router.post("/contracts")
async def create_contract(input: ContractCreate):
    contract_dict = input.model_dump()
    contract = Contract(**contract_dict)
    
    doc = contract.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contracts.insert_one(doc)
    return contract

@api_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str):
    contract = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    # Get employees assigned to this contract
    employees = await db.employees.find({"contract_id": contract_id}, {"_id": 0}).to_list(1000)
    contract['employees'] = employees
    contract['employee_count'] = len(employees)
    contract['labor_cost'] = sum(e.get('annual_salary', 0) for e in employees)
    contract['monthly_labor_cost'] = contract['labor_cost'] / 12
    contract['budget_remaining'] = contract['budget'] - contract['labor_cost']
    contract['budget_utilization'] = (contract['labor_cost'] / contract['budget'] * 100) if contract['budget'] > 0 else 0
    
    if isinstance(contract.get('created_at'), str):
        contract['created_at'] = datetime.fromisoformat(contract['created_at'])
    return contract

@api_router.put("/contracts/{contract_id}")
async def update_contract(contract_id: str, input: ContractUpdate):
    existing = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Contract not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.contracts.update_one({"id": contract_id}, {"$set": update_data})
    
    updated = await db.contracts.find_one({"id": contract_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/contracts/{contract_id}")
async def delete_contract(contract_id: str):
    # Unassign employees from this contract
    await db.employees.update_many({"contract_id": contract_id}, {"$set": {"contract_id": None}})
    
    result = await db.contracts.delete_one({"id": contract_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contract not found")
    return {"message": "Contract deleted successfully"}

# ========== Job/Event Endpoints ==========

@api_router.get("/jobs")
async def get_jobs():
    jobs = await db.jobs.find({}, {"_id": 0}).to_list(1000)
    for job in jobs:
        if isinstance(job.get('created_at'), str):
            job['created_at'] = datetime.fromisoformat(job['created_at'])
    return jobs

@api_router.post("/jobs")
async def create_job(input: JobCreate):
    job_dict = input.model_dump()
    job = Job(**job_dict)
    
    doc = job.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.jobs.insert_one(doc)
    return job

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if isinstance(job.get('created_at'), str):
        job['created_at'] = datetime.fromisoformat(job['created_at'])
    return job

@api_router.put("/jobs/{job_id}")
async def update_job(job_id: str, input: JobUpdate):
    existing = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.jobs.update_one({"id": job_id}, {"$set": update_data})
    
    updated = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    result = await db.jobs.delete_one({"id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"message": "Job deleted successfully"}

@api_router.post("/jobs/{job_id}/assign")
async def assign_employees_to_job(job_id: str, request: AssignEmployeesRequest):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get employee details
    assigned = []
    for emp_id in request.employee_ids:
        employee = await db.employees.find_one({"id": emp_id}, {"_id": 0})
        if employee:
            assigned.append({
                "employee_id": employee['id'],
                "employee_name": employee['name'],
                "position": employee['position'],
                "phone": employee.get('phone', '')
            })
    
    await db.jobs.update_one({"id": job_id}, {"$set": {"assigned_employees": assigned}})
    
    updated = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return updated

@api_router.get("/jobs/{job_id}/export")
async def export_job_staff_list(job_id: str):
    """Get job details with assigned staff for export/PDF generation"""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get full employee details for assigned staff
    staff_details = []
    for assigned in job.get('assigned_employees', []):
        employee = await db.employees.find_one({"id": assigned['employee_id']}, {"_id": 0})
        if employee:
            staff_details.append({
                "name": employee['name'],
                "position": employee['position'],
                "phone": employee.get('phone', 'N/A'),
                "email": employee.get('email', 'N/A')
            })
    
    return {
        "job": job,
        "staff_list": staff_details,
        "export_date": datetime.now(timezone.utc).isoformat(),
        "company": "Right Service Group"
    }

# ========== Dashboard Endpoint ==========

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard():
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    payslips = await db.payslips.find({}, {"_id": 0}).to_list(100)
    
    total_employees = len(employees)
    total_annual = sum(emp.get('annual_salary', 0) for emp in employees)
    total_monthly_payroll = total_annual / 12 if total_employees > 0 else 0
    average_salary = total_annual / total_employees if total_employees > 0 else 0
    
    # Group by department
    dept_counts = {}
    for emp in employees:
        dept = emp.get('department', 'Unknown')
        if dept not in dept_counts:
            dept_counts[dept] = {'name': dept, 'count': 0, 'total_salary': 0}
        dept_counts[dept]['count'] += 1
        dept_counts[dept]['total_salary'] += emp.get('annual_salary', 0)
    
    departments = list(dept_counts.values())
    
    # Recent payslips (last 5)
    recent_payslips = sorted(payslips, key=lambda x: x.get('created_at', ''), reverse=True)[:5]
    recent_payslips_data = [
        {
            'id': ps.get('id'),
            'employee_name': ps.get('employee_name'),
            'period': f"{ps.get('period_month')}/{ps.get('period_year')}",
            'net_salary': ps.get('net_salary')
        }
        for ps in recent_payslips
    ]
    
    return DashboardStats(
        total_employees=total_employees,
        total_monthly_payroll=round(total_monthly_payroll, 2),
        average_salary=round(average_salary, 2),
        departments=departments,
        recent_payslips=recent_payslips_data
    )

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
