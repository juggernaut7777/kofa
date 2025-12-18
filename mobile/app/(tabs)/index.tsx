import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform, Image, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, shadows, borderRadius, spacing } from '@/constants';
import { fetchProducts, formatNaira, Product, createProduct, NewProduct, updateProduct, restockProduct, uploadProductImage } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';
import VoiceSearch from '@/components/VoiceSearch';
import { compressForProduct } from '@/lib/imageUtils';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function getStockStatus(level: number): { color: string; label: string; bgColor: string; icon: string } {
  if (level === 0) {
    return { color: '#EF4444', label: 'Out of Stock', bgColor: 'rgba(239, 68, 68, 0.15)', icon: '⚠️' };
  } else if (level <= 5) {
    return { color: '#EF4444', label: 'Critical', bgColor: 'rgba(239, 68, 68, 0.15)', icon: '🔴' };
  } else if (level <= 15) {
    return { color: '#F59E0B', label: 'Low Stock', bgColor: 'rgba(245, 158, 11, 0.15)', icon: '🟠' };
  }
  return { color: '#22C55E', label: 'In Stock', bgColor: 'rgba(34, 197, 94, 0.15)', icon: '🟢' };
}

const CATEGORIES = ['Footwear', 'Clothing', 'Accessories', 'Electronics', 'Food', 'Other'];

