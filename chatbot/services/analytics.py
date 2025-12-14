# kofa/chatbot/services/analytics.py
"""
Sales Analytics Service for Nigerian SME Dashboard
Provides revenue tracking, bestsellers, and customer insights.
"""
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import random


class TimePeriod(Enum):
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"


@dataclass
class RevenueMetrics:
    """Revenue breakdown."""
    period: str
    total_revenue_ngn: float
    order_count: int
    average_order_value: float
    growth_percent: float  # vs previous period


@dataclass
class ProductPerformance:
    """Product sales performance."""
    product_id: str
    product_name: str
    units_sold: int
    revenue_ngn: float
    stock_remaining: int
    category: str


@dataclass
class CustomerInsight:
    """Customer analytics."""
    customer_phone: str
    customer_name: str
    total_orders: int
    total_spent_ngn: float
    last_order_date: datetime
    favorite_category: str


@dataclass
class DashboardData:
    """Complete dashboard snapshot."""
    revenue: RevenueMetrics
    top_products: List[ProductPerformance]
    top_customers: List[CustomerInsight]
    recent_orders: List[Dict]
    low_stock_alerts: List[Dict]
    period_comparison: Dict


class AnalyticsService:
    """
    Analytics engine for OwoFlow merchants.
    In production, this would query Supabase aggregations.
    """
    
    def __init__(self):
        # Mock data for demonstration
        self._mock_products = [
            {"id": "1", "name": "Nike Air Max Red", "category": "Footwear", "price": 45000, "stock": 4},
            {"id": "2", "name": "Adidas White Sneakers", "category": "Footwear", "price": 38000, "stock": 10},
            {"id": "3", "name": "Men Formal Shirt White", "category": "Clothing", "price": 15000, "stock": 20},
            {"id": "4", "name": "Designer Blue Jeans", "category": "Clothing", "price": 25000, "stock": 15},
            {"id": "5", "name": "Black Leather Bag", "category": "Accessories", "price": 35000, "stock": 5},
            {"id": "6", "name": "Plain Round Neck T-Shirt", "category": "Clothing", "price": 8000, "stock": 50},
            {"id": "7", "name": "iPhone Charger Fast Charging", "category": "Electronics", "price": 12000, "stock": 2},
        ]
        
        self._mock_orders = self._generate_mock_orders()
    
    def _generate_mock_orders(self) -> List[Dict]:
        """Generate realistic mock orders for the past 30 days."""
        orders = []
        now = datetime.now()
        
        customers = [
            ("+2348012345678", "Chinedu Okafor"),
            ("+2349087654321", "Amara Eze"),
            ("+2348055551234", "Fatima Bello"),
            ("+2347033332222", "Obinna Nwosu"),
            ("+2348099998888", "Yetunde Adeyemi"),
            ("+2348066667777", "Emeka Igwe"),
        ]
        
        statuses = ["pending", "paid", "fulfilled"]
        
        for i in range(45):  # 45 orders in past 30 days
            days_ago = random.randint(0, 30)
            product = random.choice(self._mock_products)
            customer = random.choice(customers)
            quantity = random.randint(1, 3)
            
            orders.append({
                "id": f"ORD-{i+1:04d}",
                "customer_phone": customer[0],
                "customer_name": customer[1],
                "product_id": product["id"],
                "product_name": product["name"],
                "category": product["category"],
                "quantity": quantity,
                "unit_price": product["price"],
                "total_amount": product["price"] * quantity,
                "status": random.choice(statuses),
                "created_at": (now - timedelta(days=days_ago, hours=random.randint(0, 23))).isoformat()
            })
        
        return sorted(orders, key=lambda x: x["created_at"], reverse=True)
    
    def get_revenue_metrics(self, period: TimePeriod = TimePeriod.MONTH) -> RevenueMetrics:
        """Calculate revenue metrics for a time period."""
        now = datetime.now()
        
        # Define period boundaries
        if period == TimePeriod.TODAY:
            start_date = now.replace(hour=0, minute=0, second=0)
            prev_start = start_date - timedelta(days=1)
        elif period == TimePeriod.WEEK:
            start_date = now - timedelta(days=7)
            prev_start = start_date - timedelta(days=7)
        elif period == TimePeriod.MONTH:
            start_date = now - timedelta(days=30)
            prev_start = start_date - timedelta(days=30)
        elif period == TimePeriod.QUARTER:
            start_date = now - timedelta(days=90)
            prev_start = start_date - timedelta(days=90)
        else:  # YEAR
            start_date = now - timedelta(days=365)
            prev_start = start_date - timedelta(days=365)
        
        # Filter orders
        current_orders = [
            o for o in self._mock_orders
            if datetime.fromisoformat(o["created_at"]) >= start_date
        ]
        
        prev_orders = [
            o for o in self._mock_orders
            if prev_start <= datetime.fromisoformat(o["created_at"]) < start_date
        ]
        
        current_revenue = sum(o["total_amount"] for o in current_orders)
        prev_revenue = sum(o["total_amount"] for o in prev_orders) or 1  # Avoid division by zero
        
        growth = ((current_revenue - prev_revenue) / prev_revenue) * 100
        
        return RevenueMetrics(
            period=period.value,
            total_revenue_ngn=current_revenue,
            order_count=len(current_orders),
            average_order_value=current_revenue / len(current_orders) if current_orders else 0,
            growth_percent=round(growth, 1)
        )
    
    def get_top_products(self, limit: int = 5, period: TimePeriod = TimePeriod.MONTH) -> List[ProductPerformance]:
        """Get best-selling products."""
        now = datetime.now()
        
        if period == TimePeriod.MONTH:
            start_date = now - timedelta(days=30)
        elif period == TimePeriod.WEEK:
            start_date = now - timedelta(days=7)
        else:
            start_date = now - timedelta(days=30)
        
        # Aggregate by product
        product_sales: Dict[str, Dict] = {}
        
        for order in self._mock_orders:
            if datetime.fromisoformat(order["created_at"]) >= start_date:
                pid = order["product_id"]
                if pid not in product_sales:
                    product_sales[pid] = {
                        "product_id": pid,
                        "product_name": order["product_name"],
                        "category": order["category"],
                        "units_sold": 0,
                        "revenue_ngn": 0
                    }
                product_sales[pid]["units_sold"] += order["quantity"]
                product_sales[pid]["revenue_ngn"] += order["total_amount"]
        
        # Sort by revenue
        sorted_products = sorted(
            product_sales.values(),
            key=lambda x: x["revenue_ngn"],
            reverse=True
        )[:limit]
        
        # Add stock info
        result = []
        for p in sorted_products:
            stock = next(
                (prod["stock"] for prod in self._mock_products if prod["id"] == p["product_id"]),
                0
            )
            result.append(ProductPerformance(
                product_id=p["product_id"],
                product_name=p["product_name"],
                units_sold=p["units_sold"],
                revenue_ngn=p["revenue_ngn"],
                stock_remaining=stock,
                category=p["category"]
            ))
        
        return result
    
    def get_top_customers(self, limit: int = 5) -> List[CustomerInsight]:
        """Get top customers by spending."""
        customer_data: Dict[str, Dict] = {}
        
        for order in self._mock_orders:
            phone = order["customer_phone"]
            if phone not in customer_data:
                customer_data[phone] = {
                    "customer_phone": phone,
                    "customer_name": order["customer_name"],
                    "total_orders": 0,
                    "total_spent_ngn": 0,
                    "last_order_date": order["created_at"],
                    "categories": {}
                }
            
            customer_data[phone]["total_orders"] += 1
            customer_data[phone]["total_spent_ngn"] += order["total_amount"]
            
            cat = order["category"]
            customer_data[phone]["categories"][cat] = customer_data[phone]["categories"].get(cat, 0) + 1
            
            if order["created_at"] > customer_data[phone]["last_order_date"]:
                customer_data[phone]["last_order_date"] = order["created_at"]
        
        sorted_customers = sorted(
            customer_data.values(),
            key=lambda x: x["total_spent_ngn"],
            reverse=True
        )[:limit]
        
        result = []
        for c in sorted_customers:
            fav_cat = max(c["categories"], key=c["categories"].get) if c["categories"] else "Unknown"
            result.append(CustomerInsight(
                customer_phone=c["customer_phone"],
                customer_name=c["customer_name"],
                total_orders=c["total_orders"],
                total_spent_ngn=c["total_spent_ngn"],
                last_order_date=datetime.fromisoformat(c["last_order_date"]),
                favorite_category=fav_cat
            ))
        
        return result
    
    def get_low_stock_alerts(self, threshold: int = 5) -> List[Dict]:
        """Get products with stock below threshold."""
        return [
            {
                "product_id": p["id"],
                "product_name": p["name"],
                "stock_remaining": p["stock"],
                "category": p["category"],
                "alert_level": "critical" if p["stock"] <= 2 else "warning"
            }
            for p in self._mock_products
            if p["stock"] <= threshold
        ]
    
    def get_category_breakdown(self) -> List[Dict]:
        """Get revenue breakdown by category."""
        category_revenue: Dict[str, float] = {}
        
        for order in self._mock_orders:
            cat = order["category"]
            category_revenue[cat] = category_revenue.get(cat, 0) + order["total_amount"]
        
        total = sum(category_revenue.values())
        
        return [
            {
                "category": cat,
                "revenue_ngn": rev,
                "percentage": round((rev / total) * 100, 1) if total > 0 else 0
            }
            for cat, rev in sorted(category_revenue.items(), key=lambda x: x[1], reverse=True)
        ]
    
    def get_dashboard(self, period: TimePeriod = TimePeriod.MONTH) -> DashboardData:
        """Get complete dashboard data."""
        revenue = self.get_revenue_metrics(period)
        top_products = self.get_top_products(5, period)
        top_customers = self.get_top_customers(5)
        low_stock = self.get_low_stock_alerts()
        
        return DashboardData(
            revenue=revenue,
            top_products=top_products,
            top_customers=top_customers,
            recent_orders=self._mock_orders[:10],
            low_stock_alerts=low_stock,
            period_comparison={
                "vs_previous": f"{revenue.growth_percent:+.1f}%",
                "trend": "up" if revenue.growth_percent > 0 else "down"
            }
        )
    
    def format_daily_summary(self, style: str = "street") -> str:
        """Format daily summary for WhatsApp."""
        today = self.get_revenue_metrics(TimePeriod.TODAY)
        week = self.get_revenue_metrics(TimePeriod.WEEK)
        low_stock = self.get_low_stock_alerts(3)
        
        if style == "street":
            summary = f"""📊 *OwoFlow Daily Update*

💰 Today: ₦{today.total_revenue_ngn:,.0f} ({today.order_count} orders)
📈 This week: ₦{week.total_revenue_ngn:,.0f}
{'🔥' if today.growth_percent > 0 else '📉'} Growth: {today.growth_percent:+.1f}%
"""
            if low_stock:
                summary += "\n⚠️ *Low Stock Alert:*\n"
                for item in low_stock[:3]:
                    summary += f"• {item['product_name']}: {item['stock_remaining']} left\n"
        else:
            summary = f"""📊 *Daily Business Summary*

Revenue Today: ₦{today.total_revenue_ngn:,.0f}
Orders: {today.order_count}
Weekly Total: ₦{week.total_revenue_ngn:,.0f}
Growth: {today.growth_percent:+.1f}%
"""
            if low_stock:
                summary += "\n⚠️ *Inventory Alerts:*\n"
                for item in low_stock[:3]:
                    summary += f"• {item['product_name']}: {item['stock_remaining']} remaining\n"
        
        return summary
    
    def get_cross_platform_analytics(self) -> Dict:
        """
        Get analytics breakdown by platform (WhatsApp, Instagram, TikTok).
        Aggregates message counts, response times, and conversion rates.
        """
        from ..routers import instagram, tiktok
        
        # Get platform-specific stats
        try:
            ig_messages = instagram.INSTAGRAM_MESSAGES
        except:
            ig_messages = []
        
        try:
            tt_messages = tiktok.TIKTOK_MESSAGES
        except:
            tt_messages = []
        
        # Calculate stats per platform
        platforms = {
            "whatsapp": {
                "total_messages": len([o for o in self._mock_orders]),  # Estimate from orders
                "customer_messages": len([o for o in self._mock_orders if o.get("status") != "fulfilled"]),
                "bot_replies": len([o for o in self._mock_orders]),
                "orders_generated": len(self._mock_orders),
                "revenue_ngn": sum(o["total_amount"] for o in self._mock_orders)
            },
            "instagram": {
                "total_messages": len(ig_messages),
                "customer_messages": len([m for m in ig_messages if m.get("message_type") == "customer"]),
                "bot_replies": len([m for m in ig_messages if m.get("message_type") == "bot"]),
                "orders_generated": 0,  # Would track from IG-attributed orders
                "revenue_ngn": 0
            },
            "tiktok": {
                "total_messages": len(tt_messages),
                "customer_messages": len([m for m in tt_messages if m.get("message_type") == "customer"]),
                "bot_replies": 0,  # TikTok has limited DM API
                "orders_generated": 0,
                "revenue_ngn": 0
            }
        }
        
        # Calculate totals
        total_messages = sum(p["total_messages"] for p in platforms.values())
        total_orders = sum(p["orders_generated"] for p in platforms.values())
        total_revenue = sum(p["revenue_ngn"] for p in platforms.values())
        
        # Find best performing platform
        best_platform = max(platforms.keys(), key=lambda p: platforms[p]["revenue_ngn"])
        
        return {
            "platforms": platforms,
            "summary": {
                "total_messages": total_messages,
                "total_orders": total_orders,
                "total_revenue_ngn": total_revenue,
                "best_platform": best_platform,
                "platform_breakdown": {
                    name: {
                        "message_share": round((p["total_messages"] / max(total_messages, 1)) * 100, 1),
                        "revenue_share": round((p["revenue_ngn"] / max(total_revenue, 1)) * 100, 1)
                    }
                    for name, p in platforms.items()
                }
            }
        }


# Singleton instance
analytics_service = AnalyticsService()

