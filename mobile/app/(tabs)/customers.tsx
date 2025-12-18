/**
 * KOFA Customer Database
 * View and manage customer relationships
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Modal,
    ScrollView,
    Linking,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatNaira, getCustomers, getCustomerOrders, Customer, Order } from '@/lib/api';

const AnimatedView = Animated.createAnimatedComponent(View);

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function maskPhone(phone: string): string {
    if (phone.length < 8) return phone;
    return phone.slice(0, -4) + '****';
}

export default function CustomersScreen() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        const data = await getCustomers();
        setCustomers(data);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCustomers().finally(() => setRefreshing(false));
    };

    const handleCustomerPress = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowDetailModal(true);
        setLoadingOrders(true);
        const orders = await getCustomerOrders(customer.phone);
        setCustomerOrders(orders);
        setLoadingOrders(false);
    };

    const handleWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        const url = `whatsapp://send?phone=${cleanPhone}`;
        Linking.openURL(url).catch(() => {
            Linking.openURL(`https://wa.me/${cleanPhone}`);
        });
    };

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const totalCustomers = customers.length;
    const topSpender = customers[0];
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent_ngn, 0);

    const renderCustomer = ({ item, index }: { item: Customer; index: number }) => (
        <AnimatedView entering={FadeInUp.delay(index * 50).springify()}>
            <TouchableOpacity style={styles.customerCard} activeOpacity={0.85} onPress={() => handleCustomerPress(item)}>
                <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']} style={styles.cardGradient}>
                    <View style={styles.customerRow}>
                        <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                        </LinearGradient>
                        <View style={styles.customerInfo}>
                            <Text style={styles.customerName}>{item.name}</Text>
                            <Text style={styles.customerPhone}>{maskPhone(item.phone)}</Text>
                        </View>
                        <View style={styles.customerStats}>
                            <Text style={styles.statAmount}>{formatNaira(item.total_spent_ngn)}</Text>
                            <Text style={styles.statLabel}>{item.total_orders} order{item.total_orders > 1 ? 's' : ''}</Text>
                        </View>
                    </View>
                    <View style={styles.tagsRow}>
                        {item.favorite_products.slice(0, 3).map((product, i) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagText}>{product.substring(0, 15)}</Text>
                            </View>
                        ))}
                        {item.favorite_products.length > 3 && (
                            <View style={styles.tagMore}>
                                <Text style={styles.tagMoreText}>+{item.favorite_products.length - 3}</Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </AnimatedView>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#05090E', '#0D1117', '#05090E']} style={StyleSheet.absoluteFillObject} />

            {/* Header */}
            <AnimatedView entering={FadeInDown.springify()} style={styles.header}>
                <View style={styles.brandRow}>
                    <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.brandBadge}>
                        <Text style={styles.brandIcon}>👥</Text>
                    </LinearGradient>
                    <Text style={styles.brandName}>KOFA</Text>
                </View>
                <Text style={styles.title}>Customers</Text>
                <Text style={styles.subtitle}>Your customer relationships</Text>
            </AnimatedView>

            {/* Stats Row */}
            <AnimatedView entering={FadeInUp.delay(80).springify()} style={styles.statsRow}>
                <View style={styles.statCard}>
                    <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'rgba(43, 175, 242, 0.05)']} style={styles.statGradient}>
                        <Text style={styles.statEmoji}>👥</Text>
                        <Text style={styles.statValue}>{totalCustomers}</Text>
                        <Text style={styles.statCardLabel}>Customers</Text>
                    </LinearGradient>
                </View>
                <View style={styles.statCard}>
                    <LinearGradient colors={['rgba(0, 223, 255, 0.2)', 'rgba(0, 223, 255, 0.05)']} style={styles.statGradient}>
                        <Text style={styles.statEmoji}>👑</Text>
                        <Text style={styles.statValueSmall}>{topSpender?.name || '-'}</Text>
                        <Text style={styles.statCardLabel}>Top Spender</Text>
                    </LinearGradient>
                </View>
            </AnimatedView>

            {/* Customer List */}
            <FlatList
                data={customers}
                renderItem={renderCustomer}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2BAFF2" />}
                ListEmptyComponent={
                    <AnimatedView entering={FadeIn.delay(300)} style={styles.emptyState}>
                        <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'rgba(43, 175, 242, 0.05)']} style={styles.emptyIcon}>
                            <Text style={styles.emptyEmoji}>👥</Text>
                        </LinearGradient>
                        <Text style={styles.emptyTitle}>No customers yet</Text>
                        <Text style={styles.emptySubtitle}>Customers will appear here after their first order</Text>
                    </AnimatedView>
                }
            />

            {/* Customer Detail Modal */}
            <Modal visible={showDetailModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <LinearGradient colors={['#0D1117', '#05090E']} style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Customer Details</Text>
                                <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            {selectedCustomer && (
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {/* Customer Info */}
                                    <View style={styles.detailSection}>
                                        <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.detailAvatar}>
                                            <Text style={styles.detailAvatarText}>{selectedCustomer.name.charAt(0)}</Text>
                                        </LinearGradient>
                                        <Text style={styles.detailName}>{selectedCustomer.name}</Text>
                                        <Text style={styles.detailPhone}>{selectedCustomer.phone}</Text>

                                        {/* Quick Actions */}
                                        <View style={styles.actionRow}>
                                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleWhatsApp(selectedCustomer.phone)}>
                                                <LinearGradient colors={['#25D366', '#128C7E']} style={styles.actionBtnGradient}>
                                                    <Text style={styles.actionBtnIcon}>💬</Text>
                                                    <Text style={styles.actionBtnText}>WhatsApp</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={styles.actionBtn} onPress={() => handleCall(selectedCustomer.phone)}>
                                                <View style={styles.actionBtnOutline}>
                                                    <Text style={styles.actionBtnIcon}>📞</Text>
                                                    <Text style={styles.actionBtnTextOutline}>Call</Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Stats */}
                                    <View style={styles.detailStats}>
                                        <View style={styles.detailStatItem}>
                                            <Text style={styles.detailStatValue}>{formatNaira(selectedCustomer.total_spent_ngn)}</Text>
                                            <Text style={styles.detailStatLabel}>Total Spent</Text>
                                        </View>
                                        <View style={styles.detailStatDivider} />
                                        <View style={styles.detailStatItem}>
                                            <Text style={styles.detailStatValue}>{selectedCustomer.total_orders}</Text>
                                            <Text style={styles.detailStatLabel}>Orders</Text>
                                        </View>
                                        <View style={styles.detailStatDivider} />
                                        <View style={styles.detailStatItem}>
                                            <Text style={styles.detailStatValue}>{formatDate(selectedCustomer.first_order_date)}</Text>
                                            <Text style={styles.detailStatLabel}>First Order</Text>
                                        </View>
                                    </View>

                                    {/* Order History */}
                                    <Text style={styles.sectionTitle}>Order History</Text>
                                    {loadingOrders ? (
                                        <Text style={styles.loadingText}>Loading orders...</Text>
                                    ) : customerOrders.length === 0 ? (
                                        <Text style={styles.noOrdersText}>No orders found</Text>
                                    ) : (
                                        customerOrders.map((order) => (
                                            <View key={order.id} style={styles.orderHistoryCard}>
                                                <View style={styles.orderHistoryHeader}>
                                                    <Text style={styles.orderHistoryId}>{order.id}</Text>
                                                    <Text style={styles.orderHistoryAmount}>{formatNaira(order.total_amount)}</Text>
                                                </View>
                                                <Text style={styles.orderHistoryDate}>{formatDate(order.created_at)}</Text>
                                                <View style={styles.orderHistoryItems}>
                                                    {order.items.map((item, idx) => (
                                                        <Text key={idx} style={styles.orderHistoryItem}>
                                                            {item.quantity}x {item.product_name}
                                                        </Text>
                                                    ))}
                                                </View>
                                            </View>
                                        ))
                                    )}

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
    header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    brandBadge: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    brandIcon: { fontSize: 12 },
    brandName: { fontSize: 13, fontWeight: '800', color: '#2BAFF2', letterSpacing: 2 },
    title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

    statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 16 },
    statCard: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    statGradient: { padding: 16, alignItems: 'center' },
    statEmoji: { fontSize: 20, marginBottom: 8 },
    statValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
    statValueSmall: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
    statCardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    customerCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { padding: 16 },
    customerRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    customerInfo: { flex: 1, marginLeft: 12 },
    customerName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    customerPhone: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    customerStats: { alignItems: 'flex-end' },
    statAmount: { fontSize: 16, fontWeight: '700', color: '#2BAFF2' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 6 },
    tag: { backgroundColor: 'rgba(43, 175, 242, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    tagText: { fontSize: 10, color: '#2BAFF2', fontWeight: '600' },
    tagMore: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    tagMoreText: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },

    emptyState: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyEmoji: { fontSize: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', paddingHorizontal: 40 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContainer: { maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
    modalContent: { padding: 20, paddingTop: 16 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
    closeButton: { padding: 8 },

    detailSection: { alignItems: 'center', marginBottom: 24 },
    detailAvatar: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    detailAvatarText: { fontSize: 32, fontWeight: '700', color: '#FFF' },
    detailName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
    detailPhone: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

    actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    actionBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    actionBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
    actionBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    actionBtnIcon: { fontSize: 16 },
    actionBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    actionBtnTextOutline: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

    detailStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 24 },
    detailStatItem: { flex: 1, alignItems: 'center' },
    detailStatValue: { fontSize: 14, fontWeight: '700', color: '#2BAFF2' },
    detailStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase' },
    detailStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
    loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
    noOrdersText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', paddingVertical: 20 },

    orderHistoryCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    orderHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderHistoryId: { fontSize: 12, fontWeight: '600', color: '#2BAFF2' },
    orderHistoryAmount: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
    orderHistoryDate: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
    orderHistoryItems: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    orderHistoryItem: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
});
