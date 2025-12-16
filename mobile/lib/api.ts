/**
 * KOFA API Client
 * Connects to the FastAPI backend
 */

// API Base URL - KOFA backend deployed on Render
// For local testing: use your computer's IP like 'http://192.168.x.x:8000'
const API_BASE_URL = 'https://kofa-dhko.onrender.com';

export interface Product {
    id: string;
    name: string;
    price_ngn: number;
    stock_level: number;
    description?: string;
    image_url?: string;
    voice_tags?: string[];
}

export interface MessageResponse {
    response: string;
    intent: string;
    product?: Product;
    payment_link?: string;
}

export interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    product?: Product;
    paymentLink?: string;
}

/**
 * Format price in Nigerian Naira
 */
export function formatNaira(amount: number): string {
    return `₦${amount.toLocaleString('en-NG')}`;
}

/**
 * Send a message to the chatbot
 */
export async function sendMessage(
    userId: string,
    messageText: string
): Promise<MessageResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                message_text: messageText,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get products from backend
 */
export async function fetchProducts(): Promise<Product[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/products`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.warn('Failed to fetch products from API, falling back to mock data:', error);
        return getMockProducts();
    }
}

/**
 * Get mock products for demo (fallback)
 */
export function getMockProducts(): Product[] {
    return [
        {
            id: '1',
            name: 'Premium Red Sneakers',
            price_ngn: 45000,
            stock_level: 12,
            description: 'Fresh kicks for the street',
            voice_tags: ['sneakers', 'red shoe', 'kicks'],
        },
        {
            id: '2',
            name: 'Lagos Beach Shorts',
            price_ngn: 8500,
            stock_level: 25,
            description: 'Perfect for that Elegushi flex',
            voice_tags: ['shorts', 'beach wear', 'summer'],
        },
        {
            id: '3',
            name: 'Ankara Print Shirt',
            price_ngn: 15000,
            stock_level: 8,
            description: 'Traditional meets modern',
            voice_tags: ['ankara', 'shirt', 'native'],
        },
        {
            id: '4',
            name: 'Designer Sunglasses',
            price_ngn: 22000,
            stock_level: 15,
            description: 'Block out Lagos sun in style',
            voice_tags: ['shades', 'glasses', 'sunglasses'],
        },
        {
            id: '5',
            name: 'Gold Chain Necklace',
            price_ngn: 85000,
            stock_level: 5,
            description: 'Shine like Burna Boy',
            voice_tags: ['chain', 'jewelry', 'gold'],
        },
        {
            id: '6',
            name: 'Leather Wallet',
            price_ngn: 12000,
            stock_level: 20,
            description: 'Keep your Naira secure',
            voice_tags: ['wallet', 'leather', 'purse'],
        },
    ];
}

export interface OrderItemDetail {
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
}

export interface Order {
    id: string;
    customer_phone: string;
    items: OrderItemDetail[];
    total_amount: number;
    status: 'pending' | 'paid' | 'fulfilled';
    payment_ref?: string;
    created_at: string;
}

export interface OrderItem {
    product_id: string;
    quantity: number;
}

export interface CreateOrderResponse {
    order_id: string;
    payment_link: string;
    amount_ngn: number;
    message: string;
}

/**
 * Create a new order
 */
export async function createOrder(items: OrderItem[], userId: string = "default_user"): Promise<CreateOrderResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items,
                user_id: userId,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Create Order Error:', error);
        throw error;
    }
}

/**
 * Fetch orders from backend (for merchant dashboard)
 */
export async function fetchOrders(status?: string): Promise<Order[]> {
    try {
        const url = status
            ? `${API_BASE_URL}/orders?status=${status}`
            : `${API_BASE_URL}/orders`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.warn('Failed to fetch orders from API, returning mock data:', error);
        return getMockOrders();
    }
}

/**
 * Mock orders for demo
 */
export function getMockOrders(): Order[] {
    return [
        {
            id: 'order-001',
            customer_phone: '+2348012345678',
            items: [
                { product_id: '1', product_name: 'Nike Air Max Red', quantity: 1, price: 45000 },
            ],
            total_amount: 45000,
            status: 'pending',
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        },
        {
            id: 'order-002',
            customer_phone: '+2349087654321',
            items: [
                { product_id: '3', product_name: 'Men Formal Shirt White', quantity: 2, price: 15000 },
                { product_id: '6', product_name: 'Plain Round Neck T-Shirt', quantity: 3, price: 8000 },
            ],
            total_amount: 54000,
            status: 'paid',
            payment_ref: 'PAY-ABC123',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        },
        {
            id: 'order-003',
            customer_phone: '+2348055551234',
            items: [
                { product_id: '5', product_name: 'Black Leather Bag', quantity: 1, price: 35000 },
            ],
            total_amount: 35000,
            status: 'fulfilled',
            payment_ref: 'PAY-XYZ789',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // Yesterday
        },
    ];
}


// ============== KOFA 2.0 API FUNCTIONS ==============

export interface NewProduct {
    name: string;
    price_ngn: number;
    stock_level: number;
    description?: string;
    category?: string;
    voice_tags?: string[];
}

export interface ManualSaleData {
    product_name: string;
    quantity: number;
    amount_ngn: number;
    channel: 'instagram' | 'walk-in' | 'whatsapp' | 'other';
    notes?: string;
}

/**
 * Create a new product
 */
export async function createProduct(product: NewProduct): Promise<{ status: string; product: Product }> {
    try {
        const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Create Product Error:', error);
        throw error;
    }
}

/**
 * Log a manual sale (from Instagram, walk-in, etc.)
 */
export async function logManualSale(sale: ManualSaleData): Promise<{ status: string; sale: any }> {
    try {
        const response = await fetch(`${API_BASE_URL}/sales/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sale),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Log Manual Sale Error:', error);
        throw error;
    }
}

