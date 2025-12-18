/**
 * KOFA Signup Screen - Create New Account
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function SignupScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { signUp } = useAuth();

    const handleSignup = async () => {
        if (!email.trim()) {
            Alert.alert('Missing Email', 'Please enter your email address');
            return;
        }
        if (!password) {
            Alert.alert('Missing Password', 'Please enter a password');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match');
            return;
        }

        setIsLoading(true);
        try {
            const result = await signUp(email.trim(), password, businessName.trim());

            if (result.success) {
                Alert.alert(
                    'Account Created! 🎉',
                    'Please check your email to verify your account.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Signup Failed', result.error || 'Please try again');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
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

            {/* Decorative orb */}
            <View style={styles.orbContainer}>
                <LinearGradient
                    colors={['rgba(31, 87, 245, 0.3)', 'transparent']}
                    style={styles.orb}
                />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Logo & Header */}
                    <View style={styles.header}>
                        <LinearGradient
                            colors={['#2BAFF2', '#1F57F5']}
                            style={styles.logoBadge}
                        >
                            <Text style={styles.logoIcon}>⚡</Text>
                        </LinearGradient>
                        <Text style={styles.brandName}>KOFA</Text>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Start managing your business today</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <Text style={styles.inputLabel}>Business Name</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="storefront-outline" size={20} color="rgba(255,255,255,0.4)" />
                            <TextInput
                                style={styles.input}
                                placeholder="Your Business Name"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={businessName}
                                onChangeText={setBusinessName}
                                textContentType="organizationName"
                                autoComplete="off"
                            />
                        </View>

                        <Text style={styles.inputLabel}>Email</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.4)" />
                            <TextInput
                                style={styles.input}
                                placeholder="you@example.com"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                textContentType="emailAddress"
                                autoComplete="email"
                            />
                        </View>

                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.4)" />
                            <TextInput
                                style={styles.input}
                                placeholder="At least 6 characters"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                textContentType="oneTimeCode"
                                autoComplete="off"
                                autoCorrect={false}
                                spellCheck={false}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons
                                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                    size={20}
                                    color="rgba(255,255,255,0.4)"
                                />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="shield-checkmark-outline" size={20} color="rgba(255,255,255,0.4)" />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirm your password"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showPassword}
                                textContentType="oneTimeCode"
                                autoComplete="off"
                                autoCorrect={false}
                                spellCheck={false}
                            />
                        </View>

                        {/* Signup Button */}
                        <TouchableOpacity
                            style={styles.signupButton}
                            onPress={handleSignup}
                            disabled={isLoading}
                        >
                            <LinearGradient
                                colors={['#2BAFF2', '#1F57F5']}
                                style={styles.signupButtonGradient}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.signupButtonText}>Create Account</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Footer Links */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account?</Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.loginLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
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
    orbContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    orb: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        top: -100,
        left: -100,
    },
    content: {
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
    logoBadge: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    logoIcon: {
        fontSize: 24,
    },
    brandName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#2BAFF2',
        letterSpacing: 4,
        marginBottom: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
    },
    form: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 8,
        marginTop: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 12,
        color: '#FFFFFF',
        fontSize: 15,
    },
    signupButton: {
        marginTop: 28,
        borderRadius: 14,
        overflow: 'hidden',
    },
    signupButtonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    signupButtonText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 15,
    },
    loginLink: {
        color: '#2BAFF2',
        fontSize: 15,
        fontWeight: '600',
    },
});
