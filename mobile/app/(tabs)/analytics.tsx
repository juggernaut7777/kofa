/**
 * KOFA Analytics Dashboard
 * Premium analytics screen with revenue, profit, top products, platform breakdown, and customer insights
 */
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
    formatNaira,
    getRevenue,
    getTopProducts,
    getLowStockAlerts,
    getCrossPlatformAnalytics,
    RevenueMetrics,
    TopProduct,
    CrossPlatformAnalytics,
} from '@/lib/api';

const AnimatedView = Animated.createAnimatedComponent(View);
const API_BASE = 'https://kofa-dhko.onrender.com';

type Period = 'today' | 'week' | 'month';

interface ExpenseSummary {
    business_burn: number;
    total_outflow: number;
    expense_count: number;
}

export default function AnalyticsScreen() {
    const [period, setPeriod] = useState<Period>('month');
    const [refreshing, setRefreshing] = useState(false);
    const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
    const [expenses, setExpenses] = useState<ExpenseSummary | null>(null);
    const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [platformAnalytics, setPlatformAnalytics] = useState<CrossPlatformAnalytics | null>(null);

    useEffect(() => {
        loadData();
    }, [period]);

    const loadData = async () => {
        const [revenueData, products, alerts, platforms, expensesData] = await Promise.all([
            getRevenue(period),
            getTopProducts(5, period),
            getLowStockAlerts(5),
            getCrossPlatformAnalytics(),
            fetchExpenses(),
        ]);
        setRevenue(revenueData);
        setTopProducts(products);
        setLowStock(alerts);
        setPlatformAnalytics(platforms);
        setExpenses(expensesData);
    };

    const fetchExpenses = async (): Promise<ExpenseSummary | null> => {
        try {
            const res = await fetch(`${API_BASE}/expenses/summary`);
            return await res.json();
        } catch (error) {
            console.error('Error fetching expenses:', error);
            return null;
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadData().finally(() => setRefreshing(false));
    };

    // Calculate profit
    const totalRevenue = revenue?.total_revenue_ngn || 0;
    const totalExpenses = expenses?.business_burn || 0;
    const profit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : '0';

    const PeriodButton = ({ label, value }: { label: string; value: Period }) => (
        <TouchableOpacity
            style={[styles.periodButton, period === value && styles.periodButtonActive]}
            onPress={() => setPeriod(value)}
        >
            {period === value ? (
                <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.periodGradient}>
                    <Text style={styles.periodTextActive}>{label}</Text>
                </LinearGradient>
            ) : (
                <Text style={styles.periodText}>{label}</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#05090E', '#0D1117', '#05090E']} style={StyleSheet.absoluteFillObject} />

            {/* Header */}
            <AnimatedView entering={FadeInDown.springify()} style={styles.header}>
                <View style={styles.brandRow}>
                    <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.brandBadge}>
                        <Text style={styles.brandIcon}>📊</Text>
                    </LinearGradient>
                    <Text style={styles.brandName}>KOFA</Text>
                </View>
                <Text style={styles.title}>Analytics</Text>
                <Text style={styles.subtitle}>Your business performance</Text>
            </AnimatedView>

            {/* Period Selector */}
            <AnimatedView entering={FadeInUp.delay(50).springify()} style={styles.periodRow}>
                <PeriodButton label="Today" value="today" />
                <PeriodButton label="Week" value="week" />
                <PeriodButton label="Month" value="month" />
            </AnimatedView>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2BAFF2" />}
            >
                {/* Profit Card - Main Hero */}
                <AnimatedView entering={FadeInUp.delay(80).springify()} style={styles.profitCard}>
                    <LinearGradient
                        colors={profit >= 0 ? ['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.02)'] : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.02)']}
                        style={styles.profitGradient}
                    >
                        <Text style={styles.profitLabel}>💰 Net Profit</Text>
                        <Text style={[styles.profitValue, profit < 0 && styles.profitNegative]}>
                            {profit >= 0 ? formatNaira(profit) : `-${formatNaira(Math.abs(profit))}`}
                        </Text>
                        <View style={styles.profitDetails}>
                            <View style={styles.profitDetailItem}>
                                <Text style={styles.profitDetailLabel}>Revenue</Text>
                                <Text style={styles.profitDetailValue}>{formatNaira(totalRevenue)}</Text>
                            </View>
                            <View style={styles.profitDivider} />
                            <View style={styles.profitDetailItem}>
                                <Text style={styles.profitDetailLabel}>Expenses</Text>
                                <Text style={[styles.profitDetailValue, { color: '#FF6B6B' }]}>-{formatNaira(totalExpenses)}</Text>
                            </View>
                            <View style={styles.profitDivider} />
                            <View style={styles.profitDetailItem}>
                                <Text style={styles.profitDetailLabel}>Margin</Text>
                                <Text style={[styles.profitDetailValue, { color: profit >= 0 ? '#22C55E' : '#EF4444' }]}>{profitMargin}%</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </AnimatedView>

                {/* Revenue & Orders Row */}
                <AnimatedView entering={FadeInUp.delay(100).springify()} style={styles.revenueRow}>
                    <View style={styles.revenueCard}>
                        <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'rgba(43, 175, 242, 0.05)']} style={styles.revenueGradient}>
                            <Text style={styles.revenueEmoji}>📦</Text>
                            <Text style={styles.revenueLabel}>Orders</Text>
                            <Text style={styles.revenueValue}>{revenue?.order_count || 0}</Text>
                            {revenue && (
                                <View style={[styles.growthBadge, revenue.growth_percent >= 0 ? styles.growthUp : styles.growthDown]}>
                                    <Ionicons name={revenue.growth_percent >= 0 ? 'trending-up' : 'trending-down'} size={12} color={revenue.growth_percent >= 0 ? '#22C55E' : '#EF4444'} />
                                    <Text style={revenue.growth_percent >= 0 ? styles.growthTextUp : styles.growthTextDown}>
                                        {Math.abs(revenue.growth_percent).toFixed(1)}%
                                    </Text>
                                </View>
                            )}
                        </LinearGradient>
                    </View>
                    <View style={styles.revenueCard}>
                        <LinearGradient colors={['rgba(0, 223, 255, 0.2)', 'rgba(0, 223, 255, 0.05)']} style={styles.revenueGradient}>
                            <Text style={styles.revenueEmoji}>💵</Text>
                            <Text style={styles.revenueLabel}>Avg Order</Text>
                            <Text style={styles.revenueValueSmall}>{revenue ? formatNaira(revenue.average_order_value) : '₦0'}</Text>
                        </LinearGradient>
                    </View>
                </AnimatedView>

                {/* Platform Analytics */}
                {platformAnalytics && (
                    <AnimatedView entering={FadeInUp.delay(120).springify()} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>📱 Platform Breakdown</Text>
                            <Text style={styles.sectionSubtitle}>Where your sales come from</Text>
                        </View>

                        <View style={styles.platformRow}>
                            <View style={styles.platformCard}>
                                <LinearGradient colors={['rgba(37, 211, 102, 0.2)', 'rgba(37, 211, 102, 0.05)']} style={styles.platformCardGradient}>
                                    <Text style={styles.platformIcon}>💬</Text>
                                    <Text style={styles.platformName}>WhatsApp</Text>
                                    <Text style={styles.platformMessages}>{platformAnalytics.platforms.whatsapp.total_messages} msgs</Text>
                                    <Text style={styles.platformRevenue}>{formatNaira(platformAnalytics.platforms.whatsapp.revenue_ngn)}</Text>
                                </LinearGradient>
                            </View>
                            <View style={styles.platformCard}>
                                <LinearGradient colors={['rgba(225, 48, 108, 0.2)', 'rgba(225, 48, 108, 0.05)']} style={styles.platformCardGradient}>
                                    <Text style={styles.platformIcon}>📸</Text>
                                    <Text style={styles.platformName}>Instagram</Text>
                                    <Text style={styles.platformMessages}>{platformAnalytics.platforms.instagram.total_messages} msgs</Text>
                                    <Text style={styles.platformRevenue}>{formatNaira(platformAnalytics.platforms.instagram.revenue_ngn)}</Text>
                                </LinearGradient>
                            </View>
                            <View style={styles.platformCard}>
                                <LinearGradient colors={['rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.1)']} style={styles.platformCardGradient}>
                                    <Text style={styles.platformIcon}>🎵</Text>
                                    <Text style={styles.platformName}>TikTok</Text>
                                    <Text style={styles.platformMessages}>{platformAnalytics.platforms.tiktok.total_messages} msgs</Text>
                                    <Text style={styles.platformRevenue}>{formatNaira(platformAnalytics.platforms.tiktok.revenue_ngn)}</Text>
                                </LinearGradient>
                            </View>
                        </View>

                        {platformAnalytics.summary.best_platform && (
                            <View style={styles.bestPlatformBadge}>
                                <Text style={styles.bestPlatformText}>🏆 Best performer: {platformAnalytics.summary.best_platform}</Text>
                            </View>
                        )}
                    </AnimatedView>
                )}

                {/* Top Products */}
                <AnimatedView entering={FadeInUp.delay(150).springify()} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🏆 Best Sellers</Text>
                        <Text style={styles.sectionSubtitle}>Top products by revenue</Text>
                    </View>

                    {topProducts.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No sales data yet</Text>
                        </View>
                    ) : (
                        topProducts.map((product, index) => (
                            <View key={product.product_id} style={styles.productCard}>
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>{index + 1}</Text>
                                </View>
                                <View style={styles.productInfo}>
                                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                                    <Text style={styles.productMeta}>{product.units_sold} sold • {product.stock_remaining} left</Text>
                                </View>
                                <Text style={styles.productRevenue}>{formatNaira(product.revenue_ngn)}</Text>
                            </View>
                        ))
                    )}
                </AnimatedView>

                {/* Low Stock Alerts */}
                {lowStock.length > 0 && (
                    <AnimatedView entering={FadeInUp.delay(200).springify()} style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>⚠️ Low Stock Alerts</Text>
                            <Text style={styles.sectionSubtitle}>Restock soon</Text>
                        </View>

                        {lowStock.map((item) => (
                            <View key={item.product_id} style={[styles.alertCard, item.alert_level === 'critical' && styles.alertCritical]}>
                                <View style={styles.alertInfo}>
                                    <Text style={styles.alertName}>{item.product_name}</Text>
                                    <Text style={styles.alertMeta}>{item.category}</Text>
                                </View>
                                <View style={[styles.stockBadge, item.alert_level === 'critical' ? styles.stockCritical : styles.stockWarning]}>
                                    <Text style={[styles.stockText, item.alert_level === 'critical' && { color: '#EF4444' }]}>{item.stock_remaining} left</Text>
                                </View>
                            </View>
                        ))}
                    </AnimatedView>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>
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

    periodRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, gap: 8 },
    periodButton: { flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    periodButtonActive: { borderColor: 'rgba(43, 175, 242, 0.5)' },
    periodGradient: { paddingVertical: 12, alignItems: 'center' },
    periodText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 13, paddingVertical: 12, textAlign: 'center' },
    periodTextActive: { color: '#000', fontWeight: '700', fontSize: 13 },

    scrollContent: { paddingHorizontal: 20 },

    // Profit Card
    profitCard: { marginBottom: 16, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)' },
    profitGradient: { padding: 20, alignItems: 'center' },
    profitLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
    profitValue: { fontSize: 36, fontWeight: '700', color: '#22C55E', marginTop: 4 },
    profitNegative: { color: '#EF4444' },
    profitDetails: { flexDirection: 'row', marginTop: 16, width: '100%', justifyContent: 'space-around' },
    profitDetailItem: { alignItems: 'center' },
    profitDetailLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
    profitDetailValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
    profitDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },

    revenueRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    revenueCard: { flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    revenueGradient: { padding: 16, alignItems: 'center', minHeight: 110 },
    revenueEmoji: { fontSize: 24, marginBottom: 8 },
    revenueLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    revenueValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
    revenueValueSmall: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
    growthBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
    growthUp: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
    growthDown: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
    growthTextUp: { fontSize: 11, fontWeight: '600', color: '#22C55E' },
    growthTextDown: { fontSize: 11, fontWeight: '600', color: '#EF4444' },

    section: { marginBottom: 24 },
    sectionHeader: { marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    sectionSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },

    // Platform Analytics
    platformRow: { flexDirection: 'row', gap: 8 },
    platformCard: { flex: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    platformCardGradient: { padding: 12, alignItems: 'center' },
    platformIcon: { fontSize: 20, marginBottom: 4 },
    platformName: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    platformMessages: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    platformRevenue: { fontSize: 12, color: '#2BAFF2', fontWeight: '700', marginTop: 2 },
    bestPlatformBadge: { alignSelf: 'center', marginTop: 12, backgroundColor: 'rgba(43, 175, 242, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    bestPlatformText: { fontSize: 12, color: '#2BAFF2', fontWeight: '600' },

    emptyCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },

    productCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    rankBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(43, 175, 242, 0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    rankText: { fontSize: 12, fontWeight: '700', color: '#2BAFF2' },
    productInfo: { flex: 1 },
    productName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
    productMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    productRevenue: { fontSize: 14, fontWeight: '700', color: '#2BAFF2' },

    customerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    customerAvatar: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    customerInitial: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    customerInfo: { flex: 1 },
    customerName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
    customerMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    customerSpent: { fontSize: 14, fontWeight: '700', color: '#00DFFF' },

    alertCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
    alertCritical: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' },
    alertInfo: { flex: 1 },
    alertName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
    alertMeta: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    stockBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    stockWarning: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
    stockCritical: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
    stockText: { fontSize: 11, fontWeight: '700', color: '#F59E0B' },
});
