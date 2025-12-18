/**
 * Voice Search Component
 * Allows searching products by speaking
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

interface VoiceSearchProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export default function VoiceSearch({ onSearch, placeholder = 'Search products...' }: VoiceSearchProps) {
    const [searchText, setSearchText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const pulseScale = useSharedValue(1);

    // Pulse animation when listening
    useEffect(() => {
        if (isListening) {
            pulseScale.value = withRepeat(withTiming(1.2, { duration: 500 }), -1, true);
        } else {
            pulseScale.value = withTiming(1, { duration: 200 });
        }
    }, [isListening]);

    const animatedPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const handleTextChange = (text: string) => {
        setSearchText(text);
        onSearch(text);
    };

    const startVoiceSearch = async () => {
        // Note: expo-speech is for text-to-speech, not speech-to-text
        // For actual voice search, we'd need expo-av or a speech recognition library
        // This is a placeholder that shows the UI pattern

        setIsListening(true);

        // Simulate voice recognition with a timeout
        // In production, use @react-native-voice/voice or similar
        Alert.alert(
            '🎤 Voice Search',
            'Voice recognition requires expo-av setup.\n\nFor now, type your search or say it will be implemented with full speech-to-text API.',
            [
                {
                    text: 'OK',
                    onPress: () => setIsListening(false),
                }
            ]
        );
    };

    const clearSearch = () => {
        setSearchText('');
        onSearch('');
    };

    return (
        <Animated.View entering={FadeIn.delay(100)} style={styles.container}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={searchText}
                    onChangeText={handleTextChange}
                    returnKeyType="search"
                />
                {searchText.length > 0 && (
                    <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                        <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={startVoiceSearch} style={styles.voiceButton}>
                    <Animated.View style={[styles.voiceButtonInner, isListening && animatedPulseStyle]}>
                        <LinearGradient
                            colors={isListening ? ['#EF4444', '#DC2626'] : ['#2BAFF2', '#1F57F5']}
                            style={styles.voiceGradient}
                        >
                            <Ionicons name={isListening ? 'mic' : 'mic-outline'} size={18} color="#FFF" />
                        </LinearGradient>
                    </Animated.View>
                </TouchableOpacity>
            </View>
            {isListening && (
                <Text style={styles.listeningText}>🎤 Listening...</Text>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { marginHorizontal: 20, marginBottom: 16 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingLeft: 14,
    },
    searchIcon: { marginRight: 8 },
    input: {
        flex: 1,
        paddingVertical: 14,
        color: '#FFFFFF',
        fontSize: 15,
    },
    clearButton: { padding: 10 },
    voiceButton: { paddingRight: 6 },
    voiceButtonInner: {},
    voiceGradient: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listeningText: {
        textAlign: 'center',
        color: '#EF4444',
        fontSize: 12,
        marginTop: 8,
        fontWeight: '600',
    },
});
