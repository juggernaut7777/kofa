/**
 * Image Utilities
 * Compression and optimization for product photos
 */
import * as ImageManipulator from 'expo-image-manipulator';

export interface CompressedImage {
    uri: string;
    width: number;
    height: number;
    base64?: string;
}

/**
 * Compress an image for upload
 * Reduces file size while maintaining quality for product photos
 */
export async function compressImage(
    uri: string,
    options: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
        format?: 'jpeg' | 'png';
    } = {}
): Promise<CompressedImage> {
    const {
        maxWidth = 800,
        maxHeight = 800,
        quality = 0.7,
        format = 'jpeg',
    } = options;

    try {
        // First, resize to max dimensions
        const resized = await ImageManipulator.manipulateAsync(
            uri,
            [
                {
                    resize: {
                        width: maxWidth,
                        height: maxHeight,
                    },
                },
            ],
            {
                compress: quality,
                format: format === 'jpeg'
                    ? ImageManipulator.SaveFormat.JPEG
                    : ImageManipulator.SaveFormat.PNG,
            }
        );

        console.log(`[ImageUtils] Compressed: ${uri} -> ${resized.uri}`);

        return {
            uri: resized.uri,
            width: resized.width,
            height: resized.height,
        };
    } catch (error) {
        console.error('[ImageUtils] Compression failed:', error);
        // Return original if compression fails
        return { uri, width: 0, height: 0 };
    }
}

/**
 * Compress image for thumbnail (smaller version)
 */
export async function createThumbnail(uri: string): Promise<CompressedImage> {
    return compressImage(uri, {
        maxWidth: 200,
        maxHeight: 200,
        quality: 0.6,
    });
}

/**
 * Compress image for product display (medium size)
 */
export async function compressForProduct(uri: string): Promise<CompressedImage> {
    return compressImage(uri, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.75,
    });
}

/**
 * Compress image for chat/sharing (smaller)
 */
export async function compressForShare(uri: string): Promise<CompressedImage> {
    return compressImage(uri, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.65,
    });
}

/**
 * Get estimated file size category
 */
export function getFileSizeCategory(uri: string): 'small' | 'medium' | 'large' | 'unknown' {
    // This is a rough estimate based on URI length for data URIs
    // For file URIs, we'd need to check the actual file
    if (uri.startsWith('data:')) {
        const base64Length = uri.length - uri.indexOf(',') - 1;
        const sizeInBytes = (base64Length * 3) / 4;

        if (sizeInBytes < 100000) return 'small';     // <100KB
        if (sizeInBytes < 500000) return 'medium';    // <500KB
        return 'large';                                // >500KB
    }
    return 'unknown';
}

export default {
    compressImage,
    createThumbnail,
    compressForProduct,
    compressForShare,
    getFileSizeCategory,
};
