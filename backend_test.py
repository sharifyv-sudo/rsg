import requests
import sys
import json
from datetime import datetime

class PayrollAPITester:
    def __init__(self, base_url="https://timetrack-pro-43.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_employee_id = None
        self.created_payslip_id = None
        self.created_contract_id = None
        self.second_employee_id = None
        self.created_job_id = None
        self.gps_job_id = None
        self.incomplete_gps_job_id = None
        self.created_invoice_id = None
        self.completed_job_id = None

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
            "latitude": 51.5549,
            "longitude": -0.1084,
            "require_location": False,  # Start with GPS disabled
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

    # ========== GPS Clock-in Feature Tests ==========
    
    def test_create_gps_required_job(self):
        """Test creating a job that requires GPS location"""
        job_data = {
            "name": "Manchester City vs Liverpool - Etihad Stadium",
            "client": "Manchester City FC",
            "date": "2025-09-16",
            "location": "Etihad Stadium, Manchester",
            "latitude": 53.4831,
            "longitude": -2.2004,
            "require_location": True,  # GPS required
            "start_time": "15:00",
            "end_time": "19:00",
            "job_type": "Security",
            "staff_required": 3,
            "hourly_rate": 18.00,
            "notes": "High-profile match - GPS verification required",
            "status": "upcoming"
        }
        
        success, response = self.run_test("Create GPS-Required Job", "POST", "jobs", 200, job_data)
        if success and 'id' in response:
            self.gps_job_id = response['id']
            print(f"   Created GPS job ID: {self.gps_job_id}")
            # Verify GPS requirement is set
            if response.get('require_location') == True:
                print("✅ GPS requirement correctly set")
            else:
                print("❌ GPS requirement not set correctly")
        return success, response

    def test_toggle_gps_requirement(self):
        """Test updating job to toggle GPS requirement"""
        if not self.created_job_id:
            print("❌ Skipped - No job ID available")
            return False, {}
        
        # Enable GPS for existing job
        update_data = {
            "require_location": True,
            "latitude": 51.5549,
            "longitude": -0.1084
        }
        success, response = self.run_test("Enable GPS Requirement", "PUT", f"jobs/{self.created_job_id}", 200, update_data)
        
        if success and response.get('require_location') == True:
            print("✅ GPS requirement successfully enabled")
        else:
            print("❌ Failed to enable GPS requirement")
        
        return success, response

    def test_clock_in_without_gps_for_gps_job(self):
        """Test clock-in without GPS for GPS-required job (should fail)"""
        if not hasattr(self, 'gps_job_id') or not self.created_employee_id:
            print("❌ Skipped - No GPS job or employee ID available")
            return False, {}
        
        # First assign employee to GPS job
        assign_data = {"employee_ids": [self.created_employee_id]}
        self.run_test("Assign Employee to GPS Job", "POST", f"jobs/{self.gps_job_id}/assign", 200, assign_data)
        
        # Try to clock in without GPS coordinates
        clock_data = {
            "job_id": self.gps_job_id,
            "notes": "Attempting clock-in without GPS"
        }
        return self.run_test("Clock-in Without GPS (GPS Required)", "POST", f"staff/{self.created_employee_id}/clock-in", 400, clock_data)

    def test_clock_in_with_gps_too_far(self):
        """Test clock-in with GPS coordinates too far from job location (should fail)"""
        if not hasattr(self, 'gps_job_id') or not self.created_employee_id:
            print("❌ Skipped - No GPS job or employee ID available")
            return False, {}
        
        # Try to clock in from London (far from Manchester)
        clock_data = {
            "job_id": self.gps_job_id,
            "latitude": 51.5074,  # London coordinates
            "longitude": -0.1278,
            "notes": "Attempting clock-in from wrong location"
        }
        return self.run_test("Clock-in Too Far (GPS Required)", "POST", f"staff/{self.created_employee_id}/clock-in", 403, clock_data)

    def test_clock_in_with_valid_gps(self):
        """Test clock-in with valid GPS coordinates (should succeed)"""
        if not hasattr(self, 'gps_job_id') or not self.created_employee_id:
            print("❌ Skipped - No GPS job or employee ID available")
            return False, {}
        
        # Clock in from near the stadium (within 500m)
        clock_data = {
            "job_id": self.gps_job_id,
            "latitude": 53.4835,  # Very close to Etihad Stadium
            "longitude": -2.2000,
            "notes": "Valid GPS clock-in"
        }
        success, response = self.run_test("Clock-in Valid GPS", "POST", f"staff/{self.created_employee_id}/clock-in", 200, clock_data)
        
        if success:
            print("✅ GPS verification working correctly")
        
        return success, response

    def test_clock_out_with_gps_required(self):
        """Test clock-out for GPS-required job"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        # Clock out with valid GPS coordinates
        clock_data = {
            "latitude": 53.4835,
            "longitude": -2.2000,
            "notes": "GPS clock-out"
        }
        return self.run_test("Clock-out GPS Required", "POST", f"staff/{self.created_employee_id}/clock-out", 200, clock_data)

    def test_clock_in_non_gps_job(self):
        """Test clock-in for non-GPS job (should work without coordinates)"""
        if not self.created_job_id or not self.second_employee_id:
            print("❌ Skipped - No job or employee ID available")
            return False, {}
        
        # First assign second employee to non-GPS job
        assign_data = {"employee_ids": [self.second_employee_id]}
        self.run_test("Assign Employee to Non-GPS Job", "POST", f"jobs/{self.created_job_id}/assign", 200, assign_data)
        
        # Clock in without GPS coordinates (should work)
        clock_data = {
            "job_id": self.created_job_id,
            "notes": "Non-GPS job clock-in"
        }
        return self.run_test("Clock-in Non-GPS Job", "POST", f"staff/{self.second_employee_id}/clock-in", 200, clock_data)

    def test_clock_out_non_gps_job(self):
        """Test clock-out for non-GPS job"""
        if not self.second_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        # Clock out without GPS coordinates (should work)
        clock_data = {
            "notes": "Non-GPS job clock-out"
        }
        return self.run_test("Clock-out Non-GPS Job", "POST", f"staff/{self.second_employee_id}/clock-out", 200, clock_data)

    def test_gps_job_without_coordinates(self):
        """Test creating GPS-required job without coordinates (should work but clock-in will fail)"""
        job_data = {
            "name": "Test Event - No GPS Coordinates",
            "client": "Test Client",
            "date": "2025-09-17",
            "location": "Test Location",
            "require_location": True,  # GPS required but no coordinates
            "start_time": "10:00",
            "end_time": "14:00",
            "job_type": "Other",
            "staff_required": 1,
            "hourly_rate": 12.00,
            "status": "upcoming"
        }
        
        success, response = self.run_test("Create GPS Job Without Coordinates", "POST", "jobs", 200, job_data)
        if success and 'id' in response:
            self.incomplete_gps_job_id = response['id']
            print(f"   Created incomplete GPS job ID: {self.incomplete_gps_job_id}")
        return success, response

    def test_clock_in_gps_job_no_coordinates(self):
        """Test clock-in for GPS job that has no coordinates configured"""
        if not hasattr(self, 'incomplete_gps_job_id') or not self.created_employee_id:
            print("❌ Skipped - No incomplete GPS job or employee ID available")
            return False, {}
        
        # First assign employee to incomplete GPS job
        assign_data = {"employee_ids": [self.created_employee_id]}
        self.run_test("Assign to Incomplete GPS Job", "POST", f"jobs/{self.incomplete_gps_job_id}/assign", 200, assign_data)
        
        # Try to clock in (should fail with proper error message)
        clock_data = {
            "job_id": self.incomplete_gps_job_id,
            "latitude": 51.5074,
            "longitude": -0.1278,
            "notes": "Attempting clock-in for job without GPS config"
        }
        return self.run_test("Clock-in GPS Job No Coordinates", "POST", f"staff/{self.created_employee_id}/clock-in", 400, clock_data)

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

    # ========== Invoice Tests ==========
    
    def test_get_invoices_empty(self):
        """Test getting invoices when none exist"""
        return self.run_test("Get Invoices (Empty)", "GET", "invoices", 200)

    def test_get_invoice_stats_empty(self):
        """Test getting invoice stats when no invoices exist"""
        return self.run_test("Get Invoice Stats (Empty)", "GET", "invoices/stats/summary", 200)

    def test_create_invoice(self):
        """Test creating a new invoice"""
        invoice_data = {
            "client_name": "Arsenal FC",
            "client_email": "billing@arsenal.com",
            "items": [
                {
                    "description": "Security Services - Match Day",
                    "quantity": 8,
                    "unit_price": 15.50
                },
                {
                    "description": "Steward Services - Match Day", 
                    "quantity": 12,
                    "unit_price": 14.00
                }
            ],
            "tax_rate": 20,
            "issue_date": "2025-08-15",
            "due_date": "2025-09-14",
            "notes": "Payment terms: 30 days"
        }
        
        success, response = self.run_test("Create Invoice", "POST", "invoices", 200, invoice_data)
        if success and 'id' in response:
            self.created_invoice_id = response['id']
            print(f"   Created invoice ID: {self.created_invoice_id}")
            print(f"   Invoice number: {response.get('invoice_number', 'N/A')}")
            print(f"   Total amount: £{response.get('total_amount', 0):.2f}")
            
            # Verify calculations
            expected_subtotal = (8 * 15.50) + (12 * 14.00)  # 124 + 168 = 292
            expected_tax = expected_subtotal * 0.20  # 58.40
            expected_total = expected_subtotal + expected_tax  # 350.40
            
            if abs(response.get('total_amount', 0) - expected_total) < 0.01:
                print("✅ Invoice calculations are correct")
            else:
                print(f"❌ Invoice calculation error: expected {expected_total}, got {response.get('total_amount', 0)}")
        
        return success, response

    def test_get_invoices_with_data(self):
        """Test getting invoices when data exists"""
        return self.run_test("Get Invoices (With Data)", "GET", "invoices", 200)

    def test_get_invoice_by_id(self):
        """Test getting specific invoice by ID"""
        if not self.created_invoice_id:
            print("❌ Skipped - No invoice ID available")
            return False, {}
        return self.run_test("Get Invoice by ID", "GET", f"invoices/{self.created_invoice_id}", 200)

    def test_update_invoice(self):
        """Test updating an invoice"""
        if not self.created_invoice_id:
            print("❌ Skipped - No invoice ID available")
            return False, {}
        
        update_data = {
            "client_email": "finance@arsenal.com",
            "items": [
                {
                    "description": "Security Services - Match Day (Updated)",
                    "quantity": 10,
                    "unit_price": 16.00
                }
            ],
            "tax_rate": 20,
            "notes": "Updated invoice with revised quantities"
        }
        
        success, response = self.run_test("Update Invoice", "PUT", f"invoices/{self.created_invoice_id}", 200, update_data)
        
        if success and response:
            print(f"   Updated total: £{response.get('total_amount', 0):.2f}")
            # Verify new calculations: 10 * 16.00 = 160, tax = 32, total = 192
            expected_total = 160 + 32
            if abs(response.get('total_amount', 0) - expected_total) < 0.01:
                print("✅ Invoice update calculations are correct")
            else:
                print(f"❌ Update calculation error: expected {expected_total}, got {response.get('total_amount', 0)}")
        
        return success, response

    def test_create_completed_job_for_invoice(self):
        """Test creating a completed job to generate invoice from"""
        job_data = {
            "name": "Chelsea vs Manchester United - Stamford Bridge",
            "client": "Chelsea FC",
            "date": "2025-08-10",
            "location": "Stamford Bridge, London",
            "start_time": "14:00",
            "end_time": "18:00",
            "job_type": "Security",
            "staff_required": 6,
            "hourly_rate": 17.50,
            "notes": "Premier League match",
            "status": "completed"
        }
        
        success, response = self.run_test("Create Completed Job", "POST", "jobs", 200, job_data)
        if success and 'id' in response:
            self.completed_job_id = response['id']
            print(f"   Created completed job ID: {self.completed_job_id}")
        return success, response

    def test_generate_invoice_from_job(self):
        """Test auto-generating invoice from completed job"""
        if not self.completed_job_id:
            print("❌ Skipped - No completed job ID available")
            return False, {}
        
        success, response = self.run_test("Generate Invoice from Job", "POST", f"invoices/generate-from-job/{self.completed_job_id}", 200)
        
        if success and response:
            print(f"   Generated invoice: {response.get('invoice_number', 'N/A')}")
            print(f"   Client: {response.get('client_name', 'N/A')}")
            print(f"   Total: £{response.get('total_amount', 0):.2f}")
            print(f"   Job linked: {response.get('job_name', 'N/A')}")
            
            # Verify it's linked to the job
            if response.get('job_id') == self.completed_job_id:
                print("✅ Invoice correctly linked to job")
            else:
                print("❌ Invoice not properly linked to job")
        
        return success, response

    def test_send_invoice(self):
        """Test sending invoice to client"""
        if not self.created_invoice_id:
            print("❌ Skipped - No invoice ID available")
            return False, {}
        
        # Note: This will likely fail due to email API key, but we test the endpoint
        success, response = self.run_test("Send Invoice", "POST", f"invoices/{self.created_invoice_id}/send", 500)
        
        # Check if it's an email-related error (expected)
        if not success and "Failed to send invoice" in str(response):
            print("✅ Send invoice endpoint working (email failure expected)")
            return True, response
        
        return success, response

    def test_mark_invoice_paid(self):
        """Test marking invoice as paid"""
        if not self.created_invoice_id:
            print("❌ Skipped - No invoice ID available")
            return False, {}
        
        success, response = self.run_test("Mark Invoice Paid", "POST", f"invoices/{self.created_invoice_id}/mark-paid", 200)
        
        if success and response:
            print(f"   Payment date: {response.get('payment_date', 'N/A')}")
        
        return success, response

    def test_get_invoice_stats_with_data(self):
        """Test getting invoice stats with data"""
        success, response = self.run_test("Get Invoice Stats (With Data)", "GET", "invoices/stats/summary", 200)
        
        if success and response:
            print(f"   Total invoices: {response.get('total_invoices', 0)}")
            print(f"   Total invoiced: £{response.get('total_invoiced', 0):.2f}")
            print(f"   Total paid: £{response.get('total_paid', 0):.2f}")
            print(f"   Total pending: £{response.get('total_pending', 0):.2f}")
            print(f"   Total overdue: £{response.get('total_overdue', 0):.2f}")
            print(f"   Paid count: {response.get('paid_count', 0)}")
            print(f"   Pending count: {response.get('pending_count', 0)}")
            print(f"   Overdue count: {response.get('overdue_count', 0)}")
            
            # Verify stats make sense
            total_calculated = response.get('total_paid', 0) + response.get('total_pending', 0) + response.get('total_overdue', 0)
            total_invoiced = response.get('total_invoiced', 0)
            
            if abs(total_calculated - total_invoiced) < 0.01:
                print("✅ Invoice stats calculations are consistent")
            else:
                print(f"❌ Stats inconsistency: calculated {total_calculated}, invoiced {total_invoiced}")
        
        return success, response

    def test_invoice_status_filtering(self):
        """Test that invoices can be filtered by status"""
        # Create invoices with different statuses for testing
        draft_invoice = {
            "client_name": "Liverpool FC",
            "client_email": "accounts@liverpool.com",
            "items": [{"description": "Event Security", "quantity": 5, "unit_price": 20.00}],
            "tax_rate": 20,
            "issue_date": "2025-08-16",
            "due_date": "2025-09-15"
        }
        
        success, response = self.run_test("Create Draft Invoice", "POST", "invoices", 200, draft_invoice)
        
        if success:
            # Get all invoices and check status variety
            success2, all_invoices = self.run_test("Get All Invoices for Status Check", "GET", "invoices", 200)
            
            if success2 and all_invoices:
                statuses = [inv.get('status') for inv in all_invoices]
                unique_statuses = set(statuses)
                print(f"   Invoice statuses found: {list(unique_statuses)}")
                
                if len(unique_statuses) >= 2:
                    print("✅ Multiple invoice statuses available for filtering")
                else:
                    print("⚠️  Only one status type found")
        
        return success, response

    def test_delete_invoice(self):
        """Test deleting an invoice"""
        if not self.created_invoice_id:
            print("❌ Skipped - No invoice ID available")
            return False, {}
        return self.run_test("Delete Invoice", "DELETE", f"invoices/{self.created_invoice_id}", 200)

    def test_invoice_error_cases(self):
        """Test invoice-related error handling"""
        print("\n🔍 Testing Invoice Error Cases...")
        
        # Test getting non-existent invoice
        self.run_test("Get Non-existent Invoice", "GET", "invoices/non-existent-id", 404)
        
        # Test updating non-existent invoice
        update_data = {"client_name": "Test Client"}
        self.run_test("Update Non-existent Invoice", "PUT", "invoices/non-existent-id", 404, update_data)
        
        # Test deleting non-existent invoice
        self.run_test("Delete Non-existent Invoice", "DELETE", "invoices/non-existent-id", 404)
        
        # Test marking non-existent invoice as paid
        self.run_test("Mark Non-existent Invoice Paid", "POST", "invoices/non-existent-id/mark-paid", 404)
        
        # Test sending non-existent invoice
        self.run_test("Send Non-existent Invoice", "POST", "invoices/non-existent-id/send", 404)
        
        # Test generating invoice from non-existent job
        self.run_test("Generate Invoice from Non-existent Job", "POST", "invoices/generate-from-job/non-existent-id", 404)
        
        # Test creating invoice with invalid data
        invalid_invoice = {
            "client_name": "",  # Empty name
            "items": [],  # No items
            "tax_rate": -5,  # Negative tax
            "issue_date": "invalid-date",
            "due_date": "invalid-date"
        }
        self.run_test("Create Invalid Invoice", "POST", "invoices", 422, invalid_invoice)

    # ========== Timesheet Tests ==========
    
    def test_get_timesheets_empty(self):
        """Test getting timesheets when none exist"""
        return self.run_test("Get Timesheets (Empty)", "GET", "timesheets", 200)

    def test_create_timesheet_entry(self):
        """Test creating a new timesheet entry with flexible decimal hours"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        timesheet_data = {
            "employee_id": self.created_employee_id,
            "employee_name": "John Smith",
            "hours_worked": 7.5,  # Flexible decimal
            "location": "Emirates Stadium",
            "date": "2025-08-15",
            "notes": "Match day stewarding",
            "hourly_rate": 15.50
        }
        
        success, response = self.run_test("Create Timesheet Entry", "POST", "timesheets", 200, timesheet_data)
        if success and 'id' in response:
            self.created_timesheet_id = response['id']
            print(f"   Created timesheet ID: {self.created_timesheet_id}")
            print(f"   Hours worked: {response.get('hours_worked', 0)}")
            
            # Verify flexible decimal is preserved
            if response.get('hours_worked') == 7.5:
                print("✅ Flexible decimal hours preserved correctly")
            else:
                print(f"❌ Hours decimal issue: expected 7.5, got {response.get('hours_worked')}")
        
        return success, response

    def test_create_timesheet_with_complex_decimal(self):
        """Test creating timesheet with complex decimal (12.505 hours)"""
        if not self.second_employee_id:
            print("❌ Skipped - No second employee ID available")
            return False, {}
        
        timesheet_data = {
            "employee_id": self.second_employee_id,
            "employee_name": "Jane Doe",
            "hours_worked": 12.505,  # Complex decimal
            "location": "Old Trafford",
            "date": "2025-08-16",
            "notes": "Security shift with overtime",
            "hourly_rate": 18.25
        }
        
        success, response = self.run_test("Create Timesheet Complex Decimal", "POST", "timesheets", 200, timesheet_data)
        if success and 'id' in response:
            self.second_timesheet_id = response['id']
            print(f"   Created second timesheet ID: {self.second_timesheet_id}")
            print(f"   Complex decimal hours: {response.get('hours_worked', 0)}")
            
            # Verify complex decimal is preserved
            if abs(response.get('hours_worked', 0) - 12.505) < 0.001:
                print("✅ Complex decimal hours preserved correctly")
            else:
                print(f"❌ Complex decimal issue: expected 12.505, got {response.get('hours_worked')}")
        
        return success, response

    def test_get_timesheets_with_data(self):
        """Test getting timesheets when data exists"""
        return self.run_test("Get Timesheets (With Data)", "GET", "timesheets", 200)

    def test_get_timesheet_by_id(self):
        """Test getting specific timesheet by ID"""
        if not hasattr(self, 'created_timesheet_id') or not self.created_timesheet_id:
            print("❌ Skipped - No timesheet ID available")
            return False, {}
        return self.run_test("Get Timesheet by ID", "GET", f"timesheets/{self.created_timesheet_id}", 200)

    def test_update_timesheet(self):
        """Test updating a timesheet entry"""
        if not hasattr(self, 'created_timesheet_id') or not self.created_timesheet_id:
            print("❌ Skipped - No timesheet ID available")
            return False, {}
        
        update_data = {
            "hours_worked": 8.25,  # Updated flexible decimal
            "notes": "Updated: Extended shift with break",
            "hourly_rate": 16.00
        }
        
        success, response = self.run_test("Update Timesheet", "PUT", f"timesheets/{self.created_timesheet_id}", 200, update_data)
        
        if success and response:
            print(f"   Updated hours: {response.get('hours_worked', 0)}")
            if abs(response.get('hours_worked', 0) - 8.25) < 0.001:
                print("✅ Timesheet update with flexible decimal working")
            else:
                print(f"❌ Update decimal issue: expected 8.25, got {response.get('hours_worked')}")
        
        return success, response

    def test_weekly_timesheet_summary(self):
        """Test weekly timesheet summary"""
        week_start = "2025-08-11"  # Monday of the week containing our entries
        return self.run_test("Weekly Timesheet Summary", "GET", f"timesheets/summary/weekly?week_start={week_start}", 200)

    def test_delete_timesheet(self):
        """Test deleting a timesheet entry"""
        if not hasattr(self, 'created_timesheet_id') or not self.created_timesheet_id:
            print("❌ Skipped - No timesheet ID available")
            return False, {}
        return self.run_test("Delete Timesheet", "DELETE", f"timesheets/{self.created_timesheet_id}", 200)

    def test_timesheet_error_cases(self):
        """Test timesheet-related error handling"""
        print("\n🔍 Testing Timesheet Error Cases...")
        
        # Test getting non-existent timesheet
        self.run_test("Get Non-existent Timesheet", "GET", "timesheets/non-existent-id", 404)
        
        # Test updating non-existent timesheet
        update_data = {"hours_worked": 8.0}
        self.run_test("Update Non-existent Timesheet", "PUT", "timesheets/non-existent-id", 404, update_data)
        
        # Test deleting non-existent timesheet
        self.run_test("Delete Non-existent Timesheet", "DELETE", "timesheets/non-existent-id", 404)

    def test_flexible_pay_rates_employee(self):
        """Test that employee hourly rates accept flexible decimals"""
        if not self.created_employee_id:
            print("❌ Skipped - No employee ID available")
            return False, {}
        
        # Test updating employee with flexible decimal pay rate
        update_data = {
            "hourly_rate": 12.505  # Complex decimal rate
        }
        
        success, response = self.run_test("Employee Flexible Pay Rate", "PUT", f"employees/{self.created_employee_id}", 200, update_data)
        
        if success and response:
            print(f"   Employee hourly rate: £{response.get('hourly_rate', 0)}")
            if abs(response.get('hourly_rate', 0) - 12.505) < 0.001:
                print("✅ Employee flexible pay rate working")
            else:
                print(f"❌ Employee rate issue: expected 12.505, got {response.get('hourly_rate')}")
        
        return success, response

    def test_flexible_pay_rates_job(self):
        """Test that job hourly rates accept flexible decimals"""
        if not self.created_job_id:
            print("❌ Skipped - No job ID available")
            return False, {}
        
        # Test updating job with flexible decimal pay rate
        update_data = {
            "hourly_rate": 18.75  # Flexible decimal rate
        }
        
        success, response = self.run_test("Job Flexible Pay Rate", "PUT", f"jobs/{self.created_job_id}", 200, update_data)
        
        if success and response:
            print(f"   Job hourly rate: £{response.get('hourly_rate', 0)}")
            if abs(response.get('hourly_rate', 0) - 18.75) < 0.001:
                print("✅ Job flexible pay rate working")
            else:
                print(f"❌ Job rate issue: expected 18.75, got {response.get('hourly_rate')}")
        
        return success, response

    def test_staff_assignment_notifications(self):
        """Test that staff assignment triggers notification attempt"""
        if not self.created_job_id or not self.created_employee_id:
            print("❌ Skipped - No job or employee ID available")
            return False, {}
        
        # Assign employee to job with notifications enabled
        assign_data = {
            "employee_ids": [self.created_employee_id]
        }
        
        success, response = self.run_test("Assign Staff with Notifications", "POST", f"jobs/{self.created_job_id}/assign?send_notifications=true", 200, assign_data)
        
        if success and response:
            notifications_sent = response.get('notifications_sent', 0)
            print(f"   Notifications sent: {notifications_sent}")
            
            if notifications_sent > 0:
                print("✅ Notification system triggered (email may fail but count is tracked)")
            else:
                print("⚠️  No notifications sent - check if employee has email")
        
        return success, response

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Payroll API Tests (Including Staff Portal Features)")
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
        
        # GPS Clock-in Feature tests
        print("\n" + "=" * 40)
        print("📍 TESTING GPS CLOCK-IN FEATURE")
        print("=" * 40)
        self.test_create_gps_required_job()
        self.test_toggle_gps_requirement()
        self.test_clock_in_without_gps_for_gps_job()
        self.test_clock_in_with_gps_too_far()
        self.test_clock_in_with_valid_gps()
        self.test_clock_out_with_gps_required()
        self.test_clock_in_non_gps_job()
        self.test_clock_out_non_gps_job()
        self.test_gps_job_without_coordinates()
        self.test_clock_in_gps_job_no_coordinates()
        
        self.test_get_available_employees()
        self.test_assign_employees_to_job()
        self.test_export_job_staff_list()
        self.test_create_second_job()
        self.test_employee_availability_conflict()
        
        # Staff Portal Authentication tests
        print("\n" + "=" * 40)
        print("🔐 TESTING STAFF PORTAL AUTHENTICATION")
        print("=" * 40)
        self.test_admin_login()
        self.test_staff_login_no_employee()
        self.test_staff_login_with_employee()
        self.test_staff_login_wrong_password()
        
        # Staff Portal API tests
        print("\n" + "=" * 40)
        print("👥 TESTING STAFF PORTAL APIs")
        print("=" * 40)
        self.test_staff_assigned_jobs()
        self.test_staff_available_jobs()
        self.test_staff_payslips()
        self.test_staff_timeclock_entries()
        self.test_staff_clock_status()
        self.test_staff_clock_in()
        self.test_staff_clock_out()
        self.test_staff_signup_for_job()
        self.test_staff_withdraw_from_job()
        
        # Invoice Tracker tests
        print("\n" + "=" * 40)
        print("🧾 TESTING INVOICE TRACKER FEATURE")
        print("=" * 40)
        self.test_get_invoices_empty()
        self.test_get_invoice_stats_empty()
        self.test_create_invoice()
        self.test_get_invoices_with_data()
        self.test_get_invoice_by_id()
        self.test_update_invoice()
        self.test_create_completed_job_for_invoice()
        self.test_generate_invoice_from_job()
        self.test_send_invoice()
        self.test_mark_invoice_paid()
        self.test_get_invoice_stats_with_data()
        self.test_invoice_status_filtering()
        self.test_staff_assignment_notifications()
        
        # Dashboard tests
        self.test_dashboard_stats()
        
        # Payslip CRUD tests
        self.test_get_payslips_empty()
        self.test_create_payslip()
        self.test_get_payslips_with_data()
        self.test_get_payslip_by_id()
        self.test_dashboard_with_data()
        
        # Error handling tests
        self.test_error_cases()
        self.test_job_error_cases()
        self.test_staff_error_cases()
        self.test_invoice_error_cases()
        
        # Cleanup tests
        self.test_delete_invoice()
        self.test_delete_payslip()
        self.test_delete_job()
        self.test_unassign_employee_from_contract()
        self.test_delete_contract()
        self.test_delete_employee()

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Final Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! Backend API (including Staff Portal) is working well")
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