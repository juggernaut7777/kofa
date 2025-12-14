import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants';
import { formatNaira, fetchOrders, Order, logManualSale, ManualSaleData, updateOrderStatus } from '@/lib/api';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SALES_CHANNELS = [
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { id: 'walk-in', label: 'Walk-in', icon: '🚶' },
    { id: 'other', label: 'Other', icon: '📦' },
];

function getStatusStyle(status: string) {
    switch (status.toLowerCase()) {
        case 'paid': return { color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.15)', icon: '💳', label: 'Paid' };
        case 'fulfilled': return { color: '#2BAFF2', bgColor: 'rgba(43, 175, 242, 0.15)', icon: '✅', label: 'Delivered' };
        case 'manual': return { color: '#00DFFF', bgColor: 'rgba(0, 223, 255, 0.15)', icon: '✍️', label: 'Manual' };
        default: return { color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)', icon: '⏳', label: 'Pending' };
    }
}

function maskPhone(phone: string): string {
    if (phone.length < 8) return phone;
    return phone.slice(0, 7) + '****' + phone.slice(-4);
}

function formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
}

export default function OrdersScreen() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<string>('all');
    const [showManualSaleModal, setShowManualSaleModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Order detail modal state
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    // Manual sale form state
    const [manualSale, setManualSale] = useState<ManualSaleData>({
        product_name: '',
        quantity: 1,
        amount_ngn: 0,
        channel: 'instagram',
        notes: '',
    });

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        try {
            const data = await fetchOrders();
            setOrders(data);
        } catch (error) {
            console.error("Error loading orders:", error);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadOrders().finally(() => setRefreshing(false));
    };

    // Open order detail
    const handleOrderPress = (order: Order) => {
        setSelectedOrder(order);
        setShowOrderModal(true);
    };

    // Update order status
    const handleUpdateStatus = async (newStatus: 'pending' | 'paid' | 'fulfilled') => {
        if (!selectedOrder) return;
        setIsSubmitting(true);
        try {
            await updateOrderStatus(selectedOrder.id, newStatus);
            setShowOrderModal(false);
            setSelectedOrder(null);
            loadOrders();
            const statusLabel = newStatus === 'fulfilled' ? 'Delivered' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
            Alert.alert('Updated! ✅', `Order marked as ${statusLabel}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to update order status. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogManualSale = async () => {
        if (!manualSale.product_name.trim()) {
            Alert.alert('Missing Info', 'Please enter a product name');
            return;
        }
        if (manualSale.amount_ngn <= 0) {
            Alert.alert('Missing Info', 'Please enter the sale amount');
            return;
        }

        setIsSubmitting(true);
        try {
            await logManualSale(manualSale);
            setManualSale({ product_name: '', quantity: 1, amount_ngn: 0, channel: 'instagram', notes: '' });
            setShowManualSaleModal(false);
            loadOrders();
            Alert.alert('Success! ✅', 'Sale logged successfully');
        } catch (error) {
            Alert.alert('Error', 'Failed to log sale. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status.toLowerCase() === filter);
    const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString());
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const pendingCount = orders.filter(o => o.status.toLowerCase() === 'pending').length;

    const renderOrder = ({ item, index }: { item: Order; index: number }) => {
        const statusStyle = getStatusStyle(item.status);
        return (
            <AnimatedTouchable entering={FadeInUp.delay(index * 60).springify()} style={styles.orderCard} activeOpacity={0.85} onPress={() => handleOrderPress(item)}>
                <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.cardGradient}>
                    <View style={styles.orderHeader}>
                        <View style={styles.customerInfo}>
                            <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.avatarGradient}>
                                <Text style={styles.avatarIcon}>📦</Text>
                            </LinearGradient>
                            <View style={styles.customerDetails}>
                                <Text style={styles.orderId}>{item.id}</Text>
                                <Text style={styles.customerPhone}>{maskPhone(item.customer_phone)} • {formatTime(new Date(item.created_at))}</Text>
                            </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bgColor }]}>
                            <Text style={styles.statusIcon}>{statusStyle.icon}</Text>
                            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                        </View>
                    </View>

                    <View style={styles.orderItems}>
                        {item.items.map((orderItem, idx) => (
                            <View key={idx} style={styles.itemRow}>
                                <View style={styles.quantityBadge}>
                                    <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                                </View>
                                <Text style={styles.itemName} numberOfLines={1}>{orderItem.product_name}</Text>
                                <Text style={styles.itemPrice}>{formatNaira(orderItem.price * orderItem.quantity)}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.orderFooter}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <View style={styles.totalRow}>
                            <Text style={styles.currencySymbol}>₦</Text>
                            <Text style={styles.totalAmount}>{item.total_amount.toLocaleString()}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </AnimatedTouchable>
        );
    };

    const FilterButton = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
        <TouchableOpacity style={[styles.filterButton, filter === value && styles.filterButtonActive]} onPress={() => setFilter(value)}>
            {filter === value ? (
                <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.filterGradient}>
                    <Text style={styles.filterIcon}>{icon}</Text>
                    <Text style={styles.filterTextActive}>{label}</Text>
                </LinearGradient>
            ) : (
                <View style={styles.filterInner}>
                    <Text style={styles.filterIcon}>{icon}</Text>
                    <Text style={styles.filterText}>{label}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#05090E', '#0D1117', '#05090E']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.orbContainer}>
                <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'transparent']} style={[styles.orb, styles.orbGreen]} />
            </View>

            {/* Header */}
            <AnimatedView entering={FadeInDown.springify()} style={styles.header}>
                <View>
                    <View style={styles.brandRow}>
                        <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.brandBadge}>
                            <Text style={styles.brandIcon}>⚡</Text>
                        </LinearGradient>
                        <Text style={styles.brandName}>KOFA</Text>
                    </View>
                    <Text style={styles.title}>Orders</Text>
                    <Text style={styles.subtitle}>Track your sales</Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowManualSaleModal(true)}>
                    <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.addButtonGradient}>
                        <Ionicons name="add" size={18} color="#FFF" />
                        <Text style={styles.addButtonText}>Log Sale</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </AnimatedView>

            {/* Stats */}
            <AnimatedView entering={FadeInUp.delay(100).springify()} style={styles.statsContainer}>
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'rgba(43, 175, 242, 0.05)']} style={styles.statCardGradient}>
                            <Text style={styles.statEmoji}>📊</Text>
                            <Text style={styles.statValue}>{todayOrders.length}</Text>
                            <Text style={styles.statLabel}>Today</Text>
                        </LinearGradient>
                    </View>
                    <View style={styles.statCard}>
                        <LinearGradient colors={['rgba(0, 223, 255, 0.2)', 'rgba(0, 223, 255, 0.05)']} style={styles.statCardGradient}>
                            <Text style={styles.statEmoji}>💰</Text>
                            <Text style={styles.statValueMoney}>{formatNaira(todayRevenue)}</Text>
                            <Text style={styles.statLabel}>Revenue</Text>
                        </LinearGradient>
                    </View>
                    <View style={[styles.statCard, pendingCount > 0 && styles.statCardWarning]}>
                        <LinearGradient colors={pendingCount > 0 ? ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.statCardGradient}>
                            <Text style={styles.statEmoji}>⏳</Text>
                            <Text style={[styles.statValue, pendingCount > 0 && styles.statValueWarning]}>{pendingCount}</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </LinearGradient>
                    </View>
                </View>
            </AnimatedView>

            {/* Filters */}
            <AnimatedView entering={FadeInUp.delay(150).springify()} style={styles.filtersRow}>
                <FilterButton label="All" value="all" icon="📋" />
                <FilterButton label="Pending" value="pending" icon="⏳" />
                <FilterButton label="Paid" value="paid" icon="✅" />
                <FilterButton label="Done" value="fulfilled" icon="📦" />
            </AnimatedView>

            {/* Orders List */}
            <FlatList
                data={filteredOrders}
                renderItem={renderOrder}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.orderList}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2BAFF2" colors={['#2BAFF2']} />}
                ListEmptyComponent={
                    <AnimatedView entering={FadeIn.delay(300)} style={styles.emptyState}>
                        <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'rgba(43, 175, 242, 0.05)']} style={styles.emptyIconContainer}>
                            <Text style={styles.emptyEmoji}>📭</Text>
                        </LinearGradient>
                        <Text style={styles.emptyTitle}>No orders yet</Text>
                        <Text style={styles.emptySubtitle}>Tap "Log Sale" to record sales from Instagram, walk-ins, or WhatsApp</Text>
                        <TouchableOpacity style={styles.emptyCTA} onPress={() => setShowManualSaleModal(true)}>
                            <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.emptyCTAGradient}>
                                <Text style={styles.emptyCTAText}>+ Log Your First Sale</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </AnimatedView>
                }
            />

            {/* Manual Sale Modal */}
            <Modal visible={showManualSaleModal} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <LinearGradient colors={['#0D1117', '#05090E']} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Log Manual Sale</Text>
                                <TouchableOpacity onPress={() => setShowManualSaleModal(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                                <Text style={styles.inputLabel}>Product Sold *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Red Sneakers Size 42"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    value={manualSale.product_name}
                                    onChangeText={(text) => setManualSale(s => ({ ...s, product_name: text }))}
                                />

                                <View style={styles.rowInputs}>
                                    <View style={styles.halfInput}>
                                        <Text style={styles.inputLabel}>Quantity</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="1"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            keyboardType="numeric"
                                            value={manualSale.quantity > 0 ? manualSale.quantity.toString() : ''}
                                            onChangeText={(text) => setManualSale(s => ({ ...s, quantity: parseInt(text) || 1 }))}
                                        />
                                    </View>
                                    <View style={styles.halfInput}>
                                        <Text style={styles.inputLabel}>Amount (₦) *</Text>
                                        <View style={styles.priceInputContainer}>
                                            <Text style={styles.pricePrefix}>₦</Text>
                                            <TextInput
                                                style={styles.priceInput}
                                                placeholder="0"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                                keyboardType="numeric"
                                                value={manualSale.amount_ngn > 0 ? manualSale.amount_ngn.toString() : ''}
                                                onChangeText={(text) => setManualSale(s => ({ ...s, amount_ngn: parseInt(text) || 0 }))}
                                            />
                                        </View>
                                    </View>
                                </View>

                                <Text style={styles.inputLabel}>Sales Channel</Text>
                                <View style={styles.channelGrid}>
                                    {SALES_CHANNELS.map((ch) => (
                                        <TouchableOpacity
                                            key={ch.id}
                                            style={[styles.channelChip, manualSale.channel === ch.id && styles.channelChipActive]}
                                            onPress={() => setManualSale(s => ({ ...s, channel: ch.id as ManualSaleData['channel'] }))}
                                        >
                                            <Text style={styles.channelIcon}>{ch.icon}</Text>
                                            <Text style={[styles.channelText, manualSale.channel === ch.id && styles.channelTextActive]}>{ch.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="e.g. Customer paid cash, needs delivery tomorrow"
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    multiline
                                    numberOfLines={2}
                                    value={manualSale.notes}
                                    onChangeText={(text) => setManualSale(s => ({ ...s, notes: text }))}
                                />

                                <TouchableOpacity style={styles.submitButton} onPress={handleLogManualSale} disabled={isSubmitting}>
                                    <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.submitButtonGradient}>
                                        <Text style={styles.submitButtonText}>{isSubmitting ? 'Logging...' : '✍️ Log This Sale'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>

                                <View style={{ height: 40 }} />
                            </ScrollView>
                        </LinearGradient>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Order Detail Modal */}
            <Modal visible={showOrderModal} animationType="slide" transparent>
                <View style={styles.orderModalOverlay}>
                    <View style={styles.orderModalContainer}>
                        <LinearGradient colors={['#0D1117', '#05090E']} style={styles.orderModalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Order Details</Text>
                                <TouchableOpacity onPress={() => setShowOrderModal(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            {selectedOrder && (
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {/* Order ID */}
                                    <View style={styles.orderDetailSection}>
                                        <Text style={styles.orderDetailLabel}>Order ID</Text>
                                        <Text style={styles.orderIdLarge}>{selectedOrder.id}</Text>
                                    </View>

                                    {/* Customer */}
                                    <View style={styles.orderDetailSection}>
                                        <Text style={styles.orderDetailLabel}>Customer Phone</Text>
                                        <Text style={styles.orderDetailValue}>{selectedOrder.customer_phone}</Text>
                                    </View>

                                    <View style={styles.orderDetailSection}>
                                        <Text style={styles.orderDetailLabel}>Items</Text>
                                        {selectedOrder.items.map((item, idx) => (
                                            <View key={idx} style={styles.orderDetailItem}>
                                                <Text style={styles.orderDetailItemName}>{item.quantity}x {item.product_name}</Text>
                                                <Text style={styles.orderDetailItemPrice}>{formatNaira(item.price * item.quantity)}</Text>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={styles.orderDetailSection}>
                                        <Text style={styles.orderDetailLabel}>Total</Text>
                                        <Text style={styles.orderDetailTotal}>{formatNaira(selectedOrder.total_amount)}</Text>
                                    </View>

                                    <View style={styles.orderDetailSection}>
                                        <Text style={styles.orderDetailLabel}>Current Status</Text>
                                        <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusStyle(selectedOrder.status).bgColor }]}>
                                            <Text style={{ color: getStatusStyle(selectedOrder.status).color, fontWeight: '700', fontSize: 16 }}>
                                                {getStatusStyle(selectedOrder.status).icon} {getStatusStyle(selectedOrder.status).label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Status Update Buttons */}
                                    <Text style={styles.orderDetailLabel}>Update Status</Text>
                                    <View style={styles.statusButtonsRow}>
                                        {selectedOrder.status.toLowerCase() === 'pending' && (
                                            <TouchableOpacity style={styles.statusBtn} onPress={() => handleUpdateStatus('paid')} disabled={isSubmitting}>
                                                <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.statusBtnGradient}>
                                                    <Text style={styles.statusBtnText}>💳 Mark Paid</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        )}
                                        {(selectedOrder.status.toLowerCase() === 'pending' || selectedOrder.status.toLowerCase() === 'paid') && (
                                            <TouchableOpacity style={styles.statusBtn} onPress={() => handleUpdateStatus('fulfilled')} disabled={isSubmitting}>
                                                <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.statusBtnGradient}>
                                                    <Text style={styles.statusBtnText}>✅ Mark Delivered</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        )}
                                        {selectedOrder.status.toLowerCase() === 'fulfilled' && (
                                            <Text style={styles.completedText}>✅ This order is complete!</Text>
                                        )}
                                    </View>

                                    <View style={{ height: 40 }} />
                                </ScrollView>
                            )}
                        </LinearGradient>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#05090E' },
    orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
    orbGreen: { top: -100, right: -100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    brandBadge: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    brandIcon: { fontSize: 12 },
    brandName: { fontSize: 13, fontWeight: '800', color: '#2BAFF2', letterSpacing: 2 },
    title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    addButton: { marginTop: 20 },
    addButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, gap: 6 },
    addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    statsContainer: { paddingHorizontal: 20, marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    statCardWarning: { borderColor: 'rgba(245, 158, 11, 0.3)' },
    statCardGradient: { padding: 14, alignItems: 'center', justifyContent: 'center', minHeight: 95 },
    statEmoji: { fontSize: 18, marginBottom: 6 },
    statValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
    statValueMoney: { fontSize: 12, fontWeight: '700', color: '#00DFFF' },
    statValueWarning: { color: '#F59E0B' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: '500' },
    filtersRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 8 },
    filterButton: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
    filterButtonActive: { borderColor: 'rgba(43, 175, 242, 0.5)' },
    filterGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 4 },
    filterInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 4 },
    filterIcon: { fontSize: 12 },
    filterText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
    filterTextActive: { fontSize: 11, color: '#000', fontWeight: '700' },
    orderList: { paddingHorizontal: 20, paddingBottom: 100 },
    orderCard: { marginBottom: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { padding: 16 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    customerInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarGradient: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    avatarIcon: { fontSize: 20 },
    customerDetails: { marginLeft: 12 },
    orderId: { fontSize: 15, fontWeight: '700', color: '#2BAFF2', letterSpacing: 0.5 },
    customerPhone: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    orderIdLarge: { fontSize: 18, fontWeight: '700', color: '#2BAFF2', letterSpacing: 0.5 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 4 },
    statusIcon: { fontSize: 11 },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    orderItems: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14, gap: 8 },
    itemRow: { flexDirection: 'row', alignItems: 'center' },
    quantityBadge: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
    itemQuantity: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    itemName: { flex: 1, fontSize: 14, color: '#FFFFFF' },
    itemPrice: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
    totalRow: { flexDirection: 'row', alignItems: 'baseline' },
    currencySymbol: { fontSize: 12, color: '#2BAFF2', fontWeight: '600', marginRight: 2 },
    totalAmount: { fontSize: 20, fontWeight: '700', color: '#2BAFF2' },
    emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
    emptyIconContainer: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    emptyEmoji: { fontSize: 48 },
    emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
    emptyCTA: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
    emptyCTAGradient: { paddingVertical: 16, paddingHorizontal: 28, alignItems: 'center' },
    emptyCTAText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContainer: { maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    modalContent: { padding: 20, paddingTop: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
    closeButton: { padding: 8 },
    modalScroll: { maxHeight: 450 },
    inputLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
    input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    textArea: { minHeight: 60, textAlignVertical: 'top' },
    rowInputs: { flexDirection: 'row', gap: 12 },
    halfInput: { flex: 1 },
    priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pricePrefix: { fontSize: 18, color: '#2BAFF2', fontWeight: '600', paddingLeft: 16 },
    priceInput: { flex: 1, padding: 16, color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    channelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    channelChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 6 },
    channelChipActive: { backgroundColor: '#1F57F5', borderColor: '#1F57F5' },
    channelIcon: { fontSize: 16 },
    channelText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    channelTextActive: { color: '#FFF' },
    submitButton: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
    submitButtonGradient: { paddingVertical: 18, alignItems: 'center' },
    submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    // Order Detail Modal
    orderModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    orderModalContainer: { maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    orderModalContent: { padding: 20, paddingTop: 16 },
    orderDetailSection: { marginBottom: 20 },
    orderDetailLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
    orderDetailValue: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
    orderDetailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    orderDetailItemName: { fontSize: 15, color: '#FFFFFF', flex: 1 },
    orderDetailItemPrice: { fontSize: 14, color: '#2BAFF2', fontWeight: '600' },
    orderDetailTotal: { fontSize: 28, color: '#2BAFF2', fontWeight: '700' },
    statusBadgeLarge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' },
    statusButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    statusBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    statusBtnGradient: { paddingVertical: 14, alignItems: 'center' },
    statusBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },
    completedText: { fontSize: 16, color: '#22C55E', fontWeight: '600', paddingVertical: 12 },
});
