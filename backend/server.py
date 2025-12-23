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
    department: str
    position: str
    annual_salary: float  # In GBP
    contract_id: Optional[str] = None  # Assigned contract
    bank_account: Optional[str] = None
    sort_code: Optional[str] = None
    tax_code: Optional[str] = "1257L"  # Default UK tax code
    ni_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeCreate(BaseModel):
    name: str
    email: str
    department: str
    position: str
    annual_salary: float
    contract_id: Optional[str] = None
    bank_account: Optional[str] = None
    sort_code: Optional[str] = None
    tax_code: Optional[str] = "1257L"
    ni_number: Optional[str] = None

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    annual_salary: Optional[float] = None
    contract_id: Optional[str] = None
    bank_account: Optional[str] = None
    sort_code: Optional[str] = None
    tax_code: Optional[str] = None
    ni_number: Optional[str] = None

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

# ========== Employee Endpoints ==========

@api_router.get("/")
async def root():
    return {"message": "Payroll System API - British Pound (£)"}

@api_router.get("/employees", response_model=List[Employee])
async def get_employees():
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    for emp in employees:
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
