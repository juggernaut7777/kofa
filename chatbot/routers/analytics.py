# kofa/chatbot/routers/analytics.py
"""
Analytics API Router
Dashboard endpoints for revenue, products, and customers.
"""
from fastapi import APIRouter
from typing import Optional

from ..services.analytics import analytics_service, TimePeriod

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(period: Optional[str] = "month"):
    """
    Get complete dashboard data.
    
    Query params:
    - period: today, week, month, quarter, year (default: month)
    """
    try:
        time_period = TimePeriod(period)
    except ValueError:
        time_period = TimePeriod.MONTH
    
    dashboard = analytics_service.get_dashboard(time_period)
    
    return {
        "revenue": {
            "period": dashboard.revenue.period,
            "total_ngn": dashboard.revenue.total_revenue_ngn,
            "order_count": dashboard.revenue.order_count,
            "average_order_value": dashboard.revenue.average_order_value,
            "growth_percent": dashboard.revenue.growth_percent
        },
        "top_products": [
            {
                "product_id": p.product_id,
                "name": p.product_name,
                "units_sold": p.units_sold,
                "revenue_ngn": p.revenue_ngn,
                "stock_remaining": p.stock_remaining,
                "category": p.category
            }
            for p in dashboard.top_products
        ],
        "top_customers": [
            {
                "phone": c.customer_phone,
                "name": c.customer_name,
                "total_orders": c.total_orders,
                "total_spent_ngn": c.total_spent_ngn,
                "favorite_category": c.favorite_category
            }
            for c in dashboard.top_customers
        ],
        "recent_orders": dashboard.recent_orders[:5],
        "low_stock_alerts": dashboard.low_stock_alerts,
        "trend": dashboard.period_comparison
    }


@router.get("/revenue")
async def get_revenue(period: Optional[str] = "month"):
    """
    Get revenue breakdown.
    """
    try:
        time_period = TimePeriod(period)
    except ValueError:
        time_period = TimePeriod.MONTH
    
    revenue = analytics_service.get_revenue_metrics(time_period)
    
    return {
        "period": revenue.period,
        "total_revenue_ngn": revenue.total_revenue_ngn,
        "order_count": revenue.order_count,
        "average_order_value": round(revenue.average_order_value, 2),
        "growth_percent": revenue.growth_percent,
        "formatted_total": f"₦{revenue.total_revenue_ngn:,.0f}"
    }


@router.get("/products/top")
async def get_top_products(limit: int = 5, period: Optional[str] = "month"):
    """
    Get bestselling products.
    """
    try:
        time_period = TimePeriod(period)
    except ValueError:
        time_period = TimePeriod.MONTH
    
    products = analytics_service.get_top_products(limit, time_period)
    
    return [
        {
            "rank": i + 1,
            "product_id": p.product_id,
            "name": p.product_name,
            "units_sold": p.units_sold,
            "revenue_ngn": p.revenue_ngn,
            "stock_remaining": p.stock_remaining,
            "category": p.category
        }
        for i, p in enumerate(products)
    ]


@router.get("/customers/top")
async def get_top_customers(limit: int = 5):
    """
    Get top customers by spending.
    """
    customers = analytics_service.get_top_customers(limit)
    
    return [
        {
            "rank": i + 1,
            "phone": c.customer_phone,
            "name": c.customer_name,
            "total_orders": c.total_orders,
            "total_spent_ngn": c.total_spent_ngn,
            "last_order": c.last_order_date.isoformat(),
            "favorite_category": c.favorite_category
        }
        for i, c in enumerate(customers)
    ]


@router.get("/categories")
async def get_category_breakdown():
    """
    Get revenue breakdown by category.
    """
    return analytics_service.get_category_breakdown()


@router.get("/alerts/low-stock")
async def get_low_stock_alerts(threshold: int = 5):
    """
    Get products with low stock.
    """
    return analytics_service.get_low_stock_alerts(threshold)


@router.get("/summary/daily")
async def get_daily_summary(style: str = "street"):
    """
    Get daily summary for WhatsApp notification.
    """
    summary = analytics_service.format_daily_summary(style)
    return {"summary": summary, "style": style}


@router.get("/cross-platform")
async def get_cross_platform_analytics():
    """
    Get analytics breakdown by platform (WhatsApp, Instagram, TikTok).
    
    Shows message counts, orders, and revenue per platform.
    """
    return analytics_service.get_cross_platform_analytics()