/**
 * Update an existing product
 */
export async function updateProduct(productId: string, updates: Partial<NewProduct>): Promise<{ status: string; product: Product }> {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Update Product Error:', error);
        throw error;
    }
}

/**
 * Restock a product (add to stock level)
 */
export async function restockProduct(productId: string, quantity: number): Promise<{ status: string; new_stock_level: number }> {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/restock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Restock Product Error:', error);
        throw error;
    }
}

/**
 * Upload an image for a product
 */
export async function uploadProductImage(
    productId: string,
    imageUri: string,
    filename: string = 'product.jpg'
): Promise<{ status: string; image_url: string }> {
    try {
        const formData = new FormData();

        // Create file object for upload
        const fileType = imageUri.split('.').pop() || 'jpg';
        const mimeType = fileType === 'png' ? 'image/png' : 'image/jpeg';

        formData.append('file', {
            uri: imageUri,
            name: filename,
            type: mimeType,
        } as any);

        const response = await fetch(`${API_BASE_URL}/products/${productId}/image`, {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header - let fetch set it with boundary
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Upload Product Image Error:', error);
        throw error;
    }
}

/**
 * Delete product image
 */
export async function deleteProductImage(productId: string): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/products/${productId}/image`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Delete Product Image Error:', error);
        throw error;
    }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, status: 'pending' | 'paid' | 'fulfilled'): Promise<{ status: string; order: Order }> {
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Update Order Status Error:', error);
        throw error;
    }
}

/**
 * Get current bot style
 */
export async function getBotStyle(): Promise<{ current_style: string; available_styles: string[] }> {
    try {
        const response = await fetch(`${API_BASE_URL}/settings/bot-style`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Get Bot Style Error:', error);
        return { current_style: 'corporate', available_styles: ['corporate', 'street'] };
    }
}

/**
 * Set bot style (corporate or street/Nigerian pidgin)
 */
export async function setBotStyle(style: 'corporate' | 'street'): Promise<{ status: string; bot_style: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/settings/bot-style`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ style }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Set Bot Style Error:', error);
        throw error;
    }
}


// ============== VENDOR SETTINGS ==============

export interface PaymentAccount {
    bank_name: string;
    account_number: string;
    account_name: string;
}

export interface BusinessInfo {
    name: string;
    phone: string;
    address: string;
}

export interface VendorSettings {
    payment_account: PaymentAccount;
    business_info: BusinessInfo;
    payment_method: string;
}

/**
 * Get all vendor settings
 */
export async function getVendorSettings(): Promise<{ status: string; settings: VendorSettings }> {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/settings`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Get Vendor Settings Error:', error);
        return {
            status: 'error',
            settings: {
                payment_account: { bank_name: '', account_number: '', account_name: '' },
                business_info: { name: 'KOFA Store', phone: '', address: '' },
                payment_method: 'bank_transfer'
            }
        };
    }
}

/**
 * Update vendor payment account
 */
export async function updatePaymentAccount(account: PaymentAccount): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/payment-account`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(account),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Update Payment Account Error:', error);
        throw error;
    }
}

/**
 * Update vendor business info
 */
