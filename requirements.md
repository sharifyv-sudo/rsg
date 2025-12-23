# PayrollPro UK - Requirements & Architecture

## Original Problem Statement
Create a payroll system with an interface, British pound. Compatible with laptop. Open access (no authentication). Tax calculations are optional.

## Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB

### Features Implemented
1. **Dashboard**
   - Total employees count
   - Monthly payroll amount (£)
   - Average annual salary
   - Department breakdown
   - Recent payslips

2. **Employee Management**
   - Add/Edit/Delete employees
   - Fields: Name, Email, Department, Position, Annual Salary
   - Optional: Bank Account, Sort Code, Tax Code, NI Number
   - Search functionality

3. **Payslip Generation**
   - Select employee and pay period (month/year)
   - Optional deductions: Tax (PAYE), National Insurance
   - Bonus additions
   - Auto-calculate net pay
   - View/Print payslip details

### API Endpoints
- `GET /api/` - Health check
- `GET/POST /api/employees` - List/Create employees
- `GET/PUT/DELETE /api/employees/{id}` - Single employee operations
- `GET/POST /api/payslips` - List/Create payslips
- `GET/DELETE /api/payslips/{id}` - Single payslip operations
- `GET /api/dashboard` - Dashboard statistics

## Next Action Items
1. Add bulk employee import (CSV)
2. Export payslips to PDF
3. Payroll history reports by date range
4. Automatic UK tax (PAYE/NI) calculations based on current rates
5. Employee payslip email notifications
