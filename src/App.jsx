import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const MobissCatalog = () => {
  // Estado para controlar visualização (catalogo ou admin)
  const [view, setView] = useState(() => {
    // Verifica se a URL tem #admin
    if (typeof window !== 'undefined' && window.location.hash === '#admin') {
      return 'admin';
    }
    return 'catalog';
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Estado dos produtos (agora carrega do Firebase)
  const [products, setProducts] = useState([]);

  // Estados do catálogo
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [selectedColorByProduct, setSelectedColorByProduct] = useState({});
  
  // Estados do carrinho
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  
  // Estado do modal de detalhes do produto
  const [selectedProductDetails, setSelectedProductDetails] = useState(null);
  const [detailsSelectedColor, setDetailsSelectedColor] = useState('');

  // Estados do admin
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProductForWhatsapp, setSelectedProductForWhatsapp] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Cores oficiais Mobiss
  const colors = {
    primary: '#3D9A8B',
    primaryDark: '#2D7A6D',
    primaryLight: '#4DB8A7',
    accent: '#5FCECE',
    white: '#FFFFFF',
    dark: '#1a1a1a',
    gray: '#6b7280',
    lightGray: '#f5f7f6',
    background: '#fafbfa'
  };

  const categories = [
    { id: 'all', name: 'Tudo', icon: '✦' },
    { id: 'cases', name: 'Capinhas', icon: '📱' },
    { id: 'screen', name: 'Películas', icon: '🛡️' },
    { id: 'chargers', name: 'Carregadores', icon: '⚡' },
    { id: 'cables', name: 'Cabos', icon: '🔌' },
    { id: 'audio', name: 'Áudio', icon: '🎧' },
    { id: 'holders', name: 'Suportes', icon: '🧲' },
  ];

  const iphoneModels = [
    { id: 'all', name: 'Todos os Modelos' },
    { id: '16-pro-max', name: 'iPhone 16 Pro Max' },
    { id: '16-pro', name: 'iPhone 16 Pro' },
    { id: '16-plus', name: 'iPhone 16 Plus' },
    { id: '16', name: 'iPhone 16' },
    { id: '15-pro-max', name: 'iPhone 15 Pro Max' },
    { id: '15-pro', name: 'iPhone 15 Pro' },
    { id: '15-plus', name: 'iPhone 15 Plus' },
    { id: '15', name: 'iPhone 15' },
    { id: '14-pro-max', name: 'iPhone 14 Pro Max' },
    { id: '14-pro', name: 'iPhone 14 Pro' },
    { id: '14-plus', name: 'iPhone 14 Plus' },
    { id: '14', name: 'iPhone 14' },
    { id: '13', name: 'iPhone 13' },
    { id: '12', name: 'iPhone 12' },
    { id: '11', name: 'iPhone 11' },
  ];

  const tagOptions = ['', 'Mais Pedida', 'Novidade', 'Promoção', 'Original', 'Proteção Total', 'Indestrutível', '3 em 1', '50% em 30min'];

  // Carregar produtos do Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      } finally {
        setLoading(false);
        setIsLoaded(true);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const categoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    const modelMatch = selectedModel === 'all' || (product.models && (product.models.includes('all') || product.models.includes(selectedModel)));
    const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return categoryMatch && modelMatch && searchMatch;
  });

  const formatPrice = (price) => {
    return Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Funções do Carrinho
  const addToCart = (product, colorName = null) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      color: colorName,
      image: getProductImage(product, colorName),
      quantity: 1
    };
    
    // Verifica se já existe no carrinho (mesmo produto + mesma cor)
    const existingIndex = cart.findIndex(item => 
      item.id === product.id && item.color === colorName
    );
    
    if (existingIndex >= 0) {
      // Incrementa quantidade
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      // Adiciona novo item
      setCart([...cart, cartItem]);
    }
    
    // Fecha modal de detalhes se estiver aberto
    setSelectedProductDetails(null);
    setDetailsSelectedColor('');
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(index);
      return;
    }
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    setCart(newCart);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const getProductImage = (product, colorName) => {
    if (product.colorVariants && product.colorVariants.length > 0) {
      if (colorName) {
        const variant = product.colorVariants.find(v => v.name === colorName);
        return variant?.image || product.colorVariants[0]?.image;
      }
      return product.colorVariants[0]?.image;
    }
    return product.image;
  };

  // Enviar pedido pelo WhatsApp
  const sendCartToWhatsApp = () => {
    if (cart.length === 0) return;
    
    let message = `Oi! Quero fazer um pedido:\n\n`;
    
    cart.forEach((item, index) => {
      message += `${item.quantity}x ${item.name}`;
      if (item.color) {
        message += ` (${item.color})`;
      }
      message += ` - ${formatPrice(item.price * item.quantity)}\n`;
    });
    
    message += `\n*Total: ${formatPrice(getCartTotal())}*`;
    
    const url = `https://wa.me/5548992082828?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    // Limpa o carrinho após enviar
    setCart([]);
    setShowCart(false);
  };

  // Abrir modal de detalhes do produto
  const openProductDetails = (product) => {
    setSelectedProductDetails(product);
    // Se tem cores, seleciona a primeira
    if (product.colorVariants && product.colorVariants.length > 0) {
      setDetailsSelectedColor(product.colorVariants[0].name);
    } else if (product.colors && product.colors.length > 0) {
      setDetailsSelectedColor(product.colors[0]);
    } else {
      setDetailsSelectedColor('');
    }
  };

  // Funções do Admin
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'M@bussinesADM26') {
      setIsAdminAuthenticated(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Limitar tamanho a 2MB para não sobrecarregar o Firestore
      if (file.size > 2000000) {
        alert('Imagem muito grande! Use uma imagem menor que 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingProduct({ ...editingProduct, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingProduct.id && typeof editingProduct.id === 'string' && !editingProduct.id.startsWith('temp_')) {
        // Atualizar produto existente
        const productRef = doc(db, 'products', editingProduct.id);
        const { id, ...productData } = editingProduct;
        await updateDoc(productRef, productData);
        setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
      } else {
        // Criar novo produto
        const { id, ...productData } = editingProduct;
        const docRef = await addDoc(collection(db, 'products'), productData);
        setProducts([...products, { ...productData, id: docRef.id }]);
      }
      setEditingProduct(null);
      setShowProductForm(false);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Tem certeza que quer excluir este produto?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        alert('Erro ao excluir produto. Tente novamente.');
      }
    }
  };

  const startNewProduct = () => {
    setEditingProduct({
      id: `temp_${Date.now()}`,
      name: '',
      description: '',
      category: 'cases',
      models: ['all'],
      price: 0,
      originalPrice: '',
      image: '',
      colorVariants: [],
      tag: '',
      magsafe: false
    });
    setShowProductForm(true);
  };

  const startEditProduct = (product) => {
    setEditingProduct({ ...product });
    setShowProductForm(true);
  };

  // Componente Card do Produto (Catálogo)
  const ProductCard = ({ product, index }) => {
    // Pega a cor selecionada para este produto ou usa a primeira
    const currentColorIndex = selectedColorByProduct[product.id] || 0;
    
    // Suporte para novo formato (colorVariants) e formato antigo (colors + image)
    const hasColorVariants = product.colorVariants && product.colorVariants.length > 0;
    const currentVariant = hasColorVariants ? product.colorVariants[currentColorIndex] : null;
    const currentImage = hasColorVariants ? currentVariant?.image : product.image;
    const colorsList = hasColorVariants 
      ? product.colorVariants.map(v => v.name) 
      : (product.colors || []);
    const currentColorName = colorsList[currentColorIndex] || null;

    const getColorHex = (colorName) => {
      const name = colorName?.toLowerCase() || '';
      if (name.includes('preto')) return '#1f2937';
      if (name.includes('branco')) return '#ffffff';
      if (name.includes('azul')) return '#1e40af';
      if (name.includes('marrom')) return '#78350f';
      if (name.includes('verde')) return colors.primaryDark;
      if (name.includes('rose') || name.includes('dourado')) return '#f59e0b';
      if (name.includes('transparente')) return '#d1d5db';
      if (name.includes('prata') || name.includes('cinza')) return '#9ca3af';
      if (name.includes('vermelho')) return '#dc2626';
      if (name.includes('roxo') || name.includes('lilás')) return '#7c3aed';
      if (name.includes('rosa') || name.includes('pink')) return '#ec4899';
      if (name.includes('laranja')) return '#ea580c';
      if (name.includes('amarelo')) return '#eab308';
      return '#e5e7eb';
    };

    const handleAddToCart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (colorsList.length > 0) {
        // Se tem cores, abre modal de detalhes pra escolher
        openProductDetails(product);
      } else {
        // Sem cores, adiciona direto
        addToCart(product, null);
      }
    };

    return (
      <div
        className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-500
          ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        style={{ 
          transitionDelay: `${index * 80}ms`,
          boxShadow: hoveredProduct === product.id 
            ? `0 25px 50px -12px ${colors.primary}30` 
            : '0 4px 20px -4px rgba(0, 0, 0, 0.05)'
        }}
        onMouseEnter={() => setHoveredProduct(product.id)}
        onMouseLeave={() => setHoveredProduct(null)}
      >
        {product.tag && (
          <div className="absolute top-4 left-4 z-10">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide text-white"
              style={{ 
                background: product.tag === 'Mais Pedida' ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` 
                  : product.tag === 'Novidade' ? `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`
                  : product.tag === 'Original' ? 'linear-gradient(135deg, #1f2937, #111827)'
                  : `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`
              }}>
              {product.tag}
            </span>
          </div>
        )}
        
        {product.magsafe && (
          <div className="absolute top-4 right-4 z-10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
              style={{ background: `linear-gradient(135deg, ${colors.primary}20, ${colors.accent}30)` }}>
              <span className="text-xs font-bold" style={{ color: colors.primary }}>M</span>
            </div>
          </div>
        )}

        {/* Imagem clicável */}
        <div 
          className="relative h-56 flex items-center justify-center overflow-hidden cursor-pointer"
          style={{ background: `linear-gradient(180deg, ${colors.lightGray} 0%, #e8f0ee 100%)` }}
          onClick={() => openProductDetails(product)}
        >
          <div className={`transition-transform duration-500 ${hoveredProduct === product.id ? 'scale-110' : 'scale-100'}`}>
            {currentImage ? (
              <img src={currentImage} alt={product.name} className="w-40 h-40 object-contain" />
            ) : (
              <div className="w-36 h-36 rounded-2xl flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(145deg, ${colors.primary}15, ${colors.primary}25)`
                }}>
                <span className="text-5xl">
                  {product.category === 'cases' ? '📱' :
                   product.category === 'screen' ? '🛡️' :
                   product.category === 'chargers' ? '⚡' :
                   product.category === 'cables' ? '🔌' :
                   product.category === 'audio' ? '🎧' : '🧲'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="p-5">
          <h3 
            className="font-semibold text-base leading-tight mb-2 line-clamp-2 cursor-pointer hover:underline"
            style={{ fontFamily: "'Poppins', sans-serif", color: colors.dark }}
            onClick={() => openProductDetails(product)}
          >
            {product.name}
          </h3>
          
          {colorsList.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              {colorsList.slice(0, 5).map((colorName, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedColorByProduct({ ...selectedColorByProduct, [product.id]: i });
                  }}
                  className={`w-5 h-5 rounded-full transition-all duration-200 ${currentColorIndex === i ? 'ring-2 ring-offset-1' : ''}`}
                  style={{ 
                    background: getColorHex(colorName),
                    ringColor: colors.primary,
                    border: colorName?.toLowerCase().includes('branco') || colorName?.toLowerCase().includes('transparente') ? '1px solid #d1d5db' : 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                  }}
                  title={colorName}
                />
              ))}
              {colorsList.length > 5 && (
                <span className="text-xs ml-1" style={{ color: colors.gray }}>+{colorsList.length - 5}</span>
              )}
            </div>
          )}

          <div className="flex items-end justify-between">
            <div>
              {product.originalPrice && (
                <span className="text-sm line-through block" style={{ color: colors.gray }}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              <span className="text-xl font-bold" style={{ color: colors.primary }}>
                {formatPrice(product.price)}
              </span>
            </div>
            
            {/* Botão Adicionar */}
            <button 
              onClick={handleAddToCart}
              className="px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:scale-105 text-sm font-medium"
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
                color: 'white'
              }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adicionar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Componente Card do Produto (Admin)
  const AdminProductCard = ({ product }) => {
    // Pega a imagem principal ou a primeira variação de cor
    const displayImage = product.image || (product.colorVariants && product.colorVariants.length > 0 ? product.colorVariants[0].image : null);
    
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: colors.lightGray }}>
          {displayImage ? (
            <img src={displayImage} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">
              {product.category === 'cases' ? '📱' :
               product.category === 'screen' ? '🛡️' :
               product.category === 'chargers' ? '⚡' :
               product.category === 'cables' ? '🔌' :
               product.category === 'audio' ? '🎧' : '🧲'}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
          <p className="text-sm text-gray-500">{categories.find(c => c.id === product.category)?.name}</p>
          <p className="text-lg font-bold mt-1" style={{ color: colors.primary }}>{formatPrice(product.price)}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => startEditProduct(product)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button 
            onClick={() => handleDeleteProduct(product.id)}
            className="p-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // Formulário de Produto - renderizado inline para evitar perda de foco
  const renderProductForm = () => {
    if (!showProductForm) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold" style={{ color: colors.dark }}>
                {editingProduct?.id && !String(editingProduct.id).startsWith('temp_') ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button 
                onClick={() => { setShowProductForm(false); setEditingProduct(null); }}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSaveProduct} className="p-6 space-y-6">
            {/* Foto Principal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto Principal do Produto (max 2MB)</label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
                  onClick={(e) => {
                    e.preventDefault();
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (ev) => {
                      const file = ev.target.files[0];
                      if (file) {
                        if (file.size > 2000000) {
                          alert('Imagem muito grande! Use uma imagem menor que 2MB.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingProduct({ ...editingProduct, image: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    };
                    input.click();
                  }}
                  style={{ background: colors.lightGray }}
                >
                  {editingProduct?.image ? (
                    <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="text-xs text-gray-500 mt-1 block">Adicionar foto</span>
                    </div>
                  )}
                </div>
                {editingProduct?.image && (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setEditingProduct({ ...editingProduct, image: '' }); }}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Remover foto
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">Foto usada quando o produto não tem variações de cor ou como imagem padrão.</p>
            </div>

            {/* Variações de Cor com Foto (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Variações de Cor (opcional - cada cor com sua foto)</label>
              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                {(editingProduct?.colorVariants || []).map((variant, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                    <div 
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden flex-shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (ev) => {
                          const file = ev.target.files[0];
                          if (file) {
                            if (file.size > 2000000) {
                              alert('Imagem muito grande! Use uma imagem menor que 2MB.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const newVariants = [...(editingProduct?.colorVariants || [])];
                              newVariants[index] = { ...newVariants[index], image: reader.result };
                              setEditingProduct({ ...editingProduct, colorVariants: newVariants });
                            };
                            reader.readAsDataURL(file);
                          }
                        };
                        input.click();
                      }}
                      style={{ background: colors.lightGray }}
                    >
                      {variant.image ? (
                        <img src={variant.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Nome da cor (ex: Preto)"
                      defaultValue={variant.name || ''}
                      onBlur={(e) => {
                        const newVariants = [...(editingProduct?.colorVariants || [])];
                        newVariants[index] = { ...newVariants[index], name: e.target.value };
                        setEditingProduct({ ...editingProduct, colorVariants: newVariants });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const newVariants = (editingProduct?.colorVariants || []).filter((_, i) => i !== index);
                        setEditingProduct({ ...editingProduct, colorVariants: newVariants });
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const newVariants = [...(editingProduct?.colorVariants || []), { name: '', image: '' }];
                    setEditingProduct({ ...editingProduct, colorVariants: newVariants });
                  }}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Adicionar cor
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Deixe vazio se o produto não tem variações de cor (ex: carregadores, cabos).</p>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Produto *</label>
              <input
                type="text"
                required
                defaultValue={editingProduct?.name || ''}
                onBlur={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50"
                placeholder="Ex: Capinha Silicone Premium"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição (opcional)</label>
              <textarea
                defaultValue={editingProduct?.description || ''}
                onBlur={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
                placeholder="Ex: Capinha de silicone macio, proteção total contra quedas..."
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria *</label>
              <select
                required
                value={editingProduct?.category || 'cases'}
                onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
              >
                {categories.filter(c => c.id !== 'all').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>

            {/* Preços */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  defaultValue={editingProduct?.price ? Number(editingProduct.price).toFixed(2) : ''}
                  onBlur={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    const formatted = Math.round(value * 100) / 100;
                    e.target.value = formatted.toFixed(2);
                    setEditingProduct({ ...editingProduct, price: formatted });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
                  placeholder="89.90"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preço Original (opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingProduct?.originalPrice ? Number(editingProduct.originalPrice).toFixed(2) : ''}
                  onBlur={(e) => {
                    if (e.target.value) {
                      const value = parseFloat(e.target.value);
                      const formatted = Math.round(value * 100) / 100;
                      e.target.value = formatted.toFixed(2);
                      setEditingProduct({ ...editingProduct, originalPrice: formatted });
                    } else {
                      setEditingProduct({ ...editingProduct, originalPrice: '' });
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
                  placeholder="119.90"
                />
              </div>
            </div>

            {/* Modelos de iPhone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Modelos Compatíveis</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-xl">
                {iphoneModels.map(model => (
                  <label key={model.id} className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 cursor-pointer hover:border-gray-300" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={editingProduct?.models?.includes(model.id) || false}
                      onChange={(e) => {
                        e.stopPropagation();
                        const models = editingProduct?.models || [];
                        if (e.target.checked) {
                          setEditingProduct({ ...editingProduct, models: [...models, model.id] });
                        } else {
                          setEditingProduct({ ...editingProduct, models: models.filter(m => m !== model.id) });
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded"
                    />
                    <span className="text-sm">{model.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tag */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tag (opcional)</label>
              <select
                value={editingProduct?.tag || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, tag: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
              >
                {tagOptions.map(tag => (
                  <option key={tag} value={tag}>{tag || 'Sem tag'}</option>
                ))}
              </select>
            </div>

            {/* MagSafe */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={editingProduct?.magsafe || false}
                  onChange={(e) => setEditingProduct({ ...editingProduct, magsafe: e.target.checked })}
                  onClick={(e) => e.stopPropagation()}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Compatível com MagSafe</span>
              </label>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setShowProductForm(false); setEditingProduct(null); }}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}
              >
                {saving ? 'Salvando...' : (editingProduct?.id && !String(editingProduct.id).startsWith('temp_') ? 'Salvar Alterações' : 'Criar Produto')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Tela de Login do Admin
  const AdminLogin = () => (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: colors.background }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: colors.primary }}>
            <span className="text-white font-bold text-2xl">m</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: colors.dark }}>Painel Admin</h1>
          <p className="text-gray-500 mt-2">Acesso restrito Mobiss</p>
        </div>
        
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2"
              placeholder="Digite a senha"
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}
          >
            Entrar
          </button>
        </form>
        
        <button
          onClick={() => setView('catalog')}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Voltar para o catálogo
        </button>
      </div>
    </div>
  );

  // Painel Admin
  const AdminPanel = () => (
    <div className="min-h-screen" style={{ background: colors.background }}>
      {/* Header Admin */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b bg-white/90" style={{ borderColor: `${colors.primary}15` }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: colors.primary }}>
                <span className="text-white font-bold text-xl">m</span>
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: colors.dark }}>Painel Admin</h1>
                <p className="text-xs text-gray-500">Gerencie seus produtos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('catalog')}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                👀 Ver Catálogo
              </button>
              <button
                onClick={() => { setIsAdminAuthenticated(false); setView('catalog'); }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Admin */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-3xl font-bold" style={{ color: colors.primary }}>{products.length}</p>
            <p className="text-gray-500 text-sm">Produtos</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-3xl font-bold" style={{ color: colors.primary }}>
              {products.filter(p => p.category === 'cases').length}
            </p>
            <p className="text-gray-500 text-sm">Capinhas</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-3xl font-bold" style={{ color: colors.primary }}>
              {products.filter(p => p.image).length}
            </p>
            <p className="text-gray-500 text-sm">Com foto</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-3xl font-bold" style={{ color: colors.primary }}>
              {products.filter(p => !p.image).length}
            </p>
            <p className="text-gray-500 text-sm">Sem foto</p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: colors.dark }}>Produtos</h2>
          <button
            onClick={startNewProduct}
            className="px-5 py-2.5 rounded-xl text-white font-medium transition-all hover:opacity-90 flex items-center gap-2"
            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo Produto
          </button>
        </div>

        {/* Lista de Produtos */}
        <div className="space-y-3">
          {products.map(product => (
            <AdminProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">📦</span>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum produto cadastrado</h3>
            <p className="text-gray-500 mb-6">Comece adicionando seu primeiro produto!</p>
            <button
              onClick={startNewProduct}
              className="px-6 py-3 rounded-xl text-white font-medium"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}
            >
              Adicionar Produto
            </button>
          </div>
        )}
      </main>

      {renderProductForm()}
    </div>
  );

  // Modal de seleção de cor
  // Modal de Detalhes do Produto
  const ProductDetailsModal = () => {
    if (!selectedProductDetails) return null;
    
    const product = selectedProductDetails;
    
    // Suporte para colorVariants (novo) e colors (antigo)
    const hasColorVariants = product.colorVariants && product.colorVariants.length > 0;
    const colorsList = hasColorVariants 
      ? product.colorVariants.map(v => v.name) 
      : (product.colors || []);
    
    // Encontra a imagem da cor selecionada
    const getImageForColor = (colorName) => {
      if (hasColorVariants) {
        const variant = product.colorVariants.find(v => v.name === colorName);
        return variant?.image || product.colorVariants[0]?.image;
      }
      return product.image;
    };

    const getColorHex = (colorName) => {
      const name = colorName?.toLowerCase() || '';
      if (name.includes('preto')) return '#1f2937';
      if (name.includes('branco')) return '#ffffff';
      if (name.includes('azul')) return '#1e40af';
      if (name.includes('marrom')) return '#78350f';
      if (name.includes('verde')) return colors.primaryDark;
      if (name.includes('rose') || name.includes('dourado')) return '#f59e0b';
      if (name.includes('transparente')) return '#d1d5db';
      if (name.includes('prata') || name.includes('cinza')) return '#9ca3af';
      if (name.includes('vermelho')) return '#dc2626';
      if (name.includes('roxo') || name.includes('lilás')) return '#7c3aed';
      if (name.includes('rosa') || name.includes('pink')) return '#ec4899';
      if (name.includes('laranja')) return '#ea580c';
      if (name.includes('amarelo')) return '#eab308';
      return '#e5e7eb';
    };

    const currentImage = detailsSelectedColor ? getImageForColor(detailsSelectedColor) : (hasColorVariants ? product.colorVariants[0]?.image : product.image);
    
    const handleAddToCartFromDetails = () => {
      if (colorsList.length > 0 && !detailsSelectedColor) {
        alert('Selecione uma cor');
        return;
      }
      addToCart(product, detailsSelectedColor || null);
    };
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedProductDetails(null); setDetailsSelectedColor(''); }}>
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Header com imagem */}
          <div className="relative h-64 flex items-center justify-center" style={{ background: `linear-gradient(180deg, ${colors.lightGray} 0%, #e8f0ee 100%)` }}>
            {product.tag && (
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide text-white"
                  style={{ 
                    background: product.tag === 'Mais Pedida' ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` 
                      : product.tag === 'Novidade' ? `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`
                      : `linear-gradient(135deg, ${colors.primaryLight}, ${colors.primary})`
                  }}>
                  {product.tag}
                </span>
              </div>
            )}
            {currentImage ? (
              <img src={currentImage} alt={product.name} className="w-48 h-48 object-contain transition-all duration-300" />
            ) : (
              <div className="w-36 h-36 rounded-2xl flex items-center justify-center" style={{ background: `${colors.primary}20` }}>
                <span className="text-6xl">
                  {product.category === 'cases' ? '📱' :
                   product.category === 'screen' ? '🛡️' :
                   product.category === 'chargers' ? '⚡' :
                   product.category === 'cables' ? '🔌' :
                   product.category === 'audio' ? '🎧' : '🧲'}
                </span>
              </div>
            )}
            <button 
              onClick={() => { setSelectedProductDetails(null); setDetailsSelectedColor(''); }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Conteúdo */}
          <div className="p-6">
            <h3 className="font-bold text-xl mb-2" style={{ color: colors.dark }}>{product.name}</h3>
            
            {product.description && (
              <p className="text-sm mb-4" style={{ color: colors.gray }}>{product.description}</p>
            )}
            
            <div className="flex items-center gap-3 mb-4">
              {product.originalPrice && (
                <span className="text-lg line-through" style={{ color: colors.gray }}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              <span className="text-2xl font-bold" style={{ color: colors.primary }}>{formatPrice(product.price)}</span>
            </div>
            
            {product.magsafe && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: `${colors.primary}10` }}>
                <span className="text-sm font-medium" style={{ color: colors.primary }}>✓ Compatível com MagSafe</span>
              </div>
            )}
            
            {colorsList.length > 0 && (
              <>
                <p className="text-sm font-medium mb-3" style={{ color: colors.gray }}>Escolha a cor:</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {colorsList.map((colorName, i) => (
                    <button
                      key={i}
                      onClick={() => setDetailsSelectedColor(colorName)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                        detailsSelectedColor === colorName ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ 
                        color: detailsSelectedColor === colorName ? colors.primary : colors.dark,
                        background: detailsSelectedColor === colorName ? `${colors.primary}10` : 'white'
                      }}
                    >
                      <span className="inline-block w-3 h-3 rounded-full mr-2" style={{
                        background: getColorHex(colorName),
                        border: colorName?.toLowerCase().includes('branco') || colorName?.toLowerCase().includes('transparente') ? '1px solid #d1d5db' : 'none'
                      }} />
                      {colorName}
                    </button>
                  ))}
                </div>
              </>
            )}
            
            <button
              onClick={handleAddToCartFromDetails}
              disabled={colorsList.length > 0 && !detailsSelectedColor}
              className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                (colorsList.length === 0 || detailsSelectedColor) ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'
              }`}
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`, color: 'white' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {colorsList.length > 0 && !detailsSelectedColor ? 'Selecione uma cor' : 'Adicionar ao carrinho'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal do Carrinho
  const CartModal = () => {
    if (!showCart) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50" onClick={() => setShowCart(false)}>
        <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${colors.primary}15` }}>
                <svg className="w-5 h-5" style={{ color: colors.primary }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: colors.dark }}>Seu Carrinho</h3>
                <p className="text-sm" style={{ color: colors.gray }}>{getCartItemsCount()} {getCartItemsCount() === 1 ? 'item' : 'itens'}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCart(false)}
              className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Lista de itens */}
          <div className="flex-1 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: colors.lightGray }}>
                  <svg className="w-10 h-10" style={{ color: colors.gray }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="font-medium mb-1" style={{ color: colors.dark }}>Carrinho vazio</p>
                <p className="text-sm" style={{ color: colors.gray }}>Adicione produtos para continuar</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item, index) => (
                  <div key={index} className="flex gap-4 p-3 rounded-2xl" style={{ background: colors.lightGray }}>
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-2xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1 truncate" style={{ color: colors.dark }}>{item.name}</h4>
                      {item.color && (
                        <p className="text-xs mb-2" style={{ color: colors.gray }}>Cor: {item.color}</p>
                      )}
                      <p className="font-bold" style={{ color: colors.primary }}>{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button 
                        onClick={() => removeFromCart(index)}
                        className="w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateCartQuantity(index, item.quantity - 1)}
                          className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQuantity(index, item.quantity + 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                          style={{ background: colors.primary, color: 'white' }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer com total e botão */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="font-medium" style={{ color: colors.gray }}>Total:</span>
                <span className="text-2xl font-bold" style={{ color: colors.primary }}>{formatPrice(getCartTotal())}</span>
              </div>
              <button
                onClick={sendCartToWhatsApp}
                className="w-full py-4 rounded-xl font-medium flex items-center justify-center gap-3 transition-all hover:opacity-90"
                style={{ background: '#25D366', color: 'white' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Enviar pedido
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Botão flutuante do carrinho
  const CartButton = () => (
    <button
      onClick={() => setShowCart(true)}
      className="fixed bottom-6 right-6 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-40"
      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}
    >
      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {getCartItemsCount() > 0 && (
        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
          {getCartItemsCount()}
        </span>
      )}
    </button>
  );

  // Catálogo Principal
  const Catalog = () => (
    <div className="min-h-screen" style={{ background: colors.background }}>
      {/* Pattern overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: `radial-gradient(${colors.primary}08 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: colors.primary, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
                  <span className="text-white font-bold text-xl" style={{ fontFamily: "'Poppins', sans-serif" }}>m</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold tracking-tight text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    mobiss
                  </h1>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="O que você procura?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border-0 text-sm transition-all duration-300 focus:outline-none focus:ring-2"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', fontFamily: "'Poppins', sans-serif" }}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a href="https://instagram.com/mobissoficial" target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://wa.me/5548992082828?text=Oi!%20Vi%20o%20cat%C3%A1logo%20da%20Mobiss%20e%20quero%20saber%20mais!" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105" style={{ background: '#25D366' }}>
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 50%, ${colors.primary} 100%)` }} />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full" style={{ background: colors.accent, filter: 'blur(60px)' }} />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full" style={{ background: 'white', filter: 'blur(80px)' }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
              <span className="text-lg">🚀</span>
              <span className="text-white/90 text-sm font-medium" style={{ fontFamily: "'Poppins', sans-serif" }}>Mobiss tá na área!</span>
            </div>
            
            <h2 className={`text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ fontFamily: "'Poppins', sans-serif" }}>
              Qualidade de verdade.
              <br />
              <span style={{ color: colors.accent }}>Preço justo.</span>
            </h2>
            
            <p className={`text-white/80 text-lg max-w-xl mx-auto mb-3 transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ fontFamily: "'Poppins', sans-serif" }}>
              Capinhas e acessórios pra quem é exigente.
            </p>
            <p className={`text-white/60 text-base max-w-xl mx-auto mb-8 transition-all duration-700 delay-250 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ fontFamily: "'Poppins', sans-serif" }}>
              Seu celular merece mais. Seu celular merece Mobiss. 🩵
            </p>

            <div className={`flex flex-wrap justify-center gap-8 md:gap-16 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">✨</div>
                <div className="text-white/70 text-sm mt-1">Qualidade</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">💬</div>
                <div className="text-white/70 text-sm mt-1">Atendimento direto</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white">🚀</div>
                <div className="text-white/70 text-sm mt-1">Entrega ágil</div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 100" fill="none" className="w-full">
            <path d="M0 100V60C240 20 480 0 720 20C960 40 1200 80 1440 60V100H0Z" fill={colors.background}/>
          </svg>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 py-4 backdrop-blur-xl border-b" style={{ background: `rgba(250, 251, 250, 0.95)`, borderColor: `${colors.primary}15` }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="md:hidden mb-4">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="O que você procura?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl border text-sm"
                style={{ background: 'white', borderColor: `${colors.primary}20`, color: colors.dark }}
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: colors.gray }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={(e) => { e.preventDefault(); setSelectedCategory(category.id); }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300"
                style={{
                  background: selectedCategory === category.id ? `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` : 'transparent',
                  color: selectedCategory === category.id ? 'white' : colors.gray
                }}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-3 border-t" style={{ borderColor: `${colors.primary}10` }}>
            <span className="text-sm font-medium" style={{ color: colors.gray }}>Seu iPhone:</span>
            <select
              value={selectedModel}
              onChange={(e) => { e.preventDefault(); setSelectedModel(e.target.value); }}
              className="px-4 py-2 rounded-xl text-sm border focus:outline-none"
              style={{ background: 'white', color: colors.dark, borderColor: `${colors.primary}20` }}
            >
              {iphoneModels.map((model) => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
            
            {(selectedCategory !== 'all' || selectedModel !== 'all' || searchTerm) && (
              <button
                onClick={(e) => { e.preventDefault(); setSelectedCategory('all'); setSelectedModel('all'); setSearchTerm(''); }}
                className="ml-auto text-sm font-medium"
                style={{ color: colors.primary }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <p className="text-sm" style={{ color: colors.gray }}>
              <span className="font-semibold" style={{ color: colors.dark }}>{filteredProducts.length}</span> produtos pra você 👀
            </p>
          </div>

          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: `${colors.primary}10` }}>
                <span className="text-4xl">👀</span>
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ color: colors.dark }}>Ops! Nada por aqui.</h3>
              <p className="mb-6" style={{ color: colors.gray }}>Tenta ajustar os filtros ou buscar de outro jeito</p>
              <button
                onClick={(e) => { e.preventDefault(); setSelectedCategory('all'); setSelectedModel('all'); setSearchTerm(''); }}
                className="px-6 py-3 rounded-full text-white font-medium"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}
              >
                Ver tudo
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-12" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})` }}>
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10" style={{ background: colors.accent }} />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-10" style={{ background: 'white' }} />
            </div>
            
            <div className="relative text-center">
              <span className="text-4xl mb-4 block">🚀</span>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Não achou o que procura?</h3>
              <p className="text-white/80 mb-2 max-w-lg mx-auto">Chama a gente! Atendimento direto, sem enrolação.</p>
              <p className="text-white/60 mb-8 text-sm">A Mobiss tá aqui pra te ajudar. 🩵</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="https://wa.me/5548992082828?text=Oi!%20Vi%20o%20cat%C3%A1logo%20da%20Mobiss%20e%20quero%20saber%20mais!" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105" style={{ background: '#25D366', color: 'white' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Chamar no Whats
                </a>
                <a href="https://instagram.com/mobissoficial" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-300 hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Seguir no Insta
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Slogan Banner */}
      <section className="py-8" style={{ background: colors.lightGray }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <p className="text-lg md:text-xl font-medium" style={{ color: colors.dark }}>
              Praticidade, estilo e preço justo. <span style={{ color: colors.primary }}>Seu celular merece Mobiss.</span> ✨🩵
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: `${colors.primary}10` }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: colors.primary }}>
                <span className="text-white font-bold text-sm">m</span>
              </div>
              <span className="font-semibold" style={{ color: colors.primary }}>
                mobiss
              </span>
            </div>
            <p className="text-sm" style={{ color: colors.gray }}>© 2025 Mobiss. Feito com 🩵</p>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        input::placeholder { color: rgba(255,255,255,0.5); }
      `}</style>

      <ProductDetailsModal />
      <CartModal />
      <CartButton />
    </div>
  );

  // Renderização principal
  if (view === 'admin') {
    return isAdminAuthenticated ? <AdminPanel /> : <AdminLogin />;
  }
  
  return <Catalog />;
};

export default MobissCatalog;