export async function updateBusinessInfo(info: BusinessInfo): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/vendor/business-info`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(info),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Update Business Info Error:', error);
        throw error;
    }
}


// ============== BOT CONTROL API FUNCTIONS ==============

export interface BotStatus {
    is_paused: boolean;
    paused_at: string | null;
    active_silences: number;
    auto_silence_duration_minutes: number;
}

/**
 * Get current bot status (pause state, active silences)
 */
export async function getBotStatus(): Promise<BotStatus> {
    try {
        const response = await fetch(`${API_BASE_URL}/bot/status`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Get Bot Status Error:', error);
        return { is_paused: false, paused_at: null, active_silences: 0, auto_silence_duration_minutes: 30 };
    }
}

/**
 * Toggle global bot pause
 */
export async function toggleBotPause(paused: boolean): Promise<{ status: string; is_paused: boolean }> {
    try {
        const response = await fetch(`${API_BASE_URL}/bot/pause`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paused }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Toggle Bot Pause Error:', error);
        throw error;
    }
}


// ============== CROSS-PLATFORM ANALYTICS ==============

export interface CrossPlatformAnalytics {
    platforms: {
        whatsapp: PlatformStats;
        instagram: PlatformStats;
        tiktok: PlatformStats;
    };
    summary: {
        total_messages: number;
        total_orders: number;
        total_revenue_ngn: number;
        best_platform: string;
        platform_breakdown: Record<string, { message_share: number; revenue_share: number }>;
    };
}

export interface PlatformStats {
    total_messages: number;
    customer_messages: number;
    bot_replies: number;
    orders_generated: number;
    revenue_ngn: number;
}

/**
 * Get cross-platform analytics
 */
export async function getCrossPlatformAnalytics(): Promise<CrossPlatformAnalytics> {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics/cross-platform`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Get Cross Platform Analytics Error:', error);
        return {
            platforms: {
                whatsapp: { total_messages: 0, customer_messages: 0, bot_replies: 0, orders_generated: 0, revenue_ngn: 0 },
                instagram: { total_messages: 0, customer_messages: 0, bot_replies: 0, orders_generated: 0, revenue_ngn: 0 },
                tiktok: { total_messages: 0, customer_messages: 0, bot_replies: 0, orders_generated: 0, revenue_ngn: 0 },
            },
            summary: { total_messages: 0, total_orders: 0, total_revenue_ngn: 0, best_platform: 'whatsapp', platform_breakdown: {} }
        };
    }
}


// ============== WIDGET STATS ==============

export interface WidgetStats {
    date: string;
    revenue_today: number;
    orders_today: number;
    pending_orders: number;
    low_stock_alerts: number;
    currency: string;
}

/**
 * Get lightweight stats for home screen widget
 */
export async function getWidgetStats(): Promise<WidgetStats> {
    try {
        const response = await fetch(`${API_BASE_URL}/widget/stats`);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.warn('Get Widget Stats Error:', error);
        return {
            date: new Date().toISOString().split('T')[0],
            revenue_today: 0,
            orders_today: 0,
            pending_orders: 0,
            low_stock_alerts: 0,
            currency: 'NGN',
        };
    }
}


// ============== PUSH NOTIFICATIONS ==============

/**
 * Register device for push notifications
 */
export async function registerPushToken(
    expoToken: string,
    deviceType: string = 'unknown',
    vendorId: string = 'default'
): Promise<{ status: string; message: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/device-tokens?vendor_id=${vendorId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                expo_token: expoToken,
                device_type: deviceType,
            }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Register Push Token Error:', error);
        throw error;
    }
}

/**
 * Unregister device from push notifications
 */
export async function unregisterPushToken(
    expoToken: string,
    vendorId: string = 'default'
): Promise<{ status: string }> {
    try {
        const response = await fetch(
            `${API_BASE_URL}/device-tokens?expo_token=${encodeURIComponent(expoToken)}&vendor_id=${vendorId}`,
            { method: 'DELETE' }
        );
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Unregister Push Token Error:', error);
        throw error;
    }
}


export default {
    sendMessage,
    checkHealth,
    fetchProducts,
    fetchOrders,
    createOrder,
    createProduct,
    updateProduct,
    restockProduct,
    uploadProductImage,
    deleteProductImage,
    updateOrderStatus,
    logManualSale,
    getBotStyle,
    setBotStyle,
    getVendorSettings,
    updatePaymentAccount,
    updateBusinessInfo,
    formatNaira,
    getMockProducts,
    getMockOrders,
    getBotStatus,
    toggleBotPause,
    getCrossPlatformAnalytics,
    getWidgetStats,
    registerPushToken,
    unregisterPushToken,
    API_BASE_URL,
};

