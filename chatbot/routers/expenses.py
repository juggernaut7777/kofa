# kofa/chatbot/routers/expenses.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter()

# --- 1. THE DATA MODEL ---
class Expense(BaseModel):
    id: Optional[str] = None
    amount: float
    description: str          # e.g., "Stock purchase", "Transport"
    category: str             # e.g., "stock", "transport", "utilities"
    expense_type: str = "BUSINESS"  # Default to BUSINESS (only business expenses now)
    date: Optional[datetime] = None  # Will be set automatically
    receipt_image_url: Optional[str] = None

# --- 2. MOCK DATABASE (Replace with Supabase later) ---
fake_expense_db: List[dict] = []

# --- 3. THE API ENDPOINTS ---
@router.post("/log")
async def log_expense(expense: Expense):
    """
    Logs a new business expense.
    """
    try:
        # Generate ID if not provided
        expense_id = expense.id or str(uuid.uuid4())
        
        # Create expense record
        saved_expense = {
            "id": expense_id,
            "amount": expense.amount,
            "description": expense.description,
            "category": expense.category,
            "expense_type": expense.expense_type or "BUSINESS",
            "date": (expense.date or datetime.now()).isoformat(),
            "receipt_image_url": expense.receipt_image_url
        }
        
        fake_expense_db.append(saved_expense)
        
        return saved_expense
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
async def get_expense_summary():
    """
    Returns the business spending summary.
    """
    biz_total = sum(e.get("amount", 0) for e in fake_expense_db if e.get("expense_type") == "BUSINESS")
    
    return {
        "business_burn": biz_total,
        "personal_spend": 0,  # Deprecated - always 0 now
        "total_outflow": biz_total,
        "expense_count": len(fake_expense_db)
    }

@router.get("/list")
async def list_expenses(expense_type: Optional[str] = None):
    """
    List all expenses, optionally filtered by type.
    """
    if expense_type:
        return [e for e in fake_expense_db if e.get("expense_type", "").upper() == expense_type.upper()]
    return fake_expense_db
