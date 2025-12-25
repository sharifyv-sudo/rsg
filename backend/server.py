from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Email configuration (Resend)
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ========== Health Check Endpoint (Required for Kubernetes) ==========
@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes deployment"""
    return {"status": "healthy", "service": "right-service-group-api"}

# ========== Auth Configuration ==========
# Admin credentials - loaded from environment variables
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'info@rightservicegroup.co.uk')
ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH', hashlib.sha256("LondonE7".encode()).hexdigest())

# Default password for new staff members - loaded from environment
DEFAULT_STAFF_PASSWORD = os.environ.get('DEFAULT_STAFF_PASSWORD', 'RSG2025')

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
    latitude: Optional[float] = None  # GPS latitude (required if job requires location)
    longitude: Optional[float] = None  # GPS longitude (required if job requires location)
    notes: Optional[str] = None

class ClockOutRequest(BaseModel):
    latitude: Optional[float] = None  # GPS latitude (required if job requires location)
    longitude: Optional[float] = None  # GPS longitude (required if job requires location)
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
    hourly_rate: Optional[float] = None  # Pay rate per hour in GBP
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
    hourly_rate: Optional[float] = None
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
    require_location: bool = False  # If True, GPS verification required for clock in/out
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
    require_location: bool = False
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    require_location: Optional[bool] = None

class AssignEmployeesRequest(BaseModel):
    employee_ids: List[str]

# ========== Invoice Models ==========

INVOICE_STATUS = ["draft", "sent", "paid", "overdue", "cancelled"]

class InvoiceItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float
    total: float = 0

class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    invoice_number: str  # e.g., INV-2025-001
    client_name: str
    client_email: Optional[str] = None
    job_id: Optional[str] = None  # Link to job if auto-generated
    job_name: Optional[str] = None
    contract_id: Optional[str] = None  # Link to contract
    items: List[InvoiceItem] = []
    subtotal: float = 0
    tax_rate: float = 0  # VAT percentage (e.g., 20 for 20%)
    tax_amount: float = 0
    total_amount: float = 0
    issue_date: str  # ISO date
    due_date: str  # ISO date
    status: str = "draft"  # draft, sent, paid, overdue, cancelled
    payment_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    job_id: Optional[str] = None
    contract_id: Optional[str] = None
    items: List[InvoiceItem] = []
    tax_rate: float = 20  # Default UK VAT
    issue_date: str
    due_date: str
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    items: Optional[List[InvoiceItem]] = None
    tax_rate: Optional[float] = None
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    payment_date: Optional[str] = None
    notes: Optional[str] = None

# ========== Email Helper Functions ==========

async def send_email_async(to_email: str, subject: str, html_content: str):
    """Send email asynchronously using Resend"""
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        result = await asyncio.to_thread(resend.Emails.send, params)
        return {"success": True, "email_id": result.get("id")}
    except Exception as e:
        logging.error(f"Failed to send email to {to_email}: {str(e)}")
        return {"success": False, "error": str(e)}

def generate_shift_assignment_email(employee_name: str, job: dict) -> str:
    """Generate HTML email for shift assignment notification"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #0F64A8; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; background: #f9f9f9; }}
            .job-details {{ background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }}
            .detail-row {{ display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }}
            .label {{ font-weight: bold; color: #666; width: 120px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            .button {{ background: #0F64A8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Right Service Group</h1>
                <p>New Shift Assignment</p>
            </div>
            <div class="content">
                <p>Hi {employee_name},</p>
                <p>You have been assigned to a new shift. Please see the details below:</p>
                
                <div class="job-details">
                    <h3 style="color: #0F64A8; margin-top: 0;">{job.get('name', 'N/A')}</h3>
                    <div class="detail-row">
                        <span class="label">Client:</span>
                        <span>{job.get('client', 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Date:</span>
                        <span>{job.get('date', 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Time:</span>
                        <span>{job.get('start_time', 'N/A')} - {job.get('end_time', 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Location:</span>
                        <span>{job.get('location', 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Job Type:</span>
                        <span>{job.get('job_type', 'N/A')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Hourly Rate:</span>
                        <span>£{job.get('hourly_rate', 0):.2f}/hr</span>
                    </div>
                    {f'<div class="detail-row"><span class="label">Notes:</span><span>{job.get("notes")}</span></div>' if job.get('notes') else ''}
                </div>
                
                <p>Please log in to the Staff Portal to confirm your availability and view more details.</p>
                
                <p style="color: #666; font-size: 14px;">
                    {'<strong>📍 GPS Clock-in Required:</strong> You must be within 500m of the job location to clock in/out.' if job.get('require_location') else ''}
                </p>
            </div>
            <div class="footer">
                <p>Right Service Group | Professional Staffing Solutions</p>
                <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """

def generate_invoice_email(invoice: dict, company_name: str = "Right Service Group") -> str:
    """Generate HTML email for invoice"""
    items_html = ""
    for item in invoice.get('items', []):
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.get('description', '')}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item.get('quantity', 1)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">£{item.get('unit_price', 0):.2f}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">£{item.get('total', 0):.2f}</td>
        </tr>
        """
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 700px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #0F64A8; color: white; padding: 20px; }}
            .invoice-info {{ display: flex; justify-content: space-between; padding: 20px 0; }}
            table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            th {{ background: #f5f5f5; padding: 12px; text-align: left; }}
            .totals {{ text-align: right; margin-top: 20px; }}
            .total-row {{ padding: 8px 0; }}
            .grand-total {{ font-size: 18px; font-weight: bold; color: #0F64A8; border-top: 2px solid #0F64A8; padding-top: 10px; }}
            .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; margin-top: 30px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0;">{company_name}</h1>
                <p style="margin: 5px 0 0 0;">INVOICE</p>
            </div>
            
            <div class="invoice-info">
                <div>
                    <p><strong>Bill To:</strong></p>
                    <p>{invoice.get('client_name', 'N/A')}</p>
                    <p>{invoice.get('client_email', '')}</p>
                </div>
                <div style="text-align: right;">
                    <p><strong>Invoice #:</strong> {invoice.get('invoice_number', 'N/A')}</p>
                    <p><strong>Issue Date:</strong> {invoice.get('issue_date', 'N/A')}</p>
                    <p><strong>Due Date:</strong> {invoice.get('due_date', 'N/A')}</p>
                    <p><strong>Status:</strong> <span style="color: {'#3AB09E' if invoice.get('status') == 'paid' else '#E74C3C' if invoice.get('status') == 'overdue' else '#F39C12'};">{invoice.get('status', 'draft').upper()}</span></p>
                </div>
            </div>
            
            {f"<p><strong>Related Job:</strong> {invoice.get('job_name', 'N/A')}</p>" if invoice.get('job_name') else ""}
            
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: center;">Qty</th>
                        <th style="text-align: right;">Unit Price</th>
                        <th style="text-align: right;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            
            <div class="totals">
                <div class="total-row">Subtotal: £{invoice.get('subtotal', 0):.2f}</div>
                <div class="total-row">VAT ({invoice.get('tax_rate', 0)}%): £{invoice.get('tax_amount', 0):.2f}</div>
                <div class="total-row grand-total">Total Due: £{invoice.get('total_amount', 0):.2f}</div>
            </div>
            
            {f"<p><strong>Notes:</strong> {invoice.get('notes')}</p>" if invoice.get('notes') else ""}
            
            <div class="footer">
                <p>{company_name} | Professional Staffing Solutions</p>
                <p>Thank you for your business!</p>
            </div>
        </div>
    </body>
    </html>
    """

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
    """Staff member clocks in - must be at job location"""
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Job is required for location verification
    job = await db.jobs.find_one({"id": request.job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if employee is assigned to this job
    assigned_ids = [e.get('employee_id') for e in job.get('assigned_employees', [])]
    if employee_id not in assigned_ids:
        raise HTTPException(status_code=403, detail="You are not assigned to this job")
    
    # Check if location verification is required for this job
    location_verified = False
    if job.get('require_location', False):
        # Verify location - job must have GPS coordinates
        if job.get('latitude') is None or job.get('longitude') is None:
            raise HTTPException(status_code=400, detail="Job requires location verification but GPS not configured. Contact admin.")
        
        if request.latitude is None or request.longitude is None:
            raise HTTPException(status_code=400, detail="This job requires GPS location to clock in. Please enable location services.")
        
        # Calculate distance from job location
        distance = haversine_distance(
            request.latitude, request.longitude,
            job['latitude'], job['longitude']
        )
        
        if distance > MAX_CLOCK_DISTANCE_METERS:
            raise HTTPException(
                status_code=403, 
                detail=f"You must be within {MAX_CLOCK_DISTANCE_METERS}m of the job location to clock in. Current distance: {int(distance)}m"
            )
        location_verified = True
    
    # Check if already clocked in today for this job
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.timeclock.find_one({
        "employee_id": employee_id,
        "job_id": request.job_id,
        "date": today,
        "clock_out": None
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already clocked in for this job today")
    
    now = datetime.now(timezone.utc).isoformat()
    
    entry = {
        "id": str(uuid.uuid4()),
        "employee_id": employee_id,
        "employee_name": employee['name'],
        "clock_in": now,
        "clock_out": None,
        "date": today,
        "hours_worked": None,
        "job_id": request.job_id,
        "job_name": job.get('name'),
        "notes": request.notes,
        "clock_in_latitude": request.latitude,
        "clock_in_longitude": request.longitude,
        "clock_out_latitude": None,
        "clock_out_longitude": None,
        "location_verified": location_verified
    }
    
    await db.timeclock.insert_one(entry)
    return {"message": "Clocked in successfully", "clock_in": now, "job_name": job.get('name')}

@api_router.post("/staff/{employee_id}/clock-out")
async def staff_clock_out(employee_id: str, request: ClockOutRequest):
    """Staff member clocks out - location required only if job requires it"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    # Find open clock-in entry
    entry = await db.timeclock.find_one({
        "employee_id": employee_id,
        "clock_out": None
    })
    
    if not entry:
        raise HTTPException(status_code=400, detail="No active clock-in found")
    
    # Get the job to check if location verification is required
    job = await db.jobs.find_one({"id": entry.get('job_id')}, {"_id": 0})
    if job and job.get('require_location', False):
        if job.get('latitude') is not None and job.get('longitude') is not None:
            if request.latitude is None or request.longitude is None:
                raise HTTPException(status_code=400, detail="This job requires GPS location to clock out. Please enable location services.")
            
            # Calculate distance from job location
            distance = haversine_distance(
                request.latitude, request.longitude,
                job['latitude'], job['longitude']
        )
        
        if distance > MAX_CLOCK_DISTANCE_METERS:
            raise HTTPException(
                status_code=403, 
                detail=f"You must be within {MAX_CLOCK_DISTANCE_METERS}m of the job location to clock out. Current distance: {int(distance)}m"
            )
    
    now = datetime.now(timezone.utc)
    clock_in_time = datetime.fromisoformat(entry['clock_in'].replace('Z', '+00:00'))
    hours_worked = round((now - clock_in_time).total_seconds() / 3600, 2)
    
    await db.timeclock.update_one(
        {"id": entry['id']},
        {"$set": {
            "clock_out": now.isoformat(),
            "hours_worked": hours_worked,
            "notes": request.notes or entry.get('notes'),
            "clock_out_latitude": request.latitude,
            "clock_out_longitude": request.longitude
        }}
    )
    
    return {"message": "Clocked out successfully", "hours_worked": hours_worked}

@api_router.get("/staff/{employee_id}/status")
async def get_staff_clock_status(employee_id: str):
    """Check if staff is currently clocked in"""
    entry = await db.timeclock.find_one({
        "employee_id": employee_id,
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
    
    # Get hours worked for the period from timeclock
    # For now, use gross_salary from input or calculate based on hours
    # Since we're now hourly-based, we need to calculate from actual hours worked
    hourly_rate = employee.get('hourly_rate', 0)
    
    # Query timeclock entries for this employee in the specified period
    # Build date range for the month
    from calendar import monthrange
    days_in_month = monthrange(input.period_year, input.period_month)[1]
    start_date = f"{input.period_year}-{input.period_month:02d}-01"
    end_date = f"{input.period_year}-{input.period_month:02d}-{days_in_month:02d}"
    
    timeclock_entries = await db.timeclock.find({
        "employee_id": input.employee_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }, {"_id": 0}).to_list(100)
    
    total_hours = sum(entry.get('hours_worked', 0) or 0 for entry in timeclock_entries)
    monthly_gross = total_hours * hourly_rate
    
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
    
    # Calculate labor costs per contract based on hourly rates (estimated)
    for contract in contracts:
        contract_employees = [e for e in employees if e.get('contract_id') == contract['id']]
        contract['employee_count'] = len(contract_employees)
        # Estimate annual labor cost based on hourly rate (40hrs/week * 52 weeks)
        total_hourly = sum(e.get('hourly_rate', 0) or 0 for e in contract_employees)
        contract['labor_cost'] = total_hourly * 40 * 52  # Estimated annual
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
    # Estimate annual labor cost based on hourly rate (40hrs/week * 52 weeks)
    total_hourly = sum(e.get('hourly_rate', 0) or 0 for e in employees)
    contract['labor_cost'] = total_hourly * 40 * 52  # Estimated annual
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
async def assign_employees_to_job(job_id: str, request: AssignEmployeesRequest, send_notifications: bool = True):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get current assigned employee IDs
    current_assigned_ids = {e.get('employee_id') for e in job.get('assigned_employees', [])}
    
    # Get employee details
    assigned = []
    new_assignments = []
    for emp_id in request.employee_ids:
        employee = await db.employees.find_one({"id": emp_id}, {"_id": 0})
        if employee:
            assigned.append({
                "employee_id": employee['id'],
                "employee_name": employee['name'],
                "position": employee['position'],
                "phone": employee.get('phone', '')
            })
            # Track new assignments for notifications
            if emp_id not in current_assigned_ids:
                new_assignments.append(employee)
    
    await db.jobs.update_one({"id": job_id}, {"$set": {"assigned_employees": assigned}})
    
    # Send email notifications to newly assigned staff
    if send_notifications and new_assignments:
        for employee in new_assignments:
            if employee.get('email'):
                email_html = generate_shift_assignment_email(employee['name'], job)
                asyncio.create_task(send_email_async(
                    employee['email'],
                    f"New Shift Assignment: {job.get('name', 'Job')} - {job.get('date', '')}",
                    email_html
                ))
    
    updated = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return {
        **updated,
        "notifications_sent": len(new_assignments) if send_notifications else 0
    }

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

# ========== Timesheet Models ==========

class Timesheet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    employee_name: str
    hours_worked: float
    location: str
    date: str  # ISO date string YYYY-MM-DD
    notes: Optional[str] = None
    hourly_rate: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TimesheetCreate(BaseModel):
    employee_id: str
    employee_name: str
    hours_worked: float
    location: str
    date: str
    notes: Optional[str] = None
    hourly_rate: float = 0

class TimesheetUpdate(BaseModel):
    employee_id: Optional[str] = None
    employee_name: Optional[str] = None
    hours_worked: Optional[float] = None
    location: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    hourly_rate: Optional[float] = None

# ========== Timesheet Endpoints ==========

@api_router.get("/timesheets")
async def get_timesheets():
    """Get all manual timesheet entries"""
    timesheets = await db.timesheets.find({}, {"_id": 0}).to_list(1000)
    for ts in timesheets:
        if isinstance(ts.get('created_at'), str):
            ts['created_at'] = datetime.fromisoformat(ts['created_at'])
    return sorted(timesheets, key=lambda x: x.get('date', ''), reverse=True)

@api_router.post("/timesheets")
async def create_timesheet(input: TimesheetCreate):
    """Create a new manual timesheet entry"""
    timesheet = Timesheet(
        employee_id=input.employee_id,
        employee_name=input.employee_name,
        hours_worked=input.hours_worked,
        location=input.location,
        date=input.date,
        notes=input.notes,
        hourly_rate=input.hourly_rate
    )
    
    doc = timesheet.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.timesheets.insert_one(doc)
    return timesheet

@api_router.get("/timesheets/{timesheet_id}")
async def get_timesheet(timesheet_id: str):
    """Get a specific timesheet entry"""
    timesheet = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    if not timesheet:
        raise HTTPException(status_code=404, detail="Timesheet entry not found")
    if isinstance(timesheet.get('created_at'), str):
        timesheet['created_at'] = datetime.fromisoformat(timesheet['created_at'])
    return timesheet

@api_router.put("/timesheets/{timesheet_id}")
async def update_timesheet(timesheet_id: str, input: TimesheetUpdate):
    """Update a timesheet entry"""
    existing = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Timesheet entry not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.timesheets.update_one({"id": timesheet_id}, {"$set": update_data})
    
    updated = await db.timesheets.find_one({"id": timesheet_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/timesheets/{timesheet_id}")
async def delete_timesheet(timesheet_id: str):
    """Delete a timesheet entry"""
    result = await db.timesheets.delete_one({"id": timesheet_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Timesheet entry not found")
    return {"message": "Timesheet entry deleted successfully"}

@api_router.get("/timesheets/summary/weekly")
async def get_weekly_timesheet_summary(week_start: str):
    """Get weekly summary of timesheets"""
    # Calculate week end (7 days from start)
    start_date = datetime.fromisoformat(week_start)
    end_date = start_date + timedelta(days=6)
    
    timesheets = await db.timesheets.find({
        "date": {
            "$gte": week_start,
            "$lte": end_date.strftime("%Y-%m-%d")
        }
    }, {"_id": 0}).to_list(1000)
    
    # Group by employee
    by_employee = {}
    for ts in timesheets:
        emp_id = ts.get('employee_id')
        if emp_id not in by_employee:
            by_employee[emp_id] = {
                "employee_id": emp_id,
                "employee_name": ts.get('employee_name'),
                "total_hours": 0,
                "total_earnings": 0,
                "entries": []
            }
        by_employee[emp_id]['total_hours'] += ts.get('hours_worked', 0)
        by_employee[emp_id]['total_earnings'] += ts.get('hours_worked', 0) * ts.get('hourly_rate', 0)
        by_employee[emp_id]['entries'].append(ts)
    
    return {
        "week_start": week_start,
        "week_end": end_date.strftime("%Y-%m-%d"),
        "total_hours": sum(e['total_hours'] for e in by_employee.values()),
        "total_earnings": sum(e['total_earnings'] for e in by_employee.values()),
        "by_employee": list(by_employee.values())
    }

# ========== Invoice Endpoints ==========

async def generate_invoice_number():
    """Generate unique invoice number like INV-2025-001"""
    year = datetime.now().year
    # Count existing invoices this year
    count = await db.invoices.count_documents({
        "invoice_number": {"$regex": f"^INV-{year}-"}
    })
    return f"INV-{year}-{str(count + 1).zfill(3)}"

@api_router.get("/invoices")
async def get_invoices():
    """Get all invoices"""
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    
    # Check for overdue invoices and update status
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for inv in invoices:
        if inv.get('status') == 'sent' and inv.get('due_date', '') < today:
            await db.invoices.update_one({"id": inv['id']}, {"$set": {"status": "overdue"}})
            inv['status'] = 'overdue'
        if isinstance(inv.get('created_at'), str):
            inv['created_at'] = datetime.fromisoformat(inv['created_at'])
    
    return sorted(invoices, key=lambda x: x.get('created_at', ''), reverse=True)

@api_router.post("/invoices")
async def create_invoice(input: InvoiceCreate):
    """Create a new invoice"""
    invoice_number = await generate_invoice_number()
    
    # Calculate totals
    items = []
    subtotal = 0
    for item in input.items:
        item_total = item.quantity * item.unit_price
        items.append({
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": round(item_total, 2)
        })
        subtotal += item_total
    
    tax_amount = subtotal * (input.tax_rate / 100)
    total_amount = subtotal + tax_amount
    
    # Get job name if linked
    job_name = None
    if input.job_id:
        job = await db.jobs.find_one({"id": input.job_id}, {"_id": 0})
        if job:
            job_name = job.get('name')
    
    invoice = Invoice(
        invoice_number=invoice_number,
        client_name=input.client_name,
        client_email=input.client_email,
        job_id=input.job_id,
        job_name=job_name,
        contract_id=input.contract_id,
        items=items,
        subtotal=round(subtotal, 2),
        tax_rate=input.tax_rate,
        tax_amount=round(tax_amount, 2),
        total_amount=round(total_amount, 2),
        issue_date=input.issue_date,
        due_date=input.due_date,
        status="draft",
        notes=input.notes
    )
    
    doc = invoice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.invoices.insert_one(doc)
    return invoice

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str):
    """Get a specific invoice"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if isinstance(invoice.get('created_at'), str):
        invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
    return invoice

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, input: InvoiceUpdate):
    """Update an invoice"""
    existing = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    update_data = {}
    for k, v in input.model_dump().items():
        if v is not None:
            update_data[k] = v
    
    # Recalculate totals if items changed
    if 'items' in update_data:
        items = []
        subtotal = 0
        for item in update_data['items']:
            item_total = item.get('quantity', 1) * item.get('unit_price', 0)
            items.append({
                "description": item.get('description', ''),
                "quantity": item.get('quantity', 1),
                "unit_price": item.get('unit_price', 0),
                "total": round(item_total, 2)
            })
            subtotal += item_total
        
        update_data['items'] = items
        update_data['subtotal'] = round(subtotal, 2)
        tax_rate = update_data.get('tax_rate', existing.get('tax_rate', 0))
        update_data['tax_amount'] = round(subtotal * (tax_rate / 100), 2)
        update_data['total_amount'] = round(subtotal + update_data['tax_amount'], 2)
    
    if update_data:
        await db.invoices.update_one({"id": invoice_id}, {"$set": update_data})
    
    updated = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    return updated

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str):
    """Delete an invoice"""
    result = await db.invoices.delete_one({"id": invoice_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": "Invoice deleted successfully"}

@api_router.post("/invoices/{invoice_id}/send")
async def send_invoice(invoice_id: str):
    """Send invoice to client via email"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if not invoice.get('client_email'):
        raise HTTPException(status_code=400, detail="Client email not set")
    
    # Generate and send email
    email_html = generate_invoice_email(invoice)
    result = await send_email_async(
        invoice['client_email'],
        f"Invoice {invoice['invoice_number']} from Right Service Group",
        email_html
    )
    
    if result.get('success'):
        # Update invoice status to sent
        await db.invoices.update_one({"id": invoice_id}, {"$set": {"status": "sent"}})
        return {"message": "Invoice sent successfully", "email_id": result.get('email_id')}
    else:
        raise HTTPException(status_code=500, detail=f"Failed to send invoice: {result.get('error')}")

@api_router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str):
    """Mark invoice as paid"""
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.invoices.update_one({"id": invoice_id}, {"$set": {
        "status": "paid",
        "payment_date": today
    }})
    
    return {"message": "Invoice marked as paid", "payment_date": today}

@api_router.post("/invoices/generate-from-job/{job_id}")
async def generate_invoice_from_job(job_id: str):
    """Auto-generate an invoice from a completed job"""
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get timeclock entries for this job
    timeclock_entries = await db.timeclock.find({"job_id": job_id}, {"_id": 0}).to_list(1000)
    
    # Calculate total hours and cost
    total_hours = sum(e.get('hours_worked', 0) or 0 for e in timeclock_entries)
    hourly_rate = job.get('hourly_rate', 0)
    
    # Create invoice items
    items = []
    if total_hours > 0:
        items.append({
            "description": f"Staff services for {job.get('name', 'Job')} - {total_hours:.1f} hours @ £{hourly_rate:.2f}/hr",
            "quantity": total_hours,
            "unit_price": hourly_rate,
            "total": round(total_hours * hourly_rate, 2)
        })
    else:
        # Estimate based on job duration and staff
        start_time = job.get('start_time', '09:00')
        end_time = job.get('end_time', '17:00')
        try:
            start_h, start_m = map(int, start_time.split(':'))
            end_h, end_m = map(int, end_time.split(':'))
            estimated_hours = (end_h + end_m/60) - (start_h + start_m/60)
            staff_count = len(job.get('assigned_employees', []))
            total_staff_hours = estimated_hours * staff_count
            
            items.append({
                "description": f"Staff services for {job.get('name', 'Job')} - {staff_count} staff x {estimated_hours:.1f} hours",
                "quantity": total_staff_hours,
                "unit_price": hourly_rate,
                "total": round(total_staff_hours * hourly_rate, 2)
            })
        except:
            pass
    
    # Generate invoice
    invoice_number = await generate_invoice_number()
    subtotal = sum(item['total'] for item in items)
    tax_rate = 20  # UK VAT
    tax_amount = subtotal * 0.20
    total_amount = subtotal + tax_amount
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    due_date = datetime.now(timezone.utc)
    due_date = due_date.replace(day=min(due_date.day + 30, 28))  # 30 days payment terms
    
    invoice = Invoice(
        invoice_number=invoice_number,
        client_name=job.get('client', 'Unknown Client'),
        job_id=job_id,
        job_name=job.get('name'),
        items=items,
        subtotal=round(subtotal, 2),
        tax_rate=tax_rate,
        tax_amount=round(tax_amount, 2),
        total_amount=round(total_amount, 2),
        issue_date=today,
        due_date=due_date.strftime("%Y-%m-%d"),
        status="draft",
        notes=f"Invoice for services provided at {job.get('location', 'N/A')} on {job.get('date', 'N/A')}"
    )
    
    doc = invoice.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.invoices.insert_one(doc)
    return invoice

@api_router.get("/invoices/stats/summary")
async def get_invoice_stats():
    """Get invoice statistics for dashboard"""
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    
    total_invoiced = sum(inv.get('total_amount', 0) for inv in invoices)
    total_paid = sum(inv.get('total_amount', 0) for inv in invoices if inv.get('status') == 'paid')
    total_pending = sum(inv.get('total_amount', 0) for inv in invoices if inv.get('status') in ['sent', 'draft'])
    total_overdue = sum(inv.get('total_amount', 0) for inv in invoices if inv.get('status') == 'overdue')
    
    return {
        "total_invoices": len(invoices),
        "total_invoiced": round(total_invoiced, 2),
        "total_paid": round(total_paid, 2),
        "total_pending": round(total_pending, 2),
        "total_overdue": round(total_overdue, 2),
        "paid_count": len([i for i in invoices if i.get('status') == 'paid']),
        "pending_count": len([i for i in invoices if i.get('status') in ['sent', 'draft']]),
        "overdue_count": len([i for i in invoices if i.get('status') == 'overdue'])
    }

# ========== Dashboard Endpoint ==========

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard():
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    payslips = await db.payslips.find({}, {"_id": 0}).to_list(100)
    
    total_employees = len(employees)
    
    # Calculate estimated annual/monthly based on hourly rates (assuming 40h/week, 52 weeks)
    # This is for display purposes - actual pay is based on hours worked
    total_hourly = sum(emp.get('hourly_rate', 0) or 0 for emp in employees)
    estimated_weekly = total_hourly * 40  # 40 hours per week average
    total_monthly_payroll = estimated_weekly * 4.33  # avg weeks per month
    average_salary = (total_hourly * 40 * 52) / total_employees if total_employees > 0 else 0  # estimated annual
    
    # Group by department
    dept_counts = {}
    for emp in employees:
        dept = emp.get('department', 'Unknown')
        hourly = emp.get('hourly_rate', 0) or 0
        if dept not in dept_counts:
            dept_counts[dept] = {'name': dept, 'count': 0, 'total_salary': 0}
        dept_counts[dept]['count'] += 1
        dept_counts[dept]['total_salary'] += hourly * 40 * 52 / 12  # monthly estimate
    
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

# ========== Right to Work (RTW) Models & Endpoints ==========

class RTWStatus(str, Enum):
    VALID = "valid"
    EXPIRED = "expired"
    PENDING = "pending"
    NOT_CHECKED = "not_checked"

class RTWDocumentType(str, Enum):
    PASSPORT = "passport"
    BRP = "brp"
    SHARE_CODE = "share_code"
    VISA = "visa"
    SETTLED_STATUS = "settled_status"
    PRE_SETTLED_STATUS = "pre_settled_status"
    OTHER = "other"

class RightToWorkCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_name: str
    document_type: str
    document_number: str
    check_date: str
    expiry_date: Optional[str] = None
    status: str = "pending"
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RightToWorkCreate(BaseModel):
    employee_name: str
    document_type: str
    document_number: str
    check_date: str
    expiry_date: Optional[str] = None
    status: str = "pending"
    notes: Optional[str] = None

class RightToWorkUpdate(BaseModel):
    employee_name: Optional[str] = None
    document_type: Optional[str] = None
    document_number: Optional[str] = None
    check_date: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

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

@api_router.get("/rtw")
async def get_rtw_checks():
    """Get all Right to Work check records"""
    rtw_checks = await db.rtw_checks.find({}, {"_id": 0}).to_list(1000)
    for check in rtw_checks:
        if isinstance(check.get('created_at'), str):
            check['created_at'] = datetime.fromisoformat(check['created_at'])
        if isinstance(check.get('updated_at'), str):
            check['updated_at'] = datetime.fromisoformat(check['updated_at'])
    return rtw_checks

@api_router.get("/rtw/{rtw_id}")
async def get_rtw_check(rtw_id: str):
    """Get a specific Right to Work check record"""
    rtw_check = await db.rtw_checks.find_one({"id": rtw_id}, {"_id": 0})
    if not rtw_check:
        raise HTTPException(status_code=404, detail="RTW check not found")
    return rtw_check

@api_router.put("/rtw/{rtw_id}")
async def update_rtw_check(rtw_id: str, input: RightToWorkUpdate):
    """Update a Right to Work check record"""
    existing = await db.rtw_checks.find_one({"id": rtw_id})
    if not existing:
        raise HTTPException(status_code=404, detail="RTW check not found")
    update_data = input.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.rtw_checks.update_one({"id": rtw_id}, {"$set": update_data})
    updated = await db.rtw_checks.find_one({"id": rtw_id}, {"_id": 0})
    return updated

@api_router.delete("/rtw/{rtw_id}")
async def delete_rtw_check(rtw_id: str):
    """Delete a Right to Work check record"""
    result = await db.rtw_checks.delete_one({"id": rtw_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="RTW check not found")
    return {"message": "RTW check deleted successfully"}

class BulkImportRequest(BaseModel):
    items: List[dict]

class BulkImportResponse(BaseModel):
    created: int
    updated: int
    errors: List[str]

@api_router.post("/rtw/bulk-import", response_model=BulkImportResponse)
async def bulk_import_rtw(request: BulkImportRequest):
    """Bulk import RTW checks"""
    created = 0
    updated = 0
    errors = []
    valid_doc_types = ["passport", "brp", "share_code", "visa", "settled_status", "pre_settled_status", "other"]
    valid_statuses = ["valid", "expired", "pending", "not_checked"]
    
    for idx, item in enumerate(request.items):
        try:
            employee_name = item.get("employee_name", "").strip()
            if not employee_name:
                errors.append(f"Row {idx + 1}: Missing employee name")
                continue
            document_type = item.get("document_type", "").strip().lower().replace(" ", "_").replace("-", "_")
            if document_type not in valid_doc_types:
                doc_type_map = {"biometric_residence_permit": "brp", "biometric residence permit": "brp", "share code": "share_code"}
                document_type = doc_type_map.get(document_type.lower(), "other")
            document_number = item.get("document_number", "").strip()
            if not document_number:
                errors.append(f"Row {idx + 1}: Missing document number")
                continue
            check_date = item.get("check_date", "").strip()
            if not check_date:
                errors.append(f"Row {idx + 1}: Missing check date")
                continue
            expiry_date = item.get("expiry_date", "").strip() or None
            status = item.get("status", "pending").strip().lower().replace(" ", "_")
            if status not in valid_statuses:
                status = "pending"
            notes = item.get("notes", "").strip() or None
            
            existing = await db.rtw_checks.find_one({"employee_name": {"$regex": f"^{employee_name}$", "$options": "i"}})
            if existing:
                await db.rtw_checks.update_one({"id": existing["id"]}, {"$set": {
                    "document_type": document_type, "document_number": document_number,
                    "check_date": check_date, "expiry_date": expiry_date, "status": status,
                    "notes": notes, "updated_at": datetime.now(timezone.utc).isoformat()
                }})
                updated += 1
            else:
                new_record = {
                    "id": str(uuid.uuid4()), "employee_name": employee_name, "document_type": document_type,
                    "document_number": document_number, "check_date": check_date, "expiry_date": expiry_date,
                    "status": status, "notes": notes,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.rtw_checks.insert_one(new_record)
                created += 1
        except Exception as e:
            errors.append(f"Row {idx + 1}: {str(e)}")
    return BulkImportResponse(created=created, updated=updated, errors=errors)

# ========== SIA License Models & Endpoints ==========

class SIALicenseType(str, Enum):
    DOOR_SUPERVISOR = "door_supervisor"
    SECURITY_GUARD = "security_guard"
    CCTV = "cctv"
    CLOSE_PROTECTION = "close_protection"
    KEY_HOLDING = "key_holding"
    VEHICLE_IMMOBILISER = "vehicle_immobiliser"

class SIALicense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_name: str
    license_number: str
    license_type: str
    expiry_date: str
    is_active: bool = True
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SIALicenseCreate(BaseModel):
    employee_name: str
    license_number: str
    license_type: str
    expiry_date: str
    is_active: bool = True
    notes: Optional[str] = None

class SIALicenseUpdate(BaseModel):
    employee_name: Optional[str] = None
    license_number: Optional[str] = None
    license_type: Optional[str] = None
    expiry_date: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

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

@api_router.get("/sia")
async def get_sia_licenses():
    """Get all SIA license records"""
    sia_licenses = await db.sia_licenses.find({}, {"_id": 0}).to_list(1000)
    for license in sia_licenses:
        if isinstance(license.get('created_at'), str):
            license['created_at'] = datetime.fromisoformat(license['created_at'])
        if isinstance(license.get('updated_at'), str):
            license['updated_at'] = datetime.fromisoformat(license['updated_at'])
    return sia_licenses

@api_router.get("/sia/{sia_id}")
async def get_sia_license(sia_id: str):
    """Get a specific SIA license record"""
    sia_license = await db.sia_licenses.find_one({"id": sia_id}, {"_id": 0})
    if not sia_license:
        raise HTTPException(status_code=404, detail="SIA license not found")
    return sia_license

@api_router.put("/sia/{sia_id}")
async def update_sia_license(sia_id: str, input: SIALicenseUpdate):
    """Update an SIA license record"""
    existing = await db.sia_licenses.find_one({"id": sia_id})
    if not existing:
        raise HTTPException(status_code=404, detail="SIA license not found")
    update_data = input.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.sia_licenses.update_one({"id": sia_id}, {"$set": update_data})
    updated = await db.sia_licenses.find_one({"id": sia_id}, {"_id": 0})
    return updated

@api_router.delete("/sia/{sia_id}")
async def delete_sia_license(sia_id: str):
    """Delete an SIA license record"""
    result = await db.sia_licenses.delete_one({"id": sia_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="SIA license not found")
    return {"message": "SIA license deleted successfully"}

@api_router.post("/sia/bulk-import", response_model=BulkImportResponse)
async def bulk_import_sia(request: BulkImportRequest):
    """Bulk import SIA licenses"""
    created = 0
    updated = 0
    errors = []
    valid_license_types = ["door_supervisor", "security_guard", "cctv", "close_protection", "key_holding", "vehicle_immobiliser"]
    
    for idx, item in enumerate(request.items):
        try:
            employee_name = item.get("employee_name", "").strip()
            if not employee_name:
                errors.append(f"Row {idx + 1}: Missing employee name")
                continue
            license_number = item.get("license_number", "").strip()
            if not license_number:
                errors.append(f"Row {idx + 1}: Missing license number")
                continue
            license_type = item.get("license_type", "").strip().lower().replace(" ", "_").replace("-", "_")
            if license_type not in valid_license_types:
                type_map = {"door supervisor": "door_supervisor", "security guard": "security_guard", "cctv operator": "cctv"}
                license_type = type_map.get(license_type.lower(), "door_supervisor")
            expiry_date = item.get("expiry_date", "").strip()
            if not expiry_date:
                errors.append(f"Row {idx + 1}: Missing expiry date")
                continue
            is_active_raw = item.get("is_active", "true")
            is_active = str(is_active_raw).strip().lower() in ["true", "yes", "1", "active"] if not isinstance(is_active_raw, bool) else is_active_raw
            notes = item.get("notes", "").strip() or None
            
            existing = await db.sia_licenses.find_one({"employee_name": {"$regex": f"^{employee_name}$", "$options": "i"}})
            if existing:
                await db.sia_licenses.update_one({"id": existing["id"]}, {"$set": {
                    "license_number": license_number, "license_type": license_type,
                    "expiry_date": expiry_date, "is_active": is_active, "notes": notes,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }})
                updated += 1
            else:
                new_record = {
                    "id": str(uuid.uuid4()), "employee_name": employee_name, "license_number": license_number,
                    "license_type": license_type, "expiry_date": expiry_date, "is_active": is_active, "notes": notes,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await db.sia_licenses.insert_one(new_record)
                created += 1
        except Exception as e:
            errors.append(f"Row {idx + 1}: {str(e)}")
    return BulkImportResponse(created=created, updated=updated, errors=errors)

# ========== Compliance Stats Endpoint ==========

@api_router.get("/compliance/stats")
async def get_compliance_stats():
    """Get compliance statistics for RTW and SIA"""
    today = datetime.now().strftime("%Y-%m-%d")
    rtw_total = await db.rtw_checks.count_documents({})
    rtw_valid = await db.rtw_checks.count_documents({"status": "valid"})
    rtw_expired = await db.rtw_checks.count_documents({"status": "expired"})
    rtw_pending = await db.rtw_checks.count_documents({"status": "pending"})
    sia_total = await db.sia_licenses.count_documents({})
    sia_active = await db.sia_licenses.count_documents({"is_active": True})
    sia_expiring_soon = await db.sia_licenses.count_documents({"expiry_date": {"$lte": today}, "is_active": True})
    return {
        "rtw": {"total": rtw_total, "valid": rtw_valid, "expired": rtw_expired, "pending": rtw_pending},
        "sia": {"total": sia_total, "active": sia_active, "expiring_soon": sia_expiring_soon}
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
