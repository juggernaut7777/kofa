/**
 * KOFA Onboarding Setup - Business Setup Wizard
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function OnboardingSetup() {
    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { completeOnboarding } = useAuth();

    const handleComplete = async () => {
        if (!businessName.trim()) {
            Alert.alert('Missing Info', 'Please enter your business name');
            return;
        }

        setIsLoading(true);
        try {
            // TODO: Save business info to backend
            // For now, just mark onboarding as complete
            await completeOnboarding();

            // Router will automatically redirect to (tabs) via _layout.tsx
        } catch (error) {
            Alert.alert('Error', 'Failed to save. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#05090E', '#0D1117', '#05090E']}
                style={StyleSheet.absoluteFillObject}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <LinearGradient
                            colors={['#2BAFF2', '#1F57F5']}
                            style={styles.iconBadge}
                        >
                            <Ionicons name="storefront" size={28} color="#FFF" />
                        </LinearGradient>
                        <Text style={styles.title}>Set Up Your Business</Text>
                        <Text style={styles.subtitle}>Tell us about your business to get started</Text>
                    </View>

                    {/* Business Info Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📍 Business Info</Text>

                        <Text style={styles.inputLabel}>Business Name *</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Sarah's Fashion Hub"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={businessName}
                                onChangeText={setBusinessName}
                                textContentType="organizationName"
                                autoComplete="off"
                            />
                        </View>

                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="+234 XXX XXX XXXX"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                textContentType="telephoneNumber"
                                autoComplete="tel"
                            />
                        </View>

                        <Text style={styles.inputLabel}>Business Address</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Your shop or delivery address"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={address}
                                onChangeText={setAddress}
                                textContentType="streetAddressLine1"
                                autoComplete="street-address"
                            />
                        </View>
                    </View>

                    {/* Complete Button */}
                    <TouchableOpacity
                        style={styles.completeButton}
                        onPress={handleComplete}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={['#2BAFF2', '#1F57F5']}
                            style={styles.completeButtonGradient}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Text style={styles.completeButtonText}>Complete Setup</Text>
                                    <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.skipHint}>You can update these later in Settings</Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#05090E',
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconBadge: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    sectionHint: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 8,
        marginTop: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputContainer: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        height: 54,
        justifyContent: 'center',
    },
    input: {
        height: 54,
        paddingVertical: 0,
        paddingHorizontal: 16,
        color: '#FFFFFF',
        fontSize: 15,
    },
    completeButton: {
        marginTop: 24,
        borderRadius: 14,
        overflow: 'hidden',
    },
    completeButtonGradient: {
        flexDirection: 'row',
        paddingVertical: 18,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    completeButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    skipHint: {
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        marginTop: 16,
    },
});
