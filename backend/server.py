from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import openpyxl
import io


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


# Define Models
class Task(BaseModel):
    id: Optional[str] = None
    userId: str
    field: str  # المجال
    name: str  # المهمة
    description: str = ""  # الوصف
    implementation_method: str = ""  # آلية التنفيذ
    work_type: str = "office"  # مكتبي/ميداني (office/field)
    duration_days: int = 1  # عدد الأيام
    start_date: str  # تاريخ البداية
    priority: str = "medium"  # "high", "medium", "low"
    completed: bool = False
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

class TaskCreate(BaseModel):
    userId: str
    field: str
    name: str
    description: str = ""
    implementation_method: str = ""
    work_type: str = "office"
    duration_days: int = 1
    start_date: str
    priority: str = "medium"

class TaskUpdate(BaseModel):
    field: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    implementation_method: Optional[str] = None
    work_type: Optional[str] = None
    duration_days: Optional[int] = None
    start_date: Optional[str] = None
    priority: Optional[str] = None
    completed: Optional[bool] = None


# Helper function to convert MongoDB document to Task
def task_helper(task) -> dict:
    return {
        "id": str(task["_id"]),
        "userId": task.get("userId"),
        "name": task.get("name"),
        "date": task.get("date"),
        "frequency": task.get("frequency"),
        "time": task.get("time"),
        "priority": task.get("priority", "medium"),
        "category": task.get("category", "general"),
        "completed": task.get("completed", False),
        "createdAt": task.get("createdAt"),
        "updatedAt": task.get("updatedAt"),
    }


# Routes
@api_router.get("/")
async def root():
    return {"message": "Task Manager API"}


@api_router.post("/tasks", response_model=dict)
async def create_task(task: TaskCreate):
    task_dict = task.dict()
    task_dict["createdAt"] = datetime.utcnow()
    task_dict["updatedAt"] = datetime.utcnow()
    task_dict["completed"] = False
    
    result = await db.tasks.insert_one(task_dict)
    new_task = await db.tasks.find_one({"_id": result.inserted_id})
    
    return task_helper(new_task)


@api_router.get("/tasks", response_model=List[dict])
async def get_tasks(
    userId: str,
    frequency: Optional[str] = None,
    completed: Optional[bool] = None,
    priority: Optional[str] = None
):
    query = {"userId": userId}
    
    if frequency:
        query["frequency"] = frequency
    if completed is not None:
        query["completed"] = completed
    if priority:
        query["priority"] = priority
    
    tasks = await db.tasks.find(query).sort("date", 1).to_list(1000)
    return [task_helper(task) for task in tasks]


@api_router.get("/tasks/{task_id}", response_model=dict)
async def get_task(task_id: str):
    try:
        task = await db.tasks.find_one({"_id": ObjectId(task_id)})
        if task:
            return task_helper(task)
        raise HTTPException(status_code=404, detail="Task not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.put("/tasks/{task_id}", response_model=dict)
async def update_task(task_id: str, task_update: TaskUpdate):
    try:
        update_data = {k: v for k, v in task_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No data to update")
        
        update_data["updatedAt"] = datetime.utcnow()
        
        result = await db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        
        updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
        return task_helper(updated_task)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    try:
        result = await db.tasks.delete_one({"_id": ObjectId(task_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.post("/tasks/import")
async def import_tasks(userId: str, file: UploadFile = File(...)):
    try:
        # Read the uploaded file
        contents = await file.read()
        
        # Load the Excel file
        workbook = openpyxl.load_workbook(io.BytesIO(contents))
        sheet = workbook.active
        
        tasks_imported = 0
        errors = []
        
        # Skip header row and process data rows
        for row_idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            try:
                # Expecting columns: name, date, frequency, time
                if not row[0]:  # Skip empty rows
                    continue
                
                task_dict = {
                    "userId": userId,
                    "name": str(row[0]) if row[0] else "",
                    "date": str(row[1]) if row[1] else datetime.now().isoformat(),
                    "frequency": str(row[2]).lower() if row[2] else "daily",
                    "time": str(row[3]) if row[3] else "09:00",
                    "priority": "medium",
                    "category": "general",
                    "completed": False,
                    "createdAt": datetime.utcnow(),
                    "updatedAt": datetime.utcnow(),
                }
                
                # Validate frequency
                if task_dict["frequency"] not in ["daily", "weekly"]:
                    task_dict["frequency"] = "daily"
                
                await db.tasks.insert_one(task_dict)
                tasks_imported += 1
                
            except Exception as e:
                errors.append(f"Row {row_idx}: {str(e)}")
        
        return {
            "message": "Import completed",
            "tasks_imported": tasks_imported,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import file: {str(e)}")


@api_router.get("/tasks/upcoming/today")
async def get_upcoming_tasks(userId: str):
    """Get tasks for today for notifications"""
    today = datetime.now().date().isoformat()
    
    # Get today's tasks and weekly recurring tasks
    tasks = await db.tasks.find({
        "userId": userId,
        "$or": [
            {"date": today, "completed": False},
            {"frequency": "daily", "completed": False}
        ]
    }).to_list(100)
    
    return [task_helper(task) for task in tasks]


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
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