import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getBotStyle, setBotStyle, getVendorSettings, updatePaymentAccount, PaymentAccount, getBotStatus, toggleBotPause } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function SettingsScreen() {
    const [botStyle, setBotStyleState] = useState<'corporate' | 'street'>('corporate');
    const [isLoading, setIsLoading] = useState(false);

    // Payment account state
    const [paymentAccount, setPaymentAccount] = useState<PaymentAccount>({
        bank_name: '',
        account_number: '',
        account_name: '',
    });
    const [isSavingAccount, setIsSavingAccount] = useState(false);
    const [isAccountDirty, setIsAccountDirty] = useState(false);

    // Bot pause state
    const [isBotPaused, setIsBotPaused] = useState(false);
    const [isTogglingPause, setIsTogglingPause] = useState(false);
    const [activeSilences, setActiveSilences] = useState(0);

    // Auth
    const { signOut, user } = useAuth();

    // Social connections state
    const [socialConnections, setSocialConnections] = useState({
        whatsapp: false,
        instagram: false,
        tiktok: false,
    });

    // Pulsing animation for active indicator
    const pulseOpacity = useSharedValue(1);

    useEffect(() => {
        if (!isBotPaused) {
            pulseOpacity.value = withRepeat(withTiming(0.3, { duration: 1000 }), -1, true);
        } else {
            pulseOpacity.value = 1;
        }
    }, [isBotPaused]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    useEffect(() => {
        loadBotStyle();
        loadVendorSettings();
        loadBotStatus();
    }, []);

    const loadBotStyle = async () => {
        try {
            const result = await getBotStyle();
            setBotStyleState(result.current_style as 'corporate' | 'street');
        } catch (error) {
            console.error('Error loading bot style:', error);
        }
    };

    const loadVendorSettings = async () => {
        try {
            const result = await getVendorSettings();
            if (result.settings?.payment_account) {
                setPaymentAccount(result.settings.payment_account);
            }
        } catch (error) {
            console.error('Error loading vendor settings:', error);
        }
    };

    const loadBotStatus = async () => {
        try {
            const status = await getBotStatus();
            setIsBotPaused(status.is_paused);
            setActiveSilences(status.active_silences || 0);
        } catch (error) {
            console.error('Error loading bot status:', error);
        }
    };

    const handleToggleBotPause = async (newValue: boolean) => {
        setIsTogglingPause(true);
        try {
            await toggleBotPause(newValue);
            setIsBotPaused(newValue);
            Alert.alert(
                newValue ? 'KOFA Paused ⏸️' : 'KOFA Resumed 🤖',
                newValue
                    ? 'Your bot will not reply to any customers until you resume.'
                    : 'Your bot is now active and will auto-reply to customers.'
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to update bot status. Please try again.');
        } finally {
            setIsTogglingPause(false);
        }
    };

    const handleToggleBotStyle = async () => {
        const newStyle = botStyle === 'corporate' ? 'street' : 'corporate';
        setIsLoading(true);
        try {
            await setBotStyle(newStyle);
            setBotStyleState(newStyle);
            Alert.alert(
                'Bot Style Updated ✅',
                newStyle === 'corporate'
                    ? 'Your bot will now respond professionally in formal English.'
                    : 'Your bot will now respond in Nigerian Pidgin for a more casual feel.'
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to update bot style. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePaymentAccount = async () => {
        if (!paymentAccount.bank_name.trim() || !paymentAccount.account_number.trim() || !paymentAccount.account_name.trim()) {
            Alert.alert('Missing Info', 'Please fill in all payment account fields');
            return;
        }

        setIsSavingAccount(true);
        try {
            await updatePaymentAccount(paymentAccount);
            setIsAccountDirty(false);
            Alert.alert('Saved! ✅', 'Your payment account has been updated. Buyers will see this when making purchases.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save payment account. Please try again.');
        } finally {
            setIsSavingAccount(false);
        }
    };

    const updateAccountField = (field: keyof PaymentAccount, value: string) => {
        setPaymentAccount(prev => ({ ...prev, [field]: value }));
        setIsAccountDirty(true);
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#05090E', '#0D1117', '#05090E']} style={StyleSheet.absoluteFillObject} />

            <View style={styles.orbContainer}>
                <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'transparent']} style={[styles.orb, styles.orbGreen]} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <AnimatedView entering={FadeInDown.springify()} style={styles.header}>
                    <View style={styles.brandRow}>
                        <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.brandBadge}>
                            <Text style={styles.brandIcon}>⚡</Text>
                        </LinearGradient>
                        <Text style={styles.brandName}>KOFA</Text>
                    </View>
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.subtitle}>Customize your experience</Text>
                </AnimatedView>

                {/* Payment Account Section */}
                <AnimatedView entering={FadeInUp.delay(50).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>💳 Payment Account</Text>
                    <Text style={styles.sectionDesc}>Your bank details for receiving payments from buyers</Text>

                    <View style={styles.card}>
                        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.formGradient}>
                            <Text style={styles.inputLabel}>Bank Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. GTBank, Access Bank"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={paymentAccount.bank_name}
                                onChangeText={(v) => updateAccountField('bank_name', v)}
                            />

                            <Text style={styles.inputLabel}>Account Number</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0123456789"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="numeric"
                                maxLength={10}
                                value={paymentAccount.account_number}
                                onChangeText={(v) => updateAccountField('account_number', v)}
                            />

                            <Text style={styles.inputLabel}>Account Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Your account name"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={paymentAccount.account_name}
                                onChangeText={(v) => updateAccountField('account_name', v)}
                            />

                            <TouchableOpacity
                                style={[styles.saveButton, !isAccountDirty && styles.saveButtonDisabled]}
                                onPress={handleSavePaymentAccount}
                                disabled={isSavingAccount || !isAccountDirty}
                            >
                                <LinearGradient
                                    colors={isAccountDirty ? ['#22C55E', '#16A34A'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                    style={styles.saveButtonGradient}
                                >
                                    <Ionicons name="save" size={18} color={isAccountDirty ? '#000' : '#666'} />
                                    <Text style={[styles.saveButtonText, !isAccountDirty && styles.saveButtonTextDisabled]}>
                                        {isSavingAccount ? 'Saving...' : 'Save Account'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </AnimatedView>

                {/* Bot Control Section */}
                <AnimatedView entering={FadeInUp.delay(100).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>🤖 Bot Control</Text>
                    <Text style={styles.sectionDesc}>Control when KOFA replies to your customers</Text>

                    <View style={styles.card}>
                        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.cardGradient}>
                            <View style={styles.botControlRow}>
                                <View style={styles.botControlLeft}>
                                    <View style={styles.botStatusContainer}>
                                        <Animated.View style={[styles.statusDot, isBotPaused ? styles.statusDotPaused : styles.statusDotActive, !isBotPaused && pulseStyle]} />
                                        <Text style={styles.botStatusText}>
                                            {isBotPaused ? 'PAUSED' : 'ACTIVE'}
                                        </Text>
                                    </View>
                                    <Text style={styles.botControlDesc}>
                                        {isBotPaused
                                            ? 'Bot is silent. Customers won\'t get auto-replies.'
                                            : `Bot is replying automatically.${activeSilences > 0 ? ` (${activeSilences} silenced)` : ''}`}
                                    </Text>
                                </View>
                                <Switch
                                    value={!isBotPaused}
                                    onValueChange={(active) => handleToggleBotPause(!active)}
                                    disabled={isTogglingPause}
                                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#22C55E' }}
                                    thumbColor={isBotPaused ? '#666' : '#fff'}
                                />
                            </View>
                        </LinearGradient>
                    </View>

                    <View style={styles.botInfoBox}>
                        <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.botInfoText}>
                            Auto-silence: When you type in WhatsApp/IG, bot goes quiet for 30 mins
                        </Text>
                    </View>
                </AnimatedView>

                {/* Bot Personality Section */}
                <AnimatedView entering={FadeInUp.delay(150).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>🤖 Bot Personality</Text>
                    <Text style={styles.sectionDesc}>Choose how your AI sales bot communicates with customers</Text>

                    <View style={styles.card}>
                        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.cardGradient}>
                            {/* Corporate Option */}
                            <TouchableOpacity
                                style={[styles.optionRow, botStyle === 'corporate' && styles.optionRowActive]}
                                onPress={() => botStyle !== 'corporate' && handleToggleBotStyle()}
                                disabled={isLoading}
                            >
                                <View style={styles.optionLeft}>
                                    <LinearGradient
                                        colors={botStyle === 'corporate' ? ['#2BAFF2', '#1F57F5'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                        style={styles.optionIcon}
                                    >
                                        <Ionicons name="briefcase" size={20} color={botStyle === 'corporate' ? '#000' : '#888'} />
                                    </LinearGradient>
                                    <View>
                                        <Text style={styles.optionTitle}>Professional</Text>
                                        <Text style={styles.optionDesc}>Formal English, business-appropriate</Text>
                                    </View>
                                </View>
                                {botStyle === 'corporate' && (
                                    <View style={styles.checkmark}>
                                        <Ionicons name="checkmark-circle" size={24} color="#2BAFF2" />
                                    </View>
                                )}
                            </TouchableOpacity>

                            <View style={styles.optionDivider} />

                            {/* Street/Nigerian Option */}
                            <TouchableOpacity
                                style={[styles.optionRow, botStyle === 'street' && styles.optionRowActive]}
                                onPress={() => botStyle !== 'street' && handleToggleBotStyle()}
                                disabled={isLoading}
                            >
                                <View style={styles.optionLeft}>
                                    <LinearGradient
                                        colors={botStyle === 'street' ? ['#00DFFF', '#2BAFF2'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                                        style={styles.optionIcon}
                                    >
                                        <Text style={{ fontSize: 18 }}>🇳🇬</Text>
                                    </LinearGradient>
                                    <View>
                                        <Text style={styles.optionTitle}>Nigerian Pidgin</Text>
                                        <Text style={styles.optionDesc}>Casual, friendly, local vibes</Text>
                                    </View>
                                </View>
                                {botStyle === 'street' && (
                                    <View style={styles.checkmark}>
                                        <Ionicons name="checkmark-circle" size={24} color="#00DFFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>

                    {/* Preview Box */}
                    <View style={styles.previewBox}>
                        <Text style={styles.previewLabel}>Preview:</Text>
                        <Text style={styles.previewText}>
                            {botStyle === 'corporate'
                                ? '"Hello! We have Premium Red Sneakers available for ₦45,000. Would you like to purchase?"'
                                : '"How far! We get Premium Red Sneakers for 45k. You wan buy am?"'}
                        </Text>
                    </View>
                </AnimatedView>

                {/* About Section */}
                <AnimatedView entering={FadeInUp.delay(250).springify()} style={styles.section}>
                    <Text style={styles.sectionTitle}>ℹ️ About KOFA</Text>

                    <View style={styles.card}>
                        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.cardGradient}>
                            <View style={styles.aboutRow}>
                                <Text style={styles.aboutLabel}>Version</Text>
                                <Text style={styles.aboutValue}>2.0.0</Text>
                            </View>
                            <View style={styles.optionDivider} />
                            <View style={styles.aboutRow}>
                                <Text style={styles.aboutLabel}>Backend</Text>
                                <Text style={styles.aboutValue}>kofa-dhko.onrender.com</Text>
                            </View>
                        </LinearGradient>
                    </View>
                </AnimatedView>

                {/* Connected Accounts Section */}
                <AnimatedView entering={FadeInDown.delay(400)} style={styles.section}>
                    <Text style={styles.sectionTitle}>Connected Accounts</Text>
                    <Text style={styles.sectionDesc}>Link your social platforms for automated responses</Text>

                    <View style={styles.card}>
                        <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.cardGradient}>
                            {/* WhatsApp - Meta Business */}
                            <TouchableOpacity
                                style={styles.socialRow}
                                onPress={() => {
                                    Alert.alert(
                                        '💬 Connect WhatsApp Business',
                                        'To connect your WhatsApp Business number to KOFA:\n\n' +
                                        '1. You need a Meta Business Account\n' +
                                        '2. Complete the Meta verification process\n' +
                                        '3. Your bot will auto-reply to customers 24/7\n\n' +
                                        'Benefits:\n' +
                                        '• Automated sales responses\n' +
                                        '• Receipt generation\n' +
                                        '• Order status updates\n' +
                                        '• Bulk messaging to customers',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Learn More',
                                                onPress: () => Alert.alert(
                                                    'Setup Instructions',
                                                    '1. Go to business.facebook.com\n' +
                                                    '2. Create a Meta Business Account\n' +
                                                    '3. Add your WhatsApp number\n' +
                                                    '4. Get verified (1-3 days)\n' +
                                                    '5. Return here to connect!\n\n' +
                                                    'KOFA uses Meta\'s Embedded Signup to securely connect your number.'
                                                )
                                            }
                                        ]
                                    );
                                }}
                            >
                                <View style={[styles.socialIcon, { backgroundColor: 'rgba(37, 211, 102, 0.2)' }]}>
                                    <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
                                </View>
                                <View style={styles.socialInfo}>
                                    <Text style={styles.socialName}>WhatsApp Business</Text>
                                    <Text style={styles.socialStatus}>
                                        {socialConnections.whatsapp ? '✓ Connected' : 'Tap to connect'}
                                    </Text>
                                </View>
                                <View style={[styles.connectionBadge, socialConnections.whatsapp && styles.connectionBadgeActive]}>
                                    <Text style={[styles.connectionBadgeText, socialConnections.whatsapp && styles.connectionBadgeTextActive]}>
                                        {socialConnections.whatsapp ? 'Active' : 'Connect'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.optionDivider} />

                            {/* Instagram */}
                            <TouchableOpacity
                                style={styles.socialRow}
                                onPress={() => Alert.alert('Instagram Business', 'Instagram Business API integration coming soon! Connect your Instagram account to enable automated DM responses.')}
                            >
                                <View style={[styles.socialIcon, { backgroundColor: 'rgba(225, 48, 165, 0.2)' }]}>
                                    <Ionicons name="logo-instagram" size={22} color="#E130A5" />
                                </View>
                                <View style={styles.socialInfo}>
                                    <Text style={styles.socialName}>Instagram Business</Text>
                                    <Text style={styles.socialStatus}>
                                        {socialConnections.instagram ? '✓ Connected' : 'Not connected'}
                                    </Text>
                                </View>
                                <View style={[styles.connectionBadge, socialConnections.instagram && styles.connectionBadgeActive]}>
                                    <Text style={[styles.connectionBadgeText, socialConnections.instagram && styles.connectionBadgeTextActive]}>
                                        {socialConnections.instagram ? 'Active' : 'Connect'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            <View style={styles.optionDivider} />

                            {/* TikTok */}
                            <TouchableOpacity
                                style={styles.socialRow}
                                onPress={() => Alert.alert('TikTok Shop', 'TikTok Shop integration coming soon! Connect to manage your TikTok storefront and messages.')}
                            >
                                <View style={[styles.socialIcon, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                    <Ionicons name="musical-notes" size={22} color="#FFF" />
                                </View>
                                <View style={styles.socialInfo}>
                                    <Text style={styles.socialName}>TikTok Shop</Text>
                                    <Text style={styles.socialStatus}>
                                        {socialConnections.tiktok ? '✓ Connected' : 'Not connected'}
                                    </Text>
                                </View>
                                <View style={[styles.connectionBadge, socialConnections.tiktok && styles.connectionBadgeActive]}>
                                    <Text style={[styles.connectionBadgeText, socialConnections.tiktok && styles.connectionBadgeTextActive]}>
                                        {socialConnections.tiktok ? 'Active' : 'Connect'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </AnimatedView>

                {/* Logout Section */}
                <AnimatedView entering={FadeInDown.delay(500)} style={styles.section}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={() => {
                            Alert.alert(
                                'Sign Out',
                                'Are you sure you want to sign out?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Sign Out',
                                        style: 'destructive',
                                        onPress: async () => {
                                            await signOut();
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                        <Text style={styles.logoutButtonText}>Sign Out</Text>
                    </TouchableOpacity>
                    {user?.email && (
                        <Text style={styles.userEmail}>Signed in as {user.email}</Text>
                    )}
                </AnimatedView>

                <View style={{ height: 120 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#05090E' },
    orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
    orbGreen: { top: -100, right: -100 },
    scrollContent: { paddingHorizontal: 20 },
    header: { paddingTop: 60, marginBottom: 24 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    brandBadge: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    brandIcon: { fontSize: 12 },
    brandName: { fontSize: 13, fontWeight: '800', color: '#2BAFF2', letterSpacing: 2 },
    title: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 6 },
    sectionDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 },
    card: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { padding: 6 },
    formGradient: { padding: 16 },
    inputLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
    input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    saveButton: { marginTop: 20, borderRadius: 12, overflow: 'hidden' },
    saveButtonDisabled: { opacity: 0.6 },
    saveButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
    saveButtonText: { color: '#000', fontWeight: '700', fontSize: 15 },
    saveButtonTextDisabled: { color: '#666' },
    optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14 },
    optionRowActive: { backgroundColor: 'rgba(43, 175, 242, 0.1)' },
    optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    optionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    optionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
    optionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    optionDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 14 },
    checkmark: {},
    previewBox: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    previewLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    previewText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 22 },
    aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    aboutLabel: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
    aboutValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
    // Bot control styles
    botControlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    botControlLeft: { flex: 1, marginRight: 16 },
    botStatusContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    statusDotActive: { backgroundColor: '#22C55E' },
    statusDotPaused: { backgroundColor: '#EF4444' },
    botStatusText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)', letterSpacing: 1 },
    botControlDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
    botInfoBox: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, gap: 8 },
    botInfoText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18 },
    // Social connection styles
    socialRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    socialIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    socialInfo: { flex: 1 },
    socialName: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
    socialStatus: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    connectionBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    connectionBadgeActive: { backgroundColor: 'rgba(34, 197, 94, 0.2)', borderColor: 'rgba(34, 197, 94, 0.3)' },
    connectionBadgeText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
    connectionBadgeTextActive: { color: '#22C55E' },
    // Logout styles
    logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', gap: 8 },
    logoutButtonText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
    userEmail: { textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 12 },
});

