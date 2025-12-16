/**
 * KOFA Sales Report PDF Generator
 * Generates PDF reports for sales data
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Order, formatNaira } from '@/lib/api';

export interface ReportOptions {
    title: string;
    startDate: Date;
    endDate: Date;
    orders: Order[];
    businessName?: string;
}

/**
 * Generate a sales report PDF
 */
export async function generateSalesReportPDF(options: ReportOptions): Promise<string> {
    const { title, startDate, endDate, orders, businessName = 'KOFA Merchant' } = options;

    // Calculate totals
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const totalOrders = orders.length;
    const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'fulfilled').length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    // Format dates
    const formatDate = (date: Date) => date.toLocaleDateString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Generate HTML for PDF
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 40px;
                color: #1a1a1a;
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 2px solid #2BAFF2;
            }
            .logo {
                font-size: 32px;
                font-weight: 800;
                color: #2BAFF2;
                letter-spacing: 4px;
            }
            .business-name {
                font-size: 18px;
                color: #666;
                margin-top: 8px;
            }
            .report-title {
                font-size: 24px;
                font-weight: 700;
                margin-top: 16px;
            }
            .date-range {
                font-size: 14px;
                color: #888;
                margin-top: 8px;
            }
            .summary {
                display: flex;
                justify-content: space-around;
                margin: 30px 0;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 12px;
            }
            .summary-item {
                text-align: center;
            }
            .summary-value {
                font-size: 28px;
                font-weight: 700;
                color: #2BAFF2;
            }
            .summary-label {
                font-size: 12px;
                color: #666;
                margin-top: 4px;
            }
            .orders-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 30px;
            }
            .orders-table th {
                background: #2BAFF2;
                color: white;
                padding: 12px;
                text-align: left;
                font-size: 12px;
            }
            .orders-table td {
                padding: 12px;
                border-bottom: 1px solid #eee;
                font-size: 13px;
            }
            .orders-table tr:nth-child(even) {
                background: #f8f9fa;
            }
            .status-paid { color: #22C55E; font-weight: 600; }
            .status-pending { color: #F59E0B; font-weight: 600; }
            .status-fulfilled { color: #2BAFF2; font-weight: 600; }
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #888;
            }
            .amount { font-weight: 600; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="logo">⚡ KOFA</div>
            <div class="business-name">${businessName}</div>
            <div class="report-title">${title}</div>
            <div class="date-range">${formatDate(startDate)} - ${formatDate(endDate)}</div>
        </div>

        <div class="summary">
            <div class="summary-item">
                <div class="summary-value">₦${totalRevenue.toLocaleString()}</div>
                <div class="summary-label">TOTAL REVENUE</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${totalOrders}</div>
                <div class="summary-label">TOTAL ORDERS</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${paidOrders}</div>
                <div class="summary-label">COMPLETED</div>
            </div>
            <div class="summary-item">
                <div class="summary-value">${pendingOrders}</div>
                <div class="summary-label">PENDING</div>
            </div>
        </div>

        <table class="orders-table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${order.id?.slice(0, 8) || 'N/A'}</td>
                        <td>${order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td>${order.customer_phone || 'Walk-in'}</td>
                        <td>${order.items?.length || 0} items</td>
                        <td class="amount">₦${(order.total_amount || 0).toLocaleString()}</td>
                        <td class="status-${order.status}">${order.status?.toUpperCase() || 'N/A'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p>Generated by KOFA Commerce Engine</p>
            <p>${new Date().toLocaleString()}</p>
        </div>
    </body>
    </html>
    `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
    });

    return uri;
}

/**
 * Generate and share a sales report
 */
export async function shareAndGenerateSalesReport(options: ReportOptions): Promise<void> {
    try {
        const pdfUri = await generateSalesReportPDF(options);

        // Check if sharing is available
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(pdfUri, {
                mimeType: 'application/pdf',
                dialogTitle: `${options.title} - KOFA Report`,
            });
        }
    } catch (error) {
        console.error('PDF generation error:', error);
        throw error;
    }
}

/**
 * Generate weekly report for the current week
 */
export function getWeekDateRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - dayOfWeek);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
}

/**
 * Generate monthly report for the current month
 */
export function getMonthDateRange(): { startDate: Date; endDate: Date } {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
}

export default {
    generateSalesReportPDF,
    shareAndGenerateSalesReport,
    getWeekDateRange,
    getMonthDateRange,
};