export default function InventoryScreen() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [editForm, setEditForm] = React.useState({ name: '', price_ngn: 0, stock_level: 0, description: '' });
  const [editImage, setEditImage] = React.useState<string | null>(null);

  // Restock modal state
  const [showRestockModal, setShowRestockModal] = React.useState(false);
  const [restockingProduct, setRestockingProduct] = React.useState<Product | null>(null);
  const [restockQuantity, setRestockQuantity] = React.useState('');

  // Form state for new product
  const [newProduct, setNewProduct] = React.useState<NewProduct>({
    name: '',
    price_ngn: 0,
    stock_level: 0,
    description: '',
    category: 'Other',
    voice_tags: [],
  });
  const [voiceTagsInput, setVoiceTagsInput] = React.useState('');
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);

  // Pick image from gallery
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos to add product images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  React.useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadProducts().finally(() => setRefreshing(false));
  }, []);

  // Open Edit Modal
  const handleEditPress = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      price_ngn: product.price_ngn,
      stock_level: product.stock_level,
      description: product.description || '',
    });
    setEditImage(product.image_url || null);
    setShowEditModal(true);
  };

  // Pick image for edit
  const pickEditImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEditImage(result.assets[0].uri);
    }
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    setIsSubmitting(true);
    try {
      await updateProduct(editingProduct.id, {
        name: editForm.name,
        price_ngn: editForm.price_ngn,
        stock_level: editForm.stock_level,
        description: editForm.description,
      });

      // Upload new image if changed (local URI starts with 'file://' or similar)
      if (editImage && editImage !== editingProduct.image_url && !editImage.startsWith('http')) {
        try {
          // Compress image before upload
          const compressed = await compressForProduct(editImage);
          await uploadProductImage(editingProduct.id, compressed.uri, `${editForm.name.replace(/\s+/g, '_')}.jpg`);
        } catch (imgError) {
          console.error('Image upload failed:', imgError);
        }
      }

      setShowEditModal(false);
      setEditingProduct(null);
      setEditImage(null);
      loadProducts();
      Alert.alert('Updated! ✅', 'Product has been updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Restock Modal
  const handleRestockPress = (product: Product) => {
    setRestockingProduct(product);
    setRestockQuantity('');
    setShowRestockModal(true);
  };

  // Save Restock
  const handleSaveRestock = async () => {
    if (!restockingProduct) return;
    const qty = parseInt(restockQuantity) || 0;
    if (qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a quantity greater than 0');
      return;
    }
    setIsSubmitting(true);
    try {
      await restockProduct(restockingProduct.id, qty);
      setShowRestockModal(false);
      setRestockingProduct(null);
      loadProducts();
      Alert.alert('Restocked! 📦', `Added ${qty} units to ${restockingProduct.name}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to restock. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) {
      Alert.alert('Missing Info', 'Please enter a product name');
      return;
    }
    if (newProduct.price_ngn <= 0) {
      Alert.alert('Missing Info', 'Please enter a valid price');
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = voiceTagsInput.split(',').map(t => t.trim()).filter(t => t);
      const result = await createProduct({
        ...newProduct,
        voice_tags: tags.length > 0 ? tags : [newProduct.name.toLowerCase()],
      });

      // Upload image if selected (with compression)
      if (selectedImage && result.product?.id) {
        setIsUploadingImage(true);
        try {
          // Compress image before upload
          const compressed = await compressForProduct(selectedImage);
          await uploadProductImage(result.product.id, compressed.uri, `${newProduct.name.replace(/\s+/g, '_')}.jpg`);
        } catch (imgError) {
          console.error('Image upload failed:', imgError);
          // Product still created, just image failed
        }
        setIsUploadingImage(false);
      }

      // Reset form and close modal
      setNewProduct({ name: '', price_ngn: 0, stock_level: 0, description: '', category: 'Other', voice_tags: [] });
      setVoiceTagsInput('');
      setSelectedImage(null);
      setShowAddModal(false);

      // Refresh product list
      loadProducts();
      Alert.alert('Success! ✅', `"${newProduct.name}" added to inventory${selectedImage ? ' with photo' : ''}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add product. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  // Calculate stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.stock_level > 0 && p.stock_level <= 10).length;
  const outOfStockCount = products.filter(p => p.stock_level === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.price_ngn * p.stock_level), 0);

  // Filter products by search query
  const filteredProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.voice_tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const renderProduct = ({ item, index }: { item: Product; index: number }) => {
    const stockStatus = getStockStatus(item.stock_level);

    return (
      <AnimatedTouchable
        entering={FadeInUp.delay(index * 60).springify()}
        style={styles.productCard}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.productRow}>
            {item.image_url ? (
              <Image
                source={{ uri: item.image_url }}
                style={styles.productImage}
              />
            ) : (
              <LinearGradient
                colors={['#2BAFF2', '#1F57F5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.productIcon}
              >
                <Text style={styles.iconEmoji}>📦</Text>
              </LinearGradient>
            )}

            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.currencySymbol}>₦</Text>
                <Text style={styles.productPrice}>{item.price_ngn.toLocaleString()}</Text>
              </View>
            </View>

            <View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor }]}>
              <Text style={styles.stockIcon}>{stockStatus.icon}</Text>
              <Text style={[styles.stockLevel, { color: stockStatus.color }]}>{item.stock_level}</Text>
            </View>
          </View>

          {item.voice_tags && item.voice_tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.voice_tags.slice(0, 3).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleEditPress(item)}>
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.actionDivider} />
            <TouchableOpacity style={styles.actionButton} onPress={() => handleRestockPress(item)}>
              <Text style={styles.actionIcon}>📦</Text>
              <Text style={styles.actionText}>Restock</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </AnimatedTouchable>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#05090E', '#0D1117', '#05090E']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.orbContainer}>
        <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'transparent']} style={[styles.orb, styles.orbGreen]} />
        <LinearGradient colors={['rgba(0, 223, 255, 0.15)', 'transparent']} style={[styles.orb, styles.orbGold]} />
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
          <Text style={styles.title}>Inventory</Text>
          <Text style={styles.subtitle}>Manage your products</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.addButtonGradient}>
            <Ionicons name="add" size={18} color="#000" />
            <Text style={styles.addButtonText}>Add Product</Text>
          </LinearGradient>
        </TouchableOpacity>
      </AnimatedView>

      {/* Stats Cards */}
      <AnimatedView entering={FadeInUp.delay(100).springify()} style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statCardPrimary]}>
            <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'rgba(43, 175, 242, 0.05)']} style={styles.statCardGradient}>
              <Text style={styles.statEmoji}>📦</Text>
              <Text style={styles.statValue}>{totalProducts}</Text>
              <Text style={styles.statLabel}>Products</Text>
            </LinearGradient>
          </View>
          <View style={[styles.statCard, lowStockCount > 0 && styles.statCardWarning]}>
            <LinearGradient colors={lowStockCount > 0 ? ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.statCardGradient}>
              <Text style={styles.statEmoji}>⚡</Text>
              <Text style={[styles.statValue, lowStockCount > 0 && styles.statValueWarning]}>{lowStockCount}</Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </LinearGradient>
          </View>
          <View style={[styles.statCard, outOfStockCount > 0 && styles.statCardDanger]}>
            <LinearGradient colors={outOfStockCount > 0 ? ['rgba(239, 68, 68, 0.2)', 'rgba(239, 68, 68, 0.05)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']} style={styles.statCardGradient}>
              <Text style={styles.statEmoji}>🚫</Text>
              <Text style={[styles.statValue, outOfStockCount > 0 && styles.statValueDanger]}>{outOfStockCount}</Text>
              <Text style={styles.statLabel}>Out</Text>
            </LinearGradient>
          </View>
          <View style={styles.statCard}>
            <LinearGradient colors={['rgba(0, 223, 255, 0.15)', 'rgba(0, 223, 255, 0.03)']} style={styles.statCardGradient}>
              <Text style={styles.statEmoji}>💰</Text>
              <Text style={styles.statValueSmall}>{formatNaira(totalValue)}</Text>
              <Text style={styles.statLabel}>Value</Text>
            </LinearGradient>
          </View>
        </View>
      </AnimatedView>

      {/* Voice Search */}
      <VoiceSearch
        onSearch={setSearchQuery}
        placeholder="Search products by name or voice tags..."
      />

      {/* Section Title */}
      <AnimatedView entering={FadeIn.delay(200)} style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {searchQuery ? `Results (${filteredProducts.length})` : 'All Products'}
        </Text>
      </AnimatedView>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.productList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2BAFF2" colors={['#2BAFF2']} />
        }
        ListEmptyComponent={
          <AnimatedView entering={FadeIn.delay(300)} style={styles.emptyState}>
            <LinearGradient colors={['rgba(43, 175, 242, 0.2)', 'rgba(43, 175, 242, 0.05)']} style={styles.emptyIconContainer}>
              <Text style={styles.emptyEmoji}>{searchQuery ? '🔍' : '📦'}</Text>
            </LinearGradient>
            <Text style={styles.emptyTitle}>{searchQuery ? 'No results found' : 'No products yet'}</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? `Try a different search term` : 'Tap "Add Product" above to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
                <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.emptyButtonGradient}>
                  <Text style={styles.emptyButtonText}>+ Add First Product</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </AnimatedView>
        }
      />

      {/* Add Product Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#0D1117', '#05090E']} style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Product</Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                {/* Product Photo */}
                <Text style={styles.inputLabel}>Product Photo</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera" size={32} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.imagePickerText}>Tap to add photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {selectedImage && (
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImage(null)}>
                    <Text style={styles.removeImageText}>Remove Photo</Text>
                  </TouchableOpacity>
                )}

                {/* Product Name */}
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Premium Red Sneakers"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newProduct.name}
                  onChangeText={(text) => setNewProduct(p => ({ ...p, name: text }))}
                />

                {/* Price */}
                <Text style={styles.inputLabel}>Price (₦) *</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.pricePrefix}>₦</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="numeric"
                    value={newProduct.price_ngn > 0 ? newProduct.price_ngn.toString() : ''}
                    onChangeText={(text) => setNewProduct(p => ({ ...p, price_ngn: parseInt(text) || 0 }))}
                  />
                </View>

                {/* Stock */}
                <Text style={styles.inputLabel}>Initial Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={newProduct.stock_level > 0 ? newProduct.stock_level.toString() : ''}
                  onChangeText={(text) => setNewProduct(p => ({ ...p, stock_level: parseInt(text) || 0 }))}
                />

                {/* Category */}
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, newProduct.category === cat && styles.categoryChipActive]}
                      onPress={() => setNewProduct(p => ({ ...p, category: cat }))}
                    >
                      <Text style={[styles.categoryChipText, newProduct.category === cat && styles.categoryChipTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Description */}
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your product..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline
                  numberOfLines={3}
                  value={newProduct.description}
                  onChangeText={(text) => setNewProduct(p => ({ ...p, description: text }))}
                />

                {/* Voice Tags */}
                <Text style={styles.inputLabel}>Voice Tags (for search)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="sneakers, kicks, red shoes (comma separated)"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={voiceTagsInput}
                  onChangeText={setVoiceTagsInput}
                />
                <Text style={styles.inputHint}>Helps customers find this product by voice or text search</Text>

                {/* Submit Button */}
                <TouchableOpacity style={styles.submitButton} onPress={handleAddProduct} disabled={isSubmitting}>
                  <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.submitButtonGradient}>
                    <Text style={styles.submitButtonText}>{isSubmitting ? 'Adding...' : '+ Add Product'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Product Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient colors={['#0D1117', '#05090E']} style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Product</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                {/* Product Photo */}
                <Text style={styles.inputLabel}>Product Photo</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickEditImage}>
                  {editImage ? (
                    <Image source={{ uri: editImage }} style={styles.selectedImage} />
                  ) : (
                    <View style={styles.imagePickerPlaceholder}>
                      <Ionicons name="camera" size={32} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.imagePickerText}>Tap to add photo</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {editImage && (
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => setEditImage(null)}>
                    <Text style={styles.removeImageText}>Remove Photo</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.inputLabel}>Product Name</Text>
                <TextInput
                  style={styles.input}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm(f => ({ ...f, name: text }))}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />

                <Text style={styles.inputLabel}>Price (₦)</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.pricePrefix}>₦</Text>
                  <TextInput
                    style={styles.priceInput}
                    keyboardType="numeric"
                    value={editForm.price_ngn > 0 ? editForm.price_ngn.toString() : ''}
                    onChangeText={(text) => setEditForm(f => ({ ...f, price_ngn: parseInt(text) || 0 }))}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                </View>

                <Text style={styles.inputLabel}>Stock Level</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={editForm.stock_level > 0 ? editForm.stock_level.toString() : ''}
                  onChangeText={(text) => setEditForm(f => ({ ...f, stock_level: parseInt(text) || 0 }))}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  value={editForm.description}
                  onChangeText={(text) => setEditForm(f => ({ ...f, description: text }))}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleSaveEdit} disabled={isSubmitting}>
                  <LinearGradient colors={['#2BAFF2', '#1F57F5']} style={styles.submitButtonGradient}>
                    <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : '✓ Save Changes'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
              </ScrollView>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Restock Modal */}
      <Modal visible={showRestockModal} animationType="fade" transparent>
        <View style={styles.restockOverlay}>
          <View style={styles.restockContainer}>
            <LinearGradient colors={['#0D1117', '#05090E']} style={styles.restockContent}>
              <Text style={styles.restockTitle}>📦 Restock Product</Text>
              <Text style={styles.restockProductName}>{restockingProduct?.name}</Text>
              <Text style={styles.restockCurrentStock}>Current Stock: {restockingProduct?.stock_level} units</Text>

              <Text style={styles.inputLabel}>Add Quantity</Text>
              <TextInput
                style={styles.restockInput}
                keyboardType="numeric"
                placeholder="Enter quantity to add"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={restockQuantity}
                onChangeText={setRestockQuantity}
                autoFocus
              />

              <View style={styles.restockButtons}>
                <TouchableOpacity style={styles.restockCancelBtn} onPress={() => setShowRestockModal(false)}>
                  <Text style={styles.restockCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.restockConfirmBtn} onPress={handleSaveRestock} disabled={isSubmitting}>
                  <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.restockConfirmGradient}>
                    <Text style={styles.restockConfirmText}>{isSubmitting ? '...' : '+ Add Stock'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
  orbGold: { bottom: 100, left: -150 },
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
  statCardPrimary: { borderColor: 'rgba(43, 175, 242, 0.3)' },
  statCardWarning: { borderColor: 'rgba(245, 158, 11, 0.3)' },
  statCardDanger: { borderColor: 'rgba(239, 68, 68, 0.3)' },
  statCardGradient: { padding: 12, alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  statEmoji: { fontSize: 18, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  statValueSmall: { fontSize: 11, fontWeight: '700', color: '#00DFFF' },
  statValueWarning: { color: '#F59E0B' },
  statValueDanger: { color: '#EF4444' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  productList: { paddingHorizontal: 20, paddingBottom: 100 },
  productCard: { marginBottom: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cardGradient: { padding: 16 },
  productRow: { flexDirection: 'row', alignItems: 'center' },
  productIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  productImage: { width: 52, height: 52, borderRadius: 14, resizeMode: 'cover' },
  iconEmoji: { fontSize: 24 },
  productInfo: { flex: 1, marginLeft: 14 },
  productName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  currencySymbol: { fontSize: 12, color: '#2BAFF2', fontWeight: '600', marginRight: 2 },
  productPrice: { fontSize: 16, color: '#2BAFF2', fontWeight: '700' },
  stockBadge: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, minWidth: 60 },
  stockIcon: { fontSize: 10, marginBottom: 2 },
  stockLevel: { fontSize: 18, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', marginTop: 12, gap: 6 },
  tag: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  actionsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  actionDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  actionIcon: { fontSize: 12, marginRight: 6 },
  actionText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24 },
  emptyButton: { borderRadius: 12, overflow: 'hidden' },
  emptyButtonGradient: { paddingHorizontal: 24, paddingVertical: 14 },
  emptyButtonText: { color: '#000', fontWeight: '700', fontSize: 15 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContainer: { maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalContent: { padding: 20, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  closeButton: { padding: 8 },
  modalScroll: { maxHeight: 500 },
  inputLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 8, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  priceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  pricePrefix: { fontSize: 24, color: '#2BAFF2', fontWeight: '600', paddingLeft: 16 },
  priceInput: { flex: 1, padding: 16, color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  categoryScroll: { flexDirection: 'row', marginBottom: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  categoryChipActive: { backgroundColor: '#1F57F5', borderColor: '#1F57F5' },
  categoryChipText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  categoryChipTextActive: { color: '#FFF' },
  inputHint: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 },
  submitButton: { marginTop: 24, borderRadius: 14, overflow: 'hidden' },
  submitButtonGradient: { paddingVertical: 18, alignItems: 'center' },
  submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  // Restock modal styles
  restockOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  restockContainer: { width: '85%', borderRadius: 24, overflow: 'hidden' },
  restockContent: { padding: 24, alignItems: 'center' },
  restockTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  restockProductName: { fontSize: 16, fontWeight: '600', color: '#2BAFF2', marginBottom: 4 },
  restockCurrentStock: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 },
  restockInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, color: '#FFFFFF', fontSize: 24, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  restockButtons: { flexDirection: 'row', marginTop: 20, gap: 12, width: '100%' },
  restockCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  restockCancelText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600', fontSize: 15 },
  restockConfirmBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  restockConfirmGradient: { paddingVertical: 14, alignItems: 'center' },
  restockConfirmText: { color: '#000', fontWeight: '700', fontSize: 15 },
  // Image picker styles
  imagePicker: { width: '100%', height: 140, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', marginBottom: 8 },
  selectedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imagePickerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  imagePickerText: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  removeImageButton: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  removeImageText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
  productImagePlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
});
