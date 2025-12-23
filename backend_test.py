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
            "department": "Engineering",
            "position": "Software Developer",
            "annual_salary": 50000.0,
            "bank_account": "12345678",
            "sort_code": "12-34-56",
            "tax_code": "1257L",
            "ni_number": "AB123456C"
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
            "department": "Marketing",
            "position": "Marketing Manager",
            "annual_salary": 45000.0,
            "tax_code": "1257L"
        }
        
        success, response = self.run_test("Create Second Employee", "POST", "employees", 200, employee_data)
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

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("🚀 Starting Payroll API Tests")
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
        self.test_delete_employee()
        
        # Error handling tests
        self.test_error_cases()

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Final Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 Excellent! Backend API is working well")
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