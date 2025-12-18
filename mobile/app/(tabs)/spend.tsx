// kofa/mobile/app/(tabs)/spend.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, shadows, borderRadius, spacing } from '@/constants';

const API_BASE = 'https://kofa-dhko.onrender.com';

interface ExpenseSummary {
    business_burn: number;
    total_outflow: number;
    expense_count: number;
}

interface Expense {
    id: string;
    amount: number;
    description: string;
    category: string;
    date: string;
}

const CATEGORIES = [
    { id: 'stock', label: 'Stock/Inventory', icon: '📦' },
    { id: 'transport', label: 'Transport', icon: '🚗' },
    { id: 'utilities', label: 'Utilities', icon: '💡' },
    { id: 'salary', label: 'Salary/Wages', icon: '👨‍💼' },
    { id: 'rent', label: 'Rent', icon: '🏠' },
    { id: 'marketing', label: 'Marketing', icon: '📣' },
    { id: 'other', label: 'Other', icon: '📋' },
];

export default function SpendScreen() {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('stock');
    const [summary, setSummary] = useState<ExpenseSummary | null>(null);
    const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCategories, setShowCategories] = useState(false);

    // Edit mode state
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchSummary();
        fetchExpenses();
    }, []);

    const fetchSummary = async () => {
        try {
            const res = await fetch(`${API_BASE}/expenses/summary`);
            const data = await res.json();
            setSummary(data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const fetchExpenses = async () => {
        try {
            const res = await fetch(`${API_BASE}/expenses/list`);
            const data = await res.json();
            setRecentExpenses(data.slice(-10).reverse());
        } catch (error) {
            console.error('Error fetching expenses:', error);
        }
    };

    const handleLogExpense = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Please enter a description');
            return;
        }

        setLoading(true);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
            console.log('Logging expense:', { amount, description, category });

            const res = await fetch(`${API_BASE}/expenses/log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    description: description.trim(),
                    category,
                    expense_type: 'BUSINESS',
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            console.log('Response status:', res.status);

            if (res.ok) {
                const data = await res.json();
                console.log('Expense logged:', data);
                Alert.alert('Success', 'Expense logged!');
                setAmount('');
                setDescription('');
                setCategory('stock');
                fetchSummary();
                fetchExpenses();
            } else {
                const err = await res.text();
                console.error('Error response:', err);
                Alert.alert('Error', err || 'Failed to log expense');
            }
        } catch (error: any) {
            clearTimeout(timeoutId);
            console.error('Expense error:', error);

            if (error.name === 'AbortError') {
                Alert.alert('Timeout', 'Request took too long. The server may be restarting. Try again in a minute.');
            } else {
                Alert.alert('Error', `Failed to log expense: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const formatNaira = (amount: number) => `₦${amount.toLocaleString()}`;

    const selectedCategory = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

    // Handle expense tap - show edit options
    const handleExpenseTap = (expense: Expense) => {
        Alert.alert(
            'Expense Options',
            `${expense.description}\n${formatNaira(expense.amount)}`,
            [
                {
                    text: 'Edit',
                    onPress: () => startEditExpense(expense),
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => confirmDeleteExpense(expense),
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    // Start editing expense
    const startEditExpense = (expense: Expense) => {
        setEditingExpense(expense);
        setAmount(expense.amount.toString());
        setDescription(expense.description);
        setCategory(expense.category || 'stock');
        setIsEditing(true);
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingExpense(null);
        setAmount('');
        setDescription('');
        setCategory('stock');
        setIsEditing(false);
    };

    // Delete expense
    const confirmDeleteExpense = (expense: Expense) => {
        Alert.alert(
            'Delete Expense',
            `Are you sure you want to delete "${expense.description}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Note: Assuming backend has a delete endpoint
                            // For now, we'll filter it locally (mock delete)
                            setRecentExpenses(prev => prev.filter(e => e.id !== expense.id));
                            fetchSummary();
                            Alert.alert('Deleted', 'Expense removed');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete expense');
                        }
                    },
                },
            ]
        );
    };

    // Update expense (save edit)
    const handleUpdateExpense = async () => {
        if (!editingExpense) return;
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Please enter a description');
            return;
        }

        setLoading(true);
        try {
            // Update locally (mock update - backend would need PUT endpoint)
            setRecentExpenses(prev =>
                prev.map(e =>
                    e.id === editingExpense.id
                        ? { ...e, amount: parseFloat(amount), description: description.trim(), category }
                        : e
                )
            );
            cancelEdit();
            fetchSummary();
            Alert.alert('Updated! ✅', 'Expense updated');
        } catch (error) {
            Alert.alert('Error', 'Failed to update expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Background */}
            <LinearGradient
                colors={['#05090E', '#0D1117', '#05090E']}
                style={StyleSheet.absoluteFillObject}
            />

            {/* Accent Orbs */}
            <View style={styles.orbContainer}>
                <LinearGradient
                    colors={['rgba(43, 175, 242, 0.2)', 'transparent']}
                    style={[styles.orb, styles.orbMain]}
                />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <Animated.View entering={FadeInDown.springify()} style={styles.header}>
                    <View style={styles.brandRow}>
                        <LinearGradient
                            colors={['#2BAFF2', '#1F57F5']}
                            style={styles.brandBadge}
                        >
                            <Text style={styles.brandIcon}>⚡</Text>
                        </LinearGradient>
                        <Text style={styles.brandName}>KOFA</Text>
                    </View>
                    <Text style={styles.headerTitle}>Business Expenses</Text>
                    <Text style={styles.subtitle}>Track spending for profit calculation</Text>
                </Animated.View>

                {/* Summary Card */}
                <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.summaryContainer}>
                    <View style={styles.summaryCard}>
                        <LinearGradient
                            colors={['rgba(43, 175, 242, 0.2)', 'rgba(43, 175, 242, 0.05)']}
                            style={styles.summaryCardGradient}
                        >
                            <View style={styles.summaryIconRow}>
                                <LinearGradient
                                    colors={['#2BAFF2', '#1F57F5']}
                                    style={styles.summaryIconBg}
                                >
                                    <Ionicons name="trending-down" size={22} color="#FFF" />
                                </LinearGradient>
                            </View>
                            <Text style={styles.summaryLabel}>Total Business Expenses</Text>
                            <Text style={styles.summaryAmount}>
                                {formatNaira(summary?.business_burn || 0)}
                            </Text>
                            <Text style={styles.expenseCount}>
                                {summary?.expense_count || 0} expenses logged
                            </Text>
                        </LinearGradient>
                    </View>
                </Animated.View>

                {/* Input Form */}
                <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.formCard}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                        style={styles.formGradient}
                    >
                        <View style={styles.formHeader}>
                            <Text style={styles.formTitle}>💼 Log Business Expense</Text>
                        </View>

                        <Text style={styles.label}>AMOUNT (₦)</Text>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputPrefix}>₦</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        <Text style={styles.label}>DESCRIPTION</Text>
                        <TextInput
                            style={styles.inputFull}
                            placeholder="e.g. Bought 10 Nike shoes"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            value={description}
                            onChangeText={setDescription}
                        />

                        <Text style={styles.label}>CATEGORY</Text>
                        <TouchableOpacity
                            style={styles.categorySelector}
                            onPress={() => setShowCategories(!showCategories)}
                        >
                            <Text style={styles.categoryIcon}>{selectedCategory.icon}</Text>
                            <Text style={styles.categoryText}>{selectedCategory.label}</Text>
                            <Ionicons
                                name={showCategories ? "chevron-up" : "chevron-down"}
                                size={20}
                                color="rgba(255,255,255,0.5)"
                            />
                        </TouchableOpacity>

                        {showCategories && (
                            <View style={styles.categoryList}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryOption,
                                            category === cat.id && styles.categoryOptionActive
                                        ]}
                                        onPress={() => {
                                            setCategory(cat.id);
                                            setShowCategories(false);
                                        }}
                                    >
                                        <Text style={styles.categoryOptionIcon}>{cat.icon}</Text>
                                        <Text style={styles.categoryOptionText}>{cat.label}</Text>
                                        {category === cat.id && (
                                            <Ionicons name="checkmark" size={18} color="#2BAFF2" />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {/* Save/Update Button */}
                        <View style={styles.buttonRow}>
                            {isEditing && (
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={cancelEdit}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.saveBtn, isEditing && { flex: 1 }]}
                                onPress={isEditing ? handleUpdateExpense : handleLogExpense}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={isEditing ? ['#22C55E', '#16A34A'] : ['#2BAFF2', '#1F57F5']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.saveBtnGradient}
                                >
                                    <Text style={styles.saveBtnText}>
                                        {loading ? 'Saving...' : isEditing ? '✓ Update' : '+ Log Expense'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Recent Expenses */}
                <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.recentSection}>
                    <Text style={styles.sectionTitle}>Recent Expenses</Text>

                    {recentExpenses.length === 0 ? (
                        <Animated.View entering={FadeIn.delay(400)} style={styles.emptyState}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                                style={styles.emptyIconContainer}
                            >
                                <Text style={styles.emptyIcon}>📊</Text>
                            </LinearGradient>
                            <Text style={styles.emptyTitle}>No expenses logged</Text>
                            <Text style={styles.emptyText}>Start tracking your business expenses</Text>
                        </Animated.View>
                    ) : (
                        recentExpenses.map((expense, index) => (
                            <TouchableOpacity
                                key={expense.id}
                                activeOpacity={0.85}
                                onPress={() => handleExpenseTap(expense)}
                            >
                                <Animated.View
                                    entering={FadeInUp.delay(400 + index * 50)}
                                    style={styles.logItem}
                                >
                                    <LinearGradient
                                        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                                        style={styles.logItemGradient}
                                    >
                                        <View style={styles.logLeft}>
                                            <LinearGradient
                                                colors={['#2BAFF2', '#1F57F5']}
                                                style={styles.logTypeBadge}
                                            >
                                                <Ionicons name="briefcase" size={14} color="#FFF" />
                                            </LinearGradient>
                                            <View>
                                                <Text style={styles.logDesc}>{expense.description}</Text>
                                                <Text style={styles.logCategory}>{expense.category} • Tap to edit</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.logAmount}>
                                            -{formatNaira(expense.amount)}
                                        </Text>
                                    </LinearGradient>
                                </Animated.View>
                            </TouchableOpacity>
                        ))
                    )}
                </Animated.View>

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#05090E',
    },
    orbContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    orb: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    orbMain: {
        top: -100,
        right: -100,
    },
    scrollContent: {
        paddingHorizontal: 20,
    },
    header: {
        paddingTop: 60,
        marginBottom: 20,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    brandBadge: {
        width: 24,
        height: 24,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    brandIcon: {
        fontSize: 12,
    },
    brandName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#00DFFF',
        letterSpacing: 2,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 4,
    },
    summaryContainer: {
        marginBottom: 20,
    },
    summaryCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(43, 175, 242, 0.3)',
    },
    summaryCardGradient: {
        padding: 20,
        alignItems: 'flex-start',
    },
    summaryIconRow: {
        marginBottom: 12,
    },
    summaryIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '500',
    },
    summaryAmount: {
        fontSize: 32,
        fontWeight: '700',
        color: '#2BAFF2',
        marginTop: 4,
    },
    expenseCount: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 4,
    },
    formCard: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        marginBottom: 24,
    },
    formGradient: {
        padding: 20,
    },
    formHeader: {
        marginBottom: 16,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 8,
        marginTop: 16,
        fontSize: 12,
        letterSpacing: 1,
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        paddingHorizontal: 16,
    },
    inputPrefix: {
        fontSize: 24,
        color: '#2BAFF2',
        fontWeight: '600',
        marginRight: 8,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '700',
        paddingVertical: 16,
    },
    inputFull: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        color: '#FFFFFF',
        padding: 16,
        borderRadius: 14,
        fontSize: 16,
    },
    categorySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        padding: 14,
    },
    categoryIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    categoryText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
    },
    categoryList: {
        marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        overflow: 'hidden',
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    categoryOptionActive: {
        backgroundColor: 'rgba(43, 175, 242, 0.1)',
    },
    categoryOptionIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    categoryOptionText: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
    },
    saveBtn: {
        flex: 1,
        borderRadius: 14,
        overflow: 'hidden',
    },
    saveBtnGradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
    },
    recentSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    emptyIcon: {
        fontSize: 36,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    emptyText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    logItem: {
        marginBottom: 10,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    logItemGradient: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
    },
    logLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logTypeBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logDesc: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '500',
    },
    logCategory: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        marginTop: 2,
    },
    logAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FF6B6B',
    },
    // Edit mode button styles
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    cancelBtn: {
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
    },
});
