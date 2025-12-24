import requests
import sys
import json
from datetime import datetime

class PayrollAPITester:
    def __init__(self, base_url="https://payroll-gbp.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_employee_id = None
        self.created_payslip_id = None
        self.created_contract_id = None
        self.second_employee_id = None
        self.created_job_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if endpoint else self.base_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")

            return success, response.json() if response.text and response.status_code < 500 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_get_employees_empty(self):
        """Test getting employees when none exist"""
        return self.run_test("Get Employees (Empty)", "GET", "employees", 200)

    def test_create_employee(self):
        """Test creating a new employee"""
        employee_data = {
            "name": "John Smith",
            "email": "john.smith@company.com",
            "phone": "07123456789",
            "department": "Engineering",
            "position": "Software Developer",
            "annual_salary": 50000.0,
            "bank_account": "12345678",
            "sort_code": "12-34-56",
            "tax_code": "1257L",
            "ni_number": "AB123456C",
            "availability": "available"
        }
        
        success, response = self.run_test("Create Employee", "POST", "employees", 200, employee_data)
        if success and 'id' in response:
            self.created_employee_id = response['id']
            print(f"   Created employee ID: {self.created_employee_id}")
        return success, response

    def test_get_employees_with_data(self):
        """Test getting employees when data exists"""
        return self.run_test("Get Employees (With Data)", "GET", "employees", 200)

    def test_get_employee_by_id(self):
        """Test getting specific employee by ID"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        return self.run_test("Get Employee by ID", "GET", f"employees/{self.created_employee_id}", 200)

    def test_update_employee(self):
        """Test updating an employee"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        update_data = {
            "annual_salary": 55000.0,
            "position": "Senior Software Developer"
        }
        return self.run_test("Update Employee", "PUT", f"employees/{self.created_employee_id}", 200, update_data)

    def test_create_second_employee(self):
        """Test creating a second employee for dashboard stats"""
        employee_data = {
            "name": "Jane Doe",
            "email": "jane.doe@company.com",
            "phone": "07987654321",
            "department": "Marketing",
            "position": "Marketing Manager",
            "annual_salary": 45000.0,
            "tax_code": "1257L",
            "availability": "available"
        }
        
        success, response = self.run_test("Create Second Employee", "POST", "employees", 200, employee_data)
        if success and 'id' in response:
            self.second_employee_id = response['id']
            print(f"   Created second employee ID: {self.second_employee_id}")
        return success, response

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        return self.run_test("Dashboard Stats", "GET", "dashboard", 200)

    def test_get_payslips_empty(self):
        """Test getting payslips when none exist"""
        return self.run_test("Get Payslips (Empty)", "GET", "payslips", 200)

    def test_create_payslip(self):
        """Test creating a payslip"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        payslip_data = {
            "employee_id": self.created_employee_id,
            "period_month": 8,  # August
            "period_year": 2025,
            "tax_deduction": 500.0,
            "ni_deduction": 200.0,
            "bonuses": 1000.0,
            "other_deductions": []
        }
        
        success, response = self.run_test("Create Payslip", "POST", "payslips", 200, payslip_data)
        if success and 'id' in response:
            self.created_payslip_id = response['id']
            print(f"   Created payslip ID: {self.created_payslip_id}")
        return success, response

    def test_get_payslips_with_data(self):
        """Test getting payslips when data exists"""
        return self.run_test("Get Payslips (With Data)", "GET", "payslips", 200)

    def test_get_payslip_by_id(self):
        """Test getting specific payslip by ID"""
        if not self.created_payslip_id:
            print("❌ Skipped - No payslip ID available")
            return False, {}
        return self.run_test("Get Payslip by ID", "GET", f"payslips/{self.created_payslip_id}", 200)

    def test_dashboard_with_data(self):
        """Test dashboard with employee and payslip data"""
        return self.run_test("Dashboard with Data", "GET", "dashboard", 200)

    def test_delete_payslip(self):
        """Test deleting a payslip"""
        if not self.created_payslip_id:
            print("❌ Skipped - No payslip ID available")
            return False, {}
        return self.run_test("Delete Payslip", "DELETE", f"payslips/{self.created_payslip_id}", 200)

    def test_delete_employee(self):
        """Test deleting an employee"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        return self.run_test("Delete Employee", "DELETE", f"employees/{self.created_employee_id}", 200)

    def test_error_cases(self):
        """Test error handling"""
        print("\n🔍 Testing Error Cases...")
        
        # Test getting non-existent employee
        self.run_test("Get Non-existent Employee", "GET", "employees/non-existent-id", 404)
        
        # Test getting non-existent payslip
        self.run_test("Get Non-existent Payslip", "GET", "payslips/non-existent-id", 404)
        
        # Test getting non-existent contract
        self.run_test("Get Non-existent Contract", "GET", "contracts/non-existent-id", 404)
        
        # Test creating payslip for non-existent employee
        invalid_payslip = {
            "employee_id": "non-existent-id",
            "period_month": 8,
            "period_year": 2025,
            "tax_deduction": 0,
            "ni_deduction": 0,
            "bonuses": 0
        }
        self.run_test("Create Payslip for Non-existent Employee", "POST", "payslips", 404, invalid_payslip)

    # ========== Contract Tests ==========
    
    def test_get_contracts_empty(self):
        """Test getting contracts when none exist"""
        return self.run_test("Get Contracts (Empty)", "GET", "contracts", 200)

    def test_create_contract(self):
        """Test creating a new contract"""
        contract_data = {
            "name": "Website Redesign Project",
            "client": "ABC Corporation",
            "budget": 100000.0,
            "start_date": "2025-01-01",
            "end_date": "2025-06-30",
            "description": "Complete website redesign and development",
            "status": "active"
        }
        
        success, response = self.run_test("Create Contract", "POST", "contracts", 200, contract_data)
        if success and 'id' in response:
            self.created_contract_id = response['id']
            print(f"   Created contract ID: {self.created_contract_id}")
        return success, response

    def test_get_contracts_with_data(self):
        """Test getting contracts when data exists"""
        return self.run_test("Get Contracts (With Data)", "GET", "contracts", 200)

    def test_get_contract_by_id(self):
        """Test getting specific contract by ID"""
        if not self.created_contract_id:
            print("❌ Skipped - No contract ID available")
            return False, {}
        return self.run_test("Get Contract by ID", "GET", f"contracts/{self.created_contract_id}", 200)

    def test_update_contract(self):
        """Test updating a contract"""
        if not self.created_contract_id:
            print("❌ Skipped - No contract ID available")
            return False, {}
        
        update_data = {
            "budget": 120000.0,
            "status": "active",
            "description": "Updated project scope with additional features"
        }
        return self.run_test("Update Contract", "PUT", f"contracts/{self.created_contract_id}", 200, update_data)

    def test_assign_employee_to_contract(self):
        """Test assigning employee to contract"""
        if not self.created_employee_id or not self.created_contract_id:
            print("❌ Skipped - No employee or contract ID available")
            return False, {}
        
        update_data = {
            "contract_id": self.created_contract_id
        }
        return self.run_test("Assign Employee to Contract", "PUT", f"employees/{self.created_employee_id}", 200, update_data)

    def test_assign_second_employee_to_contract(self):
        """Test assigning second employee to contract"""
        if not self.second_employee_id or not self.created_contract_id:
            print("❌ Skipped - No second employee or contract ID available")
            return False, {}
        
        update_data = {
            "contract_id": self.created_contract_id
        }
        return self.run_test("Assign Second Employee to Contract", "PUT", f"employees/{self.second_employee_id}", 200, update_data)

    def test_contract_with_employees(self):
        """Test getting contract with assigned employees and budget calculations"""
        if not self.created_contract_id:
            print("❌ Skipped - No contract ID available")
            return False, {}
        
        success, response = self.run_test("Get Contract with Employees", "GET", f"contracts/{self.created_contract_id}", 200)
        
        if success and response:
            print(f"   Contract has {response.get('employee_count', 0)} employees")
            print(f"   Labor cost: £{response.get('labor_cost', 0):,.2f}")
            print(f"   Budget utilization: {response.get('budget_utilization', 0):.1f}%")
            print(f"   Budget remaining: £{response.get('budget_remaining', 0):,.2f}")
            
            # Verify calculations
            expected_labor_cost = 50000 + 45000  # John Smith + Jane Doe salaries
            actual_labor_cost = response.get('labor_cost', 0)
            if abs(actual_labor_cost - expected_labor_cost) < 1:
                print("✅ Labor cost calculation is correct")
            else:
                print(f"❌ Labor cost mismatch: expected {expected_labor_cost}, got {actual_labor_cost}")
        
        return success, response

    def test_contracts_list_with_calculations(self):
        """Test contracts list includes proper calculations"""
        success, response = self.run_test("Get Contracts List with Calculations", "GET", "contracts", 200)
        
        if success and response and len(response) > 0:
            contract = response[0]  # First contract
            print(f"   Contract: {contract.get('name')}")
            print(f"   Employee count: {contract.get('employee_count', 0)}")
            print(f"   Labor cost: £{contract.get('labor_cost', 0):,.2f}")
            print(f"   Budget utilization: {contract.get('budget_utilization', 0):.1f}%")
        
        return success, response

    def test_unassign_employee_from_contract(self):
        """Test unassigning employee from contract"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        update_data = {
            "contract_id": None
        }
        return self.run_test("Unassign Employee from Contract", "PUT", f"employees/{self.created_employee_id}", 200, update_data)

    def test_delete_contract(self):
        """Test deleting a contract"""
        if not self.created_contract_id:
            print("❌ Skipped - No contract ID available")
            return False, {}
        return self.run_test("Delete Contract", "DELETE", f"contracts/{self.created_contract_id}", 200)

    # ========== Job Assignment Tests ==========
    
    def test_get_jobs_empty(self):
        """Test getting jobs when none exist"""
        return self.run_test("Get Jobs (Empty)", "GET", "jobs", 200)

    def test_create_job(self):
        """Test creating a new job"""
        job_data = {
            "name": "Arsenal vs Chelsea - Emirates Stadium",
            "client": "Arsenal FC",
            "date": "2025-09-15",
            "location": "Emirates Stadium, London",
            "start_time": "14:00",
            "end_time": "18:00",
            "job_type": "Steward",
            "staff_required": 5,
            "hourly_rate": 15.50,
            "notes": "Premier League match - high security required",
            "status": "upcoming"
        }
        
        success, response = self.run_test("Create Job", "POST", "jobs", 200, job_data)
        if success and 'id' in response:
            self.created_job_id = response['id']
            print(f"   Created job ID: {self.created_job_id}")
        return success, response

    def test_get_jobs_with_data(self):
        """Test getting jobs when data exists"""
        return self.run_test("Get Jobs (With Data)", "GET", "jobs", 200)

    def test_get_job_by_id(self):
        """Test getting specific job by ID"""
        if not self.created_job_id:
            print("❌ Skipped - No job ID available")
            return False, {}
        return self.run_test("Get Job by ID", "GET", f"jobs/{self.created_job_id}", 200)

    def test_update_job(self):
        """Test updating a job"""
        if not self.created_job_id:
            print("❌ Skipped - No job ID available")
            return False, {}
        
        update_data = {
            "staff_required": 8,
            "hourly_rate": 16.00,
            "notes": "Updated: Extra security staff required"
        }
        return self.run_test("Update Job", "PUT", f"jobs/{self.created_job_id}", 200, update_data)

    def test_get_available_employees(self):
        """Test getting available employees for job assignment"""
        # Test with job date parameter
        return self.run_test("Get Available Employees", "GET", "employees/available?job_date=2025-09-15", 200)

    def test_assign_employees_to_job(self):
        """Test assigning employees to a job"""
        if not self.created_job_id or not self.created_employee_id or not self.second_employee_id:
            print("❌ Skipped - Missing job or employee IDs")
            return False, {}
        
        assign_data = {
            "employee_ids": [self.created_employee_id, self.second_employee_id]
        }
        return self.run_test("Assign Employees to Job", "POST", f"jobs/{self.created_job_id}/assign", 200, assign_data)

    def test_export_job_staff_list(self):
        """Test exporting job staff list"""
        if not self.created_job_id:
            print("❌ Skipped - No job ID available")
            return False, {}
        
        success, response = self.run_test("Export Job Staff List", "GET", f"jobs/{self.created_job_id}/export", 200)
        
        if success and response:
            print(f"   Job: {response.get('job', {}).get('name', 'N/A')}")
            print(f"   Staff count: {len(response.get('staff_list', []))}")
            print(f"   Company: {response.get('company', 'N/A')}")
            
            # Verify export structure
            required_fields = ['job', 'staff_list', 'export_date', 'company']
            missing_fields = [field for field in required_fields if field not in response]
            if not missing_fields:
                print("✅ Export structure is correct")
            else:
                print(f"❌ Missing export fields: {missing_fields}")
        
        return success, response

    def test_create_second_job(self):
        """Test creating a second job for testing conflicts"""
        job_data = {
            "name": "Manchester United vs Liverpool - Old Trafford",
            "client": "Manchester United FC",
            "date": "2025-09-15",  # Same date as first job
            "location": "Old Trafford, Manchester",
            "start_time": "15:00",
            "end_time": "19:00",
            "job_type": "Security",
            "staff_required": 3,
            "hourly_rate": 18.00,
            "status": "upcoming"
        }
        
        success, response = self.run_test("Create Second Job (Same Date)", "POST", "jobs", 200, job_data)
        return success, response

    def test_employee_availability_conflict(self):
        """Test that assigned employees show as unavailable for same date"""
        success, response = self.run_test("Check Employee Availability Conflicts", "GET", "employees/available?job_date=2025-09-15", 200)
        
        if success and response:
            assigned_employees = [emp for emp in response if emp.get('is_assigned_on_date', False)]
            print(f"   Employees assigned on date: {len(assigned_employees)}")
            if len(assigned_employees) >= 2:  # Should have our 2 assigned employees
                print("✅ Availability conflict detection working")
            else:
                print("❌ Availability conflict detection may not be working")
        
        return success, response

    def test_job_error_cases(self):
        """Test job-related error handling"""
        print("\n🔍 Testing Job Error Cases...")
        
        # Test getting non-existent job
        self.run_test("Get Non-existent Job", "GET", "jobs/non-existent-id", 404)
        
        # Test updating non-existent job
        update_data = {"staff_required": 10}
        self.run_test("Update Non-existent Job", "PUT", "jobs/non-existent-id", 404, update_data)
        
        # Test assigning to non-existent job
        assign_data = {"employee_ids": ["some-id"]}
        self.run_test("Assign to Non-existent Job", "POST", "jobs/non-existent-id/assign", 404, assign_data)
        
        # Test export for non-existent job
        self.run_test("Export Non-existent Job", "GET", "jobs/non-existent-id/export", 404)

    def test_delete_job(self):
        """Test deleting a job"""
        if not self.created_job_id:
            print("❌ Skipped - No job ID available")
            return False, {}
        return self.run_test("Delete Job", "DELETE", f"jobs/{self.created_job_id}", 200)

    # ========== Staff Portal Authentication Tests ==========
    
    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "info@rightservicegroup.co.uk",
            "password": "LondonE7"
        }
        success, response = self.run_test("Admin Login", "POST", "auth/login", 200, login_data)
        
        if success and response:
            print(f"   User type: {response.get('user_type')}")
            print(f"   User name: {response.get('user_name')}")
            if response.get('user_type') == 'admin':
                print("✅ Admin login working correctly")
            else:
                print("❌ Admin login returned wrong user type")
        
        return success, response

    def test_staff_login_no_employee(self):
        """Test staff login with non-existent employee"""
        login_data = {
            "email": "nonexistent@company.com",
            "password": "RSG2025"
        }
        return self.run_test("Staff Login (Non-existent)", "POST", "auth/login", 401, login_data)

    def test_staff_login_with_employee(self):
        """Test staff login with existing employee"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        # Use the email from the created employee
        login_data = {
            "email": "john.smith@company.com",
            "password": "RSG2025"
        }
        success, response = self.run_test("Staff Login (Valid Employee)", "POST", "auth/login", 200, login_data)
        
        if success and response:
            print(f"   User type: {response.get('user_type')}")
            print(f"   User ID: {response.get('user_id')}")
            print(f"   User name: {response.get('user_name')}")
            if response.get('user_type') == 'staff':
                print("✅ Staff login working correctly")
            else:
                print("❌ Staff login returned wrong user type")
        
        return success, response

    def test_staff_login_wrong_password(self):
        """Test staff login with wrong password"""
        login_data = {
            "email": "john.smith@company.com",
            "password": "WrongPassword"
        }
        return self.run_test("Staff Login (Wrong Password)", "POST", "auth/login", 401, login_data)

    # ========== Staff Portal API Tests ==========
    
    def test_staff_assigned_jobs(self):
        """Test getting staff assigned jobs"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        return self.run_test("Staff Assigned Jobs", "GET", f"staff/{self.created_employee_id}/jobs", 200)

    def test_staff_available_jobs(self):
        """Test getting available jobs for staff"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        return self.run_test("Staff Available Jobs", "GET", f"staff/{self.created_employee_id}/available-jobs", 200)

    def test_staff_payslips(self):
        """Test getting staff payslips"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        return self.run_test("Staff Payslips", "GET", f"staff/{self.created_employee_id}/payslips", 200)

    def test_staff_timeclock_entries(self):
        """Test getting staff timeclock entries"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        return self.run_test("Staff Timeclock Entries", "GET", f"staff/{self.created_employee_id}/timeclock", 200)

    def test_staff_clock_status(self):
        """Test getting staff clock status"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        return self.run_test("Staff Clock Status", "GET", f"staff/{self.created_employee_id}/status", 200)

    def test_staff_clock_in(self):
        """Test staff clock in"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        clock_data = {
            "job_id": None,
            "notes": "Test clock in"
        }
        return self.run_test("Staff Clock In", "POST", f"staff/{self.created_employee_id}/clock-in", 200, clock_data)

    def test_staff_clock_out(self):
        """Test staff clock out"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        clock_data = {
            "notes": "Test clock out"
        }
        return self.run_test("Staff Clock Out", "POST", f"staff/{self.created_employee_id}/clock-out", 200, clock_data)

    def test_staff_signup_for_job(self):
        """Test staff signing up for a job"""
        if not self.created_employee_id or not self.created_job_id:
            print("❌ Skipped - No employee or job ID available")
            return False, {}
        
        signup_data = {
            "job_id": self.created_job_id
        }
        return self.run_test("Staff Job Signup", "POST", f"staff/{self.created_employee_id}/signup-job", 200, signup_data)

    def test_staff_withdraw_from_job(self):
        """Test staff withdrawing from a job"""
        if not self.created_employee_id or not self.created_job_id:
            print("❌ Skipped - No employee or job ID available")
            return False, {}
        
        return self.run_test("Staff Job Withdraw", "POST", f"staff/{self.created_employee_id}/withdraw-job/{self.created_job_id}", 200)

    def test_staff_error_cases(self):
        """Test staff portal error handling"""
        print("\n🔍 Testing Staff Portal Error Cases...")
        
        # Test with non-existent employee ID
        fake_id = "non-existent-employee-id"
        
        self.run_test("Staff Jobs (Non-existent)", "GET", f"staff/{fake_id}/jobs", 200)  # Should return empty list
        self.run_test("Staff Available Jobs (Non-existent)", "GET", f"staff/{fake_id}/available-jobs", 200)  # Should return empty list
        self.run_test("Staff Payslips (Non-existent)", "GET", f"staff/{fake_id}/payslips", 200)  # Should return empty list
        self.run_test("Staff Clock Status (Non-existent)", "GET", f"staff/{fake_id}/status", 200)  # Should return not clocked in
        
        # Test clock in for non-existent employee
        clock_data = {"job_id": None, "notes": "Test"}
        self.run_test("Clock In (Non-existent Employee)", "POST", f"staff/{fake_id}/clock-in", 404, clock_data)
        
        # Test job signup for non-existent job
        if self.created_employee_id:
            signup_data = {"job_id": "non-existent-job-id"}
            self.run_test("Job Signup (Non-existent Job)", "POST", f"staff/{self.created_employee_id}/signup-job", 404, signup_data)

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Payroll API Tests (Including Contracts & Job Assignments Features)")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)

        # Basic API tests
        self.test_root_endpoint()
        
        # Employee CRUD tests
        self.test_get_employees_empty()
        self.test_create_employee()
        self.test_get_employees_with_data()
        self.test_get_employee_by_id()
        self.test_update_employee()
        self.test_create_second_employee()
        
        # Contract CRUD tests
        print("\n" + "=" * 40)
        print("🏢 TESTING CONTRACTS FEATURE")
        print("=" * 40)
        self.test_get_contracts_empty()
        self.test_create_contract()
        self.test_get_contracts_with_data()
        self.test_get_contract_by_id()
        self.test_update_contract()
        
        # Contract-Employee Integration tests
        print("\n📋 Testing Contract-Employee Integration...")
        self.test_assign_employee_to_contract()
        self.test_assign_second_employee_to_contract()
        self.test_contract_with_employees()
        self.test_contracts_list_with_calculations()
        
        # Job Assignment tests
        print("\n" + "=" * 40)
        print("📅 TESTING JOB ASSIGNMENTS FEATURE")
        print("=" * 40)
        self.test_get_jobs_empty()
        self.test_create_job()
        self.test_get_jobs_with_data()
        self.test_get_job_by_id()
        self.test_update_job()
        self.test_get_available_employees()
        self.test_assign_employees_to_job()
        self.test_export_job_staff_list()
        self.test_create_second_job()
        self.test_employee_availability_conflict()
        
        # Dashboard tests
        self.test_dashboard_stats()
        
        # Payslip CRUD tests
        self.test_get_payslips_empty()
        self.test_create_payslip()
        self.test_get_payslips_with_data()
        self.test_get_payslip_by_id()
        self.test_dashboard_with_data()
        
        # Cleanup tests
        self.test_delete_payslip()
        self.test_delete_job()
        self.test_unassign_employee_from_contract()
        self.test_delete_contract()
        self.test_delete_employee()
        
        # Error handling tests
        self.test_error_cases()
        self.test_job_error_cases()

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Final Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! Backend API (including Contracts & Job Assignments) is working well")
        elif success_rate >= 70:
            print("⚠️  Good, but some issues need attention")
        else:
            print("❌ Major issues detected - needs immediate attention")
        
        return success_rate >= 70

def main():
    """Main test execution"""
    tester = PayrollAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())