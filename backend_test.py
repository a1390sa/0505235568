#!/usr/bin/env python3
"""
Backend API Testing for Task Manager Application
Tests all CRUD operations, Excel import, and upcoming tasks functionality
"""

import requests
import json
import os
import openpyxl
import io
from datetime import datetime, date
import time

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    base_url = line.split('=')[1].strip()
                    return f"{base_url}/api"
    except:
        pass
    return "http://localhost:8001/api"

BASE_URL = get_backend_url()
print(f"Testing Backend API at: {BASE_URL}")

class TaskManagerTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.created_task_ids = []
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name, success, message=""):
        if success:
            self.test_results['passed'] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")

    def test_api_health(self):
        """Test if API is accessible"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                self.log_result("API Health Check", True, f"Status: {response.status_code}")
                return True
            else:
                self.log_result("API Health Check", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_create_task(self):
        """Test creating tasks with different configurations"""
        test_cases = [
            {
                "name": "مراجعة التقارير الشهرية",
                "date": "2024-01-15",
                "frequency": "daily",
                "time": "09:00",
                "priority": "high",
                "category": "عمل"
            },
            {
                "name": "اجتماع الفريق الأسبوعي",
                "date": "2024-01-16",
                "frequency": "weekly",
                "time": "14:30",
                "priority": "medium",
                "category": "اجتماعات"
            },
            {
                "name": "متابعة المشروع الجديد",
                "date": "2024-01-17",
                "frequency": "daily",
                "time": "11:00",
                "priority": "low",
                "category": "مشاريع"
            }
        ]

        for i, task_data in enumerate(test_cases):
            try:
                response = requests.post(f"{self.base_url}/tasks", json=task_data, timeout=10)
                if response.status_code == 200:
                    task = response.json()
                    if task.get('id') and task.get('name') == task_data['name']:
                        self.created_task_ids.append(task['id'])
                        self.log_result(f"Create Task {i+1}", True, f"ID: {task['id']}")
                    else:
                        self.log_result(f"Create Task {i+1}", False, "Invalid response format")
                else:
                    self.log_result(f"Create Task {i+1}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result(f"Create Task {i+1}", False, f"Exception: {str(e)}")

        # Test validation - missing required fields
        try:
            invalid_task = {"name": "مهمة ناقصة"}  # Missing required fields
            response = requests.post(f"{self.base_url}/tasks", json=invalid_task, timeout=10)
            if response.status_code == 422:  # Validation error expected
                self.log_result("Create Task Validation", True, "Correctly rejected invalid data")
            else:
                self.log_result("Create Task Validation", False, f"Should reject invalid data, got: {response.status_code}")
        except Exception as e:
            self.log_result("Create Task Validation", False, f"Exception: {str(e)}")

    def test_get_all_tasks(self):
        """Test getting all tasks and filtering"""
        try:
            # Get all tasks
            response = requests.get(f"{self.base_url}/tasks", timeout=10)
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    self.log_result("Get All Tasks", True, f"Retrieved {len(tasks)} tasks")
                else:
                    self.log_result("Get All Tasks", False, "Response is not a list")
            else:
                self.log_result("Get All Tasks", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get All Tasks", False, f"Exception: {str(e)}")

        # Test filtering by frequency
        for frequency in ["daily", "weekly"]:
            try:
                response = requests.get(f"{self.base_url}/tasks?frequency={frequency}", timeout=10)
                if response.status_code == 200:
                    tasks = response.json()
                    if isinstance(tasks, list):
                        # Verify all tasks have the correct frequency
                        valid = all(task.get('frequency') == frequency for task in tasks)
                        if valid:
                            self.log_result(f"Filter by {frequency}", True, f"Found {len(tasks)} {frequency} tasks")
                        else:
                            self.log_result(f"Filter by {frequency}", False, "Some tasks have wrong frequency")
                    else:
                        self.log_result(f"Filter by {frequency}", False, "Response is not a list")
                else:
                    self.log_result(f"Filter by {frequency}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"Filter by {frequency}", False, f"Exception: {str(e)}")

        # Test filtering by priority
        for priority in ["high", "medium", "low"]:
            try:
                response = requests.get(f"{self.base_url}/tasks?priority={priority}", timeout=10)
                if response.status_code == 200:
                    tasks = response.json()
                    if isinstance(tasks, list):
                        valid = all(task.get('priority') == priority for task in tasks)
                        if valid:
                            self.log_result(f"Filter by {priority} priority", True, f"Found {len(tasks)} {priority} priority tasks")
                        else:
                            self.log_result(f"Filter by {priority} priority", False, "Some tasks have wrong priority")
                    else:
                        self.log_result(f"Filter by {priority} priority", False, "Response is not a list")
                else:
                    self.log_result(f"Filter by {priority} priority", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"Filter by {priority} priority", False, f"Exception: {str(e)}")

        # Test filtering by completed status
        for completed in [True, False]:
            try:
                response = requests.get(f"{self.base_url}/tasks?completed={str(completed).lower()}", timeout=10)
                if response.status_code == 200:
                    tasks = response.json()
                    if isinstance(tasks, list):
                        valid = all(task.get('completed') == completed for task in tasks)
                        if valid:
                            self.log_result(f"Filter by completed={completed}", True, f"Found {len(tasks)} tasks")
                        else:
                            self.log_result(f"Filter by completed={completed}", False, "Some tasks have wrong completed status")
                    else:
                        self.log_result(f"Filter by completed={completed}", False, "Response is not a list")
                else:
                    self.log_result(f"Filter by completed={completed}", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_result(f"Filter by completed={completed}", False, f"Exception: {str(e)}")

    def test_get_single_task(self):
        """Test getting single task by ID"""
        if not self.created_task_ids:
            self.log_result("Get Single Task", False, "No task IDs available for testing")
            return

        # Test valid ID
        task_id = self.created_task_ids[0]
        try:
            response = requests.get(f"{self.base_url}/tasks/{task_id}", timeout=10)
            if response.status_code == 200:
                task = response.json()
                if task.get('id') == task_id:
                    self.log_result("Get Single Task (Valid ID)", True, f"Retrieved task: {task.get('name')}")
                else:
                    self.log_result("Get Single Task (Valid ID)", False, "Task ID mismatch")
            else:
                self.log_result("Get Single Task (Valid ID)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Single Task (Valid ID)", False, f"Exception: {str(e)}")

        # Test invalid ID
        try:
            response = requests.get(f"{self.base_url}/tasks/invalid_id_123", timeout=10)
            if response.status_code == 404 or response.status_code == 400:
                self.log_result("Get Single Task (Invalid ID)", True, f"Correctly returned {response.status_code}")
            else:
                self.log_result("Get Single Task (Invalid ID)", False, f"Should return 404/400, got: {response.status_code}")
        except Exception as e:
            self.log_result("Get Single Task (Invalid ID)", False, f"Exception: {str(e)}")

    def test_update_task(self):
        """Test updating tasks"""
        if not self.created_task_ids:
            self.log_result("Update Task", False, "No task IDs available for testing")
            return

        task_id = self.created_task_ids[0]

        # Test updating task name
        try:
            update_data = {"name": "مهمة محدثة - اسم جديد"}
            response = requests.put(f"{self.base_url}/tasks/{task_id}", json=update_data, timeout=10)
            if response.status_code == 200:
                task = response.json()
                if task.get('name') == update_data['name']:
                    self.log_result("Update Task Name", True, "Name updated successfully")
                else:
                    self.log_result("Update Task Name", False, "Name not updated correctly")
            else:
                self.log_result("Update Task Name", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Update Task Name", False, f"Exception: {str(e)}")

        # Test toggling completed status
        try:
            update_data = {"completed": True}
            response = requests.put(f"{self.base_url}/tasks/{task_id}", json=update_data, timeout=10)
            if response.status_code == 200:
                task = response.json()
                if task.get('completed') == True:
                    self.log_result("Toggle Task Completion", True, "Completed status updated")
                else:
                    self.log_result("Toggle Task Completion", False, "Completed status not updated")
            else:
                self.log_result("Toggle Task Completion", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Toggle Task Completion", False, f"Exception: {str(e)}")

        # Test updating priority
        try:
            update_data = {"priority": "high"}
            response = requests.put(f"{self.base_url}/tasks/{task_id}", json=update_data, timeout=10)
            if response.status_code == 200:
                task = response.json()
                if task.get('priority') == "high":
                    self.log_result("Update Task Priority", True, "Priority updated successfully")
                else:
                    self.log_result("Update Task Priority", False, "Priority not updated correctly")
            else:
                self.log_result("Update Task Priority", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Update Task Priority", False, f"Exception: {str(e)}")

        # Test update with invalid ID
        try:
            update_data = {"name": "تحديث مهمة غير موجودة"}
            response = requests.put(f"{self.base_url}/tasks/invalid_id_123", json=update_data, timeout=10)
            if response.status_code == 404 or response.status_code == 400:
                self.log_result("Update Task (Invalid ID)", True, f"Correctly returned {response.status_code}")
            else:
                self.log_result("Update Task (Invalid ID)", False, f"Should return 404/400, got: {response.status_code}")
        except Exception as e:
            self.log_result("Update Task (Invalid ID)", False, f"Exception: {str(e)}")

    def test_delete_task(self):
        """Test deleting tasks"""
        if len(self.created_task_ids) < 2:
            self.log_result("Delete Task", False, "Need at least 2 task IDs for testing")
            return

        # Test deleting valid task
        task_id = self.created_task_ids.pop()  # Remove from list so we don't try to delete again
        try:
            response = requests.delete(f"{self.base_url}/tasks/{task_id}", timeout=10)
            if response.status_code == 200:
                result = response.json()
                if "deleted" in result.get('message', '').lower():
                    self.log_result("Delete Task (Valid ID)", True, "Task deleted successfully")
                else:
                    self.log_result("Delete Task (Valid ID)", False, "Unexpected response message")
            else:
                self.log_result("Delete Task (Valid ID)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Delete Task (Valid ID)", False, f"Exception: {str(e)}")

        # Test deleting invalid ID
        try:
            response = requests.delete(f"{self.base_url}/tasks/invalid_id_123", timeout=10)
            if response.status_code == 404 or response.status_code == 400:
                self.log_result("Delete Task (Invalid ID)", True, f"Correctly returned {response.status_code}")
            else:
                self.log_result("Delete Task (Invalid ID)", False, f"Should return 404/400, got: {response.status_code}")
        except Exception as e:
            self.log_result("Delete Task (Invalid ID)", False, f"Exception: {str(e)}")

    def create_sample_excel_file(self):
        """Create a sample Excel file for import testing"""
        workbook = openpyxl.Workbook()
        sheet = workbook.active
        
        # Headers
        sheet['A1'] = 'name'
        sheet['B1'] = 'date'
        sheet['C1'] = 'frequency'
        sheet['D1'] = 'time'
        
        # Sample data
        sample_data = [
            ['مراجعة البريد الإلكتروني', '2024-01-20', 'daily', '08:00'],
            ['اجتماع المبيعات', '2024-01-21', 'weekly', '10:30'],
            ['تحديث التقارير', '2024-01-22', 'daily', '16:00'],
            ['مراجعة الميزانية', '2024-01-23', 'weekly', '14:00']
        ]
        
        for row_idx, row_data in enumerate(sample_data, start=2):
            for col_idx, value in enumerate(row_data, start=1):
                sheet.cell(row=row_idx, column=col_idx, value=value)
        
        # Save to bytes
        excel_buffer = io.BytesIO()
        workbook.save(excel_buffer)
        excel_buffer.seek(0)
        return excel_buffer

    def test_excel_import(self):
        """Test Excel file import functionality"""
        try:
            # Create sample Excel file
            excel_file = self.create_sample_excel_file()
            
            # Prepare file for upload
            files = {'file': ('sample_tasks.xlsx', excel_file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
            
            response = requests.post(f"{self.base_url}/tasks/import", files=files, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                tasks_imported = result.get('tasks_imported', 0)
                if tasks_imported > 0:
                    self.log_result("Excel Import", True, f"Imported {tasks_imported} tasks")
                else:
                    self.log_result("Excel Import", False, "No tasks were imported")
            else:
                self.log_result("Excel Import", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Excel Import", False, f"Exception: {str(e)}")

        # Test invalid file upload
        try:
            files = {'file': ('invalid.txt', io.BytesIO(b'invalid content'), 'text/plain')}
            response = requests.post(f"{self.base_url}/tasks/import", files=files, timeout=10)
            
            if response.status_code == 400:
                self.log_result("Excel Import (Invalid File)", True, "Correctly rejected invalid file")
            else:
                self.log_result("Excel Import (Invalid File)", False, f"Should reject invalid file, got: {response.status_code}")
        except Exception as e:
            self.log_result("Excel Import (Invalid File)", False, f"Exception: {str(e)}")

    def test_upcoming_tasks(self):
        """Test getting upcoming tasks for today"""
        try:
            response = requests.get(f"{self.base_url}/tasks/upcoming/today", timeout=10)
            if response.status_code == 200:
                tasks = response.json()
                if isinstance(tasks, list):
                    self.log_result("Get Upcoming Tasks", True, f"Retrieved {len(tasks)} upcoming tasks")
                else:
                    self.log_result("Get Upcoming Tasks", False, "Response is not a list")
            else:
                self.log_result("Get Upcoming Tasks", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Upcoming Tasks", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("🚀 Starting Backend API Tests for Task Manager")
        print("=" * 60)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return self.test_results
        
        print("\n📝 Testing CRUD Operations...")
        self.test_create_task()
        self.test_get_all_tasks()
        self.test_get_single_task()
        self.test_update_task()
        self.test_delete_task()
        
        print("\n📊 Testing Excel Import...")
        self.test_excel_import()
        
        print("\n🔔 Testing Upcoming Tasks...")
        self.test_upcoming_tasks()
        
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n🚨 FAILED TESTS:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        print("=" * 60)
        return self.test_results

if __name__ == "__main__":
    tester = TaskManagerTester()
    results = tester.run_all_tests()