/**
 * Offline Queue Utility
 * Queues operations when offline and syncs when connection restored
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@kofa_offline_queue';

export interface QueuedOperation {
    id: string;
    type: 'create_product' | 'update_product' | 'restock' | 'create_order' | 'log_expense';
    payload: any;
    timestamp: number;
    retries: number;
}

class OfflineQueue {
    private isOnline: boolean = true;
    private syncInProgress: boolean = false;
    private listeners: ((isOnline: boolean) => void)[] = [];

    constructor() {
        this.initNetworkListener();
    }

    private initNetworkListener() {
        NetInfo.addEventListener(state => {
            const wasOffline = !this.isOnline;
            this.isOnline = state.isConnected ?? true;

            // Notify listeners
            this.listeners.forEach(listener => listener(this.isOnline));

            // Auto-sync when coming back online
            if (wasOffline && this.isOnline) {
                this.processQueue();
            }
        });
    }

    /**
     * Subscribe to network status changes
     */
    onNetworkChange(callback: (isOnline: boolean) => void): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Check if currently online
     */
    getIsOnline(): boolean {
        return this.isOnline;
    }

    /**
     * Add operation to queue
     */
    async enqueue(type: QueuedOperation['type'], payload: any): Promise<string> {
        const operation: QueuedOperation = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            payload,
            timestamp: Date.now(),
            retries: 0,
        };

        const queue = await this.getQueue();
        queue.push(operation);
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

        console.log(`[OfflineQueue] Enqueued: ${type}`, operation.id);

        // Try to process immediately if online
        if (this.isOnline) {
            this.processQueue();
        }

        return operation.id;
    }

    /**
     * Get all queued operations
     */
    async getQueue(): Promise<QueuedOperation[]> {
        try {
            const data = await AsyncStorage.getItem(QUEUE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[OfflineQueue] Error reading queue:', error);
            return [];
        }
    }

    /**
     * Get pending count
     */
    async getPendingCount(): Promise<number> {
        const queue = await this.getQueue();
        return queue.length;
    }

    /**
     * Process queued operations
     */
    async processQueue(): Promise<{ success: number; failed: number }> {
        if (this.syncInProgress || !this.isOnline) {
            return { success: 0, failed: 0 };
        }

        this.syncInProgress = true;
        let success = 0;
        let failed = 0;

        try {
            const queue = await this.getQueue();
            const remaining: QueuedOperation[] = [];

            for (const operation of queue) {
                try {
                    await this.executeOperation(operation);
                    success++;
                    console.log(`[OfflineQueue] Synced: ${operation.type}`, operation.id);
                } catch (error) {
                    operation.retries++;
                    if (operation.retries < 3) {
                        remaining.push(operation);
                    } else {
                        failed++;
                        console.error(`[OfflineQueue] Failed after 3 retries:`, operation.id);
                    }
                }
            }

            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
        } finally {
            this.syncInProgress = false;
        }

        return { success, failed };
    }

    /**
     * Execute a single operation
     */
    private async executeOperation(operation: QueuedOperation): Promise<void> {
        const API_BASE = 'https://kofa-dhko.onrender.com';

        switch (operation.type) {
            case 'create_product':
                await fetch(`${API_BASE}/products`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(operation.payload),
                });
                break;
            case 'update_product':
                await fetch(`${API_BASE}/products/${operation.payload.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(operation.payload),
                });
                break;
            case 'restock':
                await fetch(`${API_BASE}/products/${operation.payload.id}/restock?quantity=${operation.payload.quantity}`, {
                    method: 'POST',
                });
                break;
            case 'log_expense':
                await fetch(`${API_BASE}/expenses/log`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(operation.payload),
                });
                break;
            default:
                throw new Error(`Unknown operation type: ${operation.type}`);
        }
    }

    /**
     * Clear all queued operations
     */
    async clearQueue(): Promise<void> {
        await AsyncStorage.removeItem(QUEUE_KEY);
    }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

export default offlineQueue;
