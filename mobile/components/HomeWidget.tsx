/**
 * KOFA Home Screen Widget
 * Quick stats dashboard card for at-a-glance business metrics
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getWidgetStats, formatNaira, WidgetStats } from '@/lib/api';
import { router } from 'expo-router';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function HomeWidget() {
    const [stats, setStats] = useState<WidgetStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
        // Refresh every 30 seconds for live updates
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadStats = async () => {
        try {
            const data = await getWidgetStats();
            setStats(data);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <View style={styles.container}>
                <LinearGradient colors={['rgba(43, 175, 242, 0.1)', 'rgba(43, 175, 242, 0.02)']} style={styles.loadingGradient}>
                    <Text style={styles.loadingText}>Loading stats...</Text>
                </LinearGradient>
            </View>
        );
    }

    const hasAlerts = stats.pending_orders > 0 || stats.low_stock_alerts > 0;

    return (
        <AnimatedView entering={FadeInUp.delay(50).springify()} style={styles.container}>
            <LinearGradient
                colors={['rgba(43, 175, 242, 0.12)', 'rgba(31, 87, 245, 0.05)']}
                style={styles.widgetGradient}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>📊 Today's Snapshot</Text>
                    <Text style={styles.headerDate}>{new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
                </View>

                {/* Main Stats Row */}
                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statItem} onPress={() => router.push('/orders')}>
                        <Text style={styles.statEmoji}>💰</Text>
                        <Text style={styles.statValue}>{formatNaira(stats.revenue_today)}</Text>
                        <Text style={styles.statLabel}>Revenue</Text>
                    </TouchableOpacity>

                    <View style={styles.statDivider} />

                    <TouchableOpacity style={styles.statItem} onPress={() => router.push('/orders')}>
                        <Text style={styles.statEmoji}>📦</Text>
                        <Text style={styles.statValue}>{stats.orders_today}</Text>
                        <Text style={styles.statLabel}>Orders</Text>
                    </TouchableOpacity>
                </View>

                {/* Alert Row */}
                {hasAlerts && (
                    <View style={styles.alertsRow}>
                        {stats.pending_orders > 0 && (
                            <TouchableOpacity style={styles.alertBadge} onPress={() => router.push('/orders')}>
                                <LinearGradient colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.08)']} style={styles.alertGradient}>
                                    <Text style={styles.alertIcon}>⏳</Text>
                                    <Text style={styles.alertText}>{stats.pending_orders} pending</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                        {stats.low_stock_alerts > 0 && (
                            <TouchableOpacity style={styles.alertBadge} onPress={() => router.push('/')}>
                                <LinearGradient colors={['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.08)']} style={styles.alertGradient}>
                                    <Text style={styles.alertIcon}>⚠️</Text>
                                    <Text style={[styles.alertText, { color: '#EF4444' }]}>{stats.low_stock_alerts} low stock</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* No alerts message */}
                {!hasAlerts && (
                    <View style={styles.allGoodBadge}>
                        <Text style={styles.allGoodText}>✅ All caught up!</Text>
                    </View>
                )}
            </LinearGradient>
        </AnimatedView>
    );
}

const styles = StyleSheet.create({
    container: { marginHorizontal: 20, marginBottom: 16 },
    widgetGradient: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(43, 175, 242, 0.2)' },
    loadingGradient: { borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    headerDate: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

    statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    statItem: { flex: 1, alignItems: 'center' },
    statEmoji: { fontSize: 24, marginBottom: 6 },
    statValue: { fontSize: 24, fontWeight: '700', color: '#2BAFF2' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
    statDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.1)' },

    alertsRow: { flexDirection: 'row', gap: 10 },
    alertBadge: { flex: 1, borderRadius: 10, overflow: 'hidden' },
    alertGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
    alertIcon: { fontSize: 14 },
    alertText: { fontSize: 12, fontWeight: '600', color: '#F59E0B' },

    allGoodBadge: { alignItems: 'center', paddingVertical: 8 },
    allGoodText: { fontSize: 13, color: '#22C55E', fontWeight: '600' },
});
