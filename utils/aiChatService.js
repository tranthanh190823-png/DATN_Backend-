import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ========== KEYWORD DETECTION ==========

const PRODUCT_INTENT_KEYWORDS = [
  // Có dấu
  'sản phẩm', 'nước hoa', 'mùi hương', 'hương thơm', 'chai', 'lọ',
  'gợi ý', 'tư vấn', 'recommend', 'đề xuất', 'phù hợp',
  'mua', 'chọn', 'tìm', 'cần', 'muốn', 'thích',
  'gỗ', 'hoa', 'cam chanh', 'tươi', 'ngọt', 'phương đông', 'oriental',
  'floral', 'woody', 'citrus', 'fresh', 'gourmand',
  'edp', 'edt', 'parfum', 'cologne', 'extrait', 'eau de parfum', 'eau de toilette',
  'đi làm', 'hẹn hò', 'tiệc', 'hằng ngày', 'daily', 'office', 'date',
  'nam', 'nữ', 'men', 'women', 'unisex', 'luxury', 'sang', 'cao cấp',
  'hot', 'bán chạy', 'best', 'mới', 'new', 'mới về', 'mới nhất',
  'giá', 'rẻ', 'đắt', 'khuyến mãi', 'sale', 'giảm giá', 'voucher',
  'dior', 'chanel', 'gucci', 'ysl', 'versace', 'armani', 'bvlgari',
  'tom ford', 'creed', 'jo malone', 'le labo', 'paco rabanne',
  'davidoff', 'lancôme', 'giorgio', 'afnan', 'hermes', 'hermès',
  // Không dấu (khách gõ tắt)
  'san pham', 'nuoc hoa', 'mui huong', 'huong thom',
  'goi y', 'tu van', 'de xuat', 'phu hop',
  'chon', 'tim', 'can', 'muon', 'thich',
  'go', 'cam chanh', 'tuoi', 'ngot', 'phuong dong',
  'di lam', 'hen ho', 'tiec', 'hang ngay',
  'nu', 'cao cap',
  'ban chay', 'moi ve', 'moi nhat',
  'gia', 're', 'dat', 'khuyen mai', 'giam gia',
  // Volume/Size keywords
  '10ml', '20ml', '30ml', '50ml', '100ml',
  // Scent notes
  'vanilla', 'musk', 'amber', 'oud', 'trầm', 'tram',
  'hoa hồng', 'hoa hong', 'lavender', 'bạc hà', 'bac ha',
];

const ORDER_INTENT_KEYWORDS = [
  'đơn hàng', 'đơn của tôi', 'mã đơn', 'order', 'kiểm tra đơn',
  'giao hàng', 'ship', 'vận chuyển', 'theo dõi', 'tracking',
  'đã nhận', 'giao chưa', 'bao giờ nhận',
  // Không dấu
  'don hang', 'don cua toi', 'ma don', 'kiem tra don',
  'giao hang', 'van chuyen', 'theo doi',
  'da nhan', 'giao chua', 'bao gio nhan',
];

const TYPE_KEYWORDS = {
  chiết: ['chiết', 'chiet', 'bỏ chai', 'bo chai', 'lọ nhỏ', 'ly nhỏ', 'mini'],
  full: ['full', 'full box', 'hộp đầy', 'đầy hộp', 'chính hãng', 'nguyên seal', 'mới 100%'],
};

// Map tên brand phổ biến → giá trị enum trong DB
const BRAND_KEYWORDS = {
  'chanel': 'CHANEL',
  'dior': 'DIOR', 'christian dior': 'DIOR',
  'gucci': 'GUCCI',
  'hermes': 'HERMES', 'hermès': 'HERMES', 'hermes paris': 'HERMES',
  'ysl': 'YSL', 'yves saint laurent': 'YSL', 'saint laurent': 'YSL',
  'afnan': 'AFNAN',
  'versace': 'VERSACE',
  'armani': 'ARMANI', 'giorgio armani': 'ARMANI',
  'tom ford': 'TOM FORD',
  'bvlgari': 'BVLGARI', 'bulgari': 'BVLGARI',
  'paco rabanne': 'PACO RABANNE',
  'davidoff': 'DAVIDOFF',
  'lancome': 'LANCOME', 'lancôme': 'LANCOME',
};

// ========== SYNONYM MAP (Bước 3 — chuẩn bị) ==========
// Chuẩn hoá từ khoá tìm kiếm → giá trị DB
const SYNONYM_MAP = {
  // Scent Category
  'woody': 'Go', 'gỗ': 'Go', 'go': 'Go', 'trầm': 'Go', 'tram': 'Go', 'ấm': 'Go',
  'sweet': 'Ngot', 'ngọt': 'Ngot', 'ngot': 'Ngot', 'gourmand': 'Ngot', 'vanilla': 'Ngot',
  'floral': 'Hoa', 'hoa': 'Hoa', 'hoa hồng': 'Hoa', 'hoa hong': 'Hoa', 'lavender': 'Hoa',
  'citrus': 'Cam', 'cam chanh': 'Cam', 'fresh': 'Cam', 'tươi mát': 'Cam', 'tuoi mat': 'Cam', 'tươi': 'Cam',
  // Gender
  'male': 'Nam', 'nam': 'Nam', 'men': 'Nam', 'gentleman': 'Nam', 'đàn ông': 'Nam', 'dan ong': 'Nam',
  'female': 'Nu', 'nữ': 'Nu', 'nu': 'Nu', 'women': 'Nu', 'lady': 'Nu', 'phụ nữ': 'Nu', 'phu nu': 'Nu',
};

// ========== DETECTION HELPERS ==========

const detectBrand = (text) => {
  const t = text.toLowerCase();
  const sortedKeys = Object.keys(BRAND_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (t.includes(keyword)) return BRAND_KEYWORDS[keyword];
  }
  return null;
};

const loadConfig = () => {
  try {
    const configPath = path.join(__dirname, '../chatbox_configs.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    return {
      ...config,
      api_key: process.env.YESCALE_API_KEY || config.api_key,
    };
  } catch (error) {
    console.error('Error loading chat config:', error);
    return null;
  }
};

const loadSystemPrompt = () => {
  try {
    const promptPath = path.join(__dirname, '../system-prompt.txt');
    return fs.readFileSync(promptPath, 'utf8');
  } catch (error) {
    console.error('Error loading system prompt:', error);
    return 'Bạn là trợ lý CSKH chuyên nghiệp của cửa hàng nước hoa Aventis.';
  }
};

const detectProductType = (text) => {
  const t = text.toLowerCase();
  if (TYPE_KEYWORDS.chiết.some((kw) => t.includes(kw))) return 'Chiết';
  if (TYPE_KEYWORDS.full.some((kw) => t.includes(kw))) return 'Full';
  return null;
};

const detectIntent = (text) => {
  const t = text.toLowerCase();
  if (PRODUCT_INTENT_KEYWORDS.some((k) => t.includes(k))) return 'product';
  if (ORDER_INTENT_KEYWORDS.some((k) => t.includes(k))) return 'order';
  return 'general';
};

// ========== DETECTION HELPERS (Bước 2) ==========

// Detect volume/size từ tin nhắn
const detectVolume = (text) => {
  const match = text.match(/(\d+)\s*ml/i);
  return match ? parseInt(match[1]) : null;
};

// Parse khoảng giá: "từ 500k đến 1 triệu", "dưới 2tr", "trên 1 triệu"
const parsePrice = (text) => {
  const t = text.toLowerCase();
  let minPrice = null;
  let maxPrice = null;

  const parseUnit = (numStr, unitStr) => {
    const num = parseInt(numStr);
    const unit = (unitStr || '').toLowerCase();
    if (unit.includes('tr') || unit.includes('triệu') || unit.includes('trieu')) return num * 1_000_000;
    if (unit === 'k') return num * 1_000;
    // Số lớn hơn 10000 → coi như VND thật
    if (num > 10000) return num;
    // Số nhỏ (ví dụ "1", "2") nếu có unit thì đã xử lý, không có thì bỏ qua
    return null;
  };

  // Pattern: "từ X đến Y" / "X đến Y" / "X - Y"
  const rangeMatch = t.match(/(?:từ\s+)?(\d+)\s*(k|tr|triệu|trieu)?\s*(?:đến|den|tới|toi|\-)\s*(\d+)\s*(k|tr|triệu|trieu)?/i);
  if (rangeMatch) {
    minPrice = parseUnit(rangeMatch[1], rangeMatch[2]);
    maxPrice = parseUnit(rangeMatch[3], rangeMatch[4]);
    return { minPrice, maxPrice };
  }

  // Pattern: "dưới X" / "under X" / "tầm X"
  const underMatch = t.match(/(?:dưới|duoi|under|tầm|tam|khoảng|khoang)\s*(\d+)\s*(k|tr|triệu|trieu)?/i);
  if (underMatch) {
    maxPrice = parseUnit(underMatch[1], underMatch[2]);
    return { minPrice: null, maxPrice };
  }

  // Pattern: "trên X" / "over X"
  const overMatch = t.match(/(?:trên|tren|over|hơn|hon)\s*(\d+)\s*(k|tr|triệu|trieu)?/i);
  if (overMatch) {
    minPrice = parseUnit(overMatch[1], overMatch[2]);
    return { minPrice, maxPrice: null };
  }

  // Simple pattern: số + đơn vị (coi như maxPrice)
  const simpleMatch = t.match(/(\d+)\s*(k|tr|triệu|trieu)/i);
  if (simpleMatch) {
    maxPrice = parseUnit(simpleMatch[1], simpleMatch[2]);
    return { minPrice: null, maxPrice };
  }

  return { minPrice: null, maxPrice: null };
};

// Detect scent category dùng SYNONYM_MAP
const detectScentCategory = (text) => {
  const t = text.toLowerCase();
  // Ưu tiên match dài trước ("cam chanh" trước "cam")
  const sortedKeys = Object.keys(SYNONYM_MAP).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (t.includes(keyword)) {
      const val = SYNONYM_MAP[keyword];
      // Chỉ return nếu là scent category
      if (['Go', 'Hoa', 'Cam', 'Ngot'].includes(val)) return val;
    }
  }
  return null;
};

// ========== PRODUCT RETRIEVAL ==========

const retrieveProducts = async (userText) => {
  try {
    const t = userText.toLowerCase();
    const wantsMale = /\bnam\b|\bmale\b|\bmen\b|đàn ông|dan ong|gentleman/.test(t);
    const wantsFemale = /\bnữ\b|\bnu\b|\bfemale\b|\bwomen\b|\blady\b|phụ nữ|phu nu/.test(t);

    // Detect brand từ tin nhắn khách
    const detectedBrand = detectBrand(t);

    // Detect scent category (dùng SYNONYM_MAP thay vì familyMap cũ)
    const matchedFamily = detectScentCategory(t);

    // Parse khoảng giá nâng cao
    const { minPrice, maxPrice } = parsePrice(t);

    // Detect volume
    const detectedVolume = detectVolume(t);

    const productType = detectProductType(t);
    const query = { isActive: true };

    const wantHot = /\bhot\b|bán chạy|ban chay|\bbest\b|phổ biến|pho bien|được yêu thích|nổi bật/.test(t);
    const wantNew = /mới về|moi ve|mới nhất|moi nhat/.test(t);
    const wantSale = /sale|giảm giá|giam gia|khuyến mãi|khuyen mai|voucher/.test(t);

    // Đếm số filter để quyết định limit
    let filterCount = 0;

    // ⚡ Thêm filter brand nếu khách hỏi cụ thể 1 thương hiệu
    if (detectedBrand) { query.brand = detectedBrand; filterCount++; }
    if (wantHot) { query.isBestSeller = true; filterCount++; }
    if (wantNew) { query.isNewArrival = true; filterCount++; }
    if (wantSale) { query.isSale = true; filterCount++; }

    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = minPrice;
      if (maxPrice) query.price.$lte = maxPrice;
      filterCount++;
    }

    if (wantsMale && !wantsFemale) { query.gender = { $in: ['Nam', 'Unisex'] }; filterCount++; }
    if (wantsFemale && !wantsMale) { query.gender = { $in: ['Nu', 'Unisex'] }; filterCount++; }
    if (matchedFamily) { query.scentCategory = matchedFamily; filterCount++; }
    if (productType) { query.type = productType; filterCount++; }

    // Volume filter: tìm sản phẩm có volume.ml matching
    if (detectedVolume) {
      query['volumes.ml'] = detectedVolume;
      filterCount++;
    }

    // Tăng limit khi có nhiều filter cụ thể (Bước 2)
    const limit = filterCount >= 2 ? 8 : 5;

    let products = await Product.find(query)
      .sort({ isHot: -1, isBestSeller: -1, isNewArrival: -1, rating: -1 })
      .limit(limit)
      .lean();

    // Fallback: nếu không tìm thấy, nới lỏng filter nhưng GIỮ NGUYÊN brand
    if (products.length === 0 && detectedBrand) {
      products = await Product.find({ isActive: true, brand: detectedBrand })
        .sort({ rating: -1 })
        .limit(limit)
        .lean();
    }

    // ❌ BỎ fallback cuối — nếu không match thì trả [] để AI nói "không tìm thấy"
    return products;
  } catch (error) {
    console.error('Error retrieving products:', error);
    return [];
  }
};

// ========== PRODUCT FORMATTING ==========

const buildProductContext = (products) => {
  if (!products || products.length === 0) return '';

  const productList = products
    .map((p, i) => {
      let price;
      let originalPrice = '';

      if (p.type === 'Chiết' && p.volumes && p.volumes.length > 0) {
        price = p.volumes[0].salePrice || p.volumes[0].price;
        originalPrice =
          p.volumes[0].price > price
            ? ` (giá gốc ${p.volumes[0].price.toLocaleString('vi-VN')}₫)`
            : '';
      } else {
        price = p.salePrice || p.price;
        originalPrice =
          p.price > price ? ` (giá gốc ${p.price.toLocaleString('vi-VN')}₫)` : '';
      }

      const volumeInfo = p.volumes && p.volumes.length > 0 ? p.volumes[0] : null;
      const volume = volumeInfo ? volumeInfo.label || `${volumeInfo.ml}ml` : null;
      const stockInfo =
        typeof p.stock === 'number' ? (p.stock > 0 ? 'còn hàng' : 'hết hàng') : '';

      return `${i + 1}. **${p.name}** — ${p.brand}${volume ? `, ${volume}` : ''} — ${price.toLocaleString('vi-VN')}₫${originalPrice}${stockInfo ? ` — ${stockInfo}` : ''}${p.scentNotes && p.scentNotes.length > 0
          ? ` — Notes: ${p.scentNotes.slice(0, 4).join(', ')}`
          : ''
        }`;
    })
    .join('\n');

  return `\n\n[DỮ LIỆU SẢN PHẨM TỪ DATABASE — dùng thông tin này để tư vấn, không bịa thêm]:\n${productList}`;
};

const trimHistory = (messages, maxTurns = 12) => {
  if (!Array.isArray(messages)) return [];
  return messages.slice(-maxTurns);
};

// ========== CIRCUIT BREAKER & RETRY ==========

let cachedModel = null;
let cachedModelAt = 0;
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
let circuitOpenUntil = 0;

const isCircuitOpen = () => Date.now() < circuitOpenUntil;

const markCircuitOpen = (durationMs = 5 * 60 * 1000) => {
  circuitOpenUntil = Date.now() + durationMs;
};

const isRetryableAIError = (error) => {
  if (error?.status === 503) return false;

  const retryableStatuses = [429, 500, 502, 504];
  if (retryableStatuses.includes(error?.status)) return true;

  const message = (error?.message || '').toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('overloaded') ||
    message.includes('rate limit')
  );
};

const resolveAvailableModel = async (client, preferredModel) => {
  const now = Date.now();
  if (cachedModel && now - cachedModelAt < MODEL_CACHE_TTL_MS) {
    return cachedModel;
  }

  try {
    const listed = await client.models.list();
    const available = (listed?.data || []).map((item) => item.id).filter(Boolean);

    if (available.length === 0) {
      return preferredModel;
    }

    const resolved = available.includes(preferredModel) ? preferredModel : available[0];
    cachedModel = resolved;
    cachedModelAt = now;
    return resolved;
  } catch (error) {
    console.warn('Could not list AI models, using configured model:', error.message);
    return preferredModel;
  }
};

const callChatCompletionWithRetry = async (client, requestPayload, model, maxRetries = 1) => {
  const baseDelayMs = 1000;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await client.chat.completions.create({ ...requestPayload, model });
    } catch (error) {
      lastError = error;

      if (error?.status === 503) {
        cachedModel = null;
        cachedModelAt = 0;
        markCircuitOpen();
        console.warn(`Model ${model} unavailable (503) — circuit breaker ON, no retry`);
        throw error;
      }

      if (!isRetryableAIError(error) || attempt > maxRetries) {
        throw error;
      }

      console.warn(
        `Model ${model} error (${error.status || 'unknown'}), retry ${attempt}/${maxRetries} in ${baseDelayMs}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs));
    }
  }

  throw lastError || new Error('AI model is unavailable');
};

// ========== FALLBACK RESPONSES ==========

const buildFallbackResult = (intent, products, lastUserMessage, startTime) => {
  const fallback = buildLocalFallbackResponse(intent, products, lastUserMessage);
  return {
    text: fallback.text,
    products: fallback.products,
    intent,
    latency: Date.now() - startTime,
    source: 'fallback',
  };
};

const formatProductsForClient = (products) => {
  if (!products || products.length === 0) return [];

  return products.map((p) => {
    let price;
    let originalPrice = null;

    if (p.type === 'Chiết' && p.volumes && p.volumes.length > 0) {
      price = p.volumes[0].salePrice || p.volumes[0].price;
      originalPrice = p.volumes[0].price > price ? p.volumes[0].price : null;
    } else {
      price = p.salePrice || p.price;
      originalPrice = p.price > price ? p.price : null;
    }

    return {
      _id: p._id,
      name: p.name,
      brand: p.brand,
      images: p.images,
      price,
      originalPrice,
    };
  });
};

const buildLocalFallbackResponse = (intent, products, lastUserMessage) => {
  const formattedProducts = formatProductsForClient(products);

  if (intent === 'product' && formattedProducts.length > 0) {
    const list = formattedProducts
      .slice(0, 3)
      .map((p, i) => {
        const priceText = `${p.price.toLocaleString('vi-VN')}₫`;
        const saleText =
          p.originalPrice && p.originalPrice > p.price
            ? ` (giá gốc ${p.originalPrice.toLocaleString('vi-VN')}₫)`
            : '';
        return `${i + 1}. **${p.name}** — ${p.brand} — ${priceText}${saleText}`;
      })
      .join('\n');

    return {
      text:
        `Anh/chị tham khảo mấy mùi này nhé:\n\n${list}\n\n` +
        'Bấm vào sản phẩm bên dưới để xem chi tiết, hoặc cho mình biết thêm sở thích để tư vấn kỹ hơn!',
      products: formattedProducts.slice(0, 3),
    };
  }

  if (intent === 'product' && formattedProducts.length === 0) {
    return {
      text:
        'Hiện mình chưa tìm thấy sản phẩm phù hợp. Anh/chị cho mình biết thêm sở thích (nam/nữ, ngân sách, nhóm hương) để mình tìm lại nhé!',
      products: [],
    };
  }

  if (intent === 'order') {
    return {
      text:
        'Để kiểm tra đơn hàng, anh/chị đăng nhập và vào mục **Đơn hàng của tôi** trên website nhé. ' +
        'Cần hỗ trợ gấp thì liên hệ hotline hoặc fanpage Aventis ạ.',
      products: [],
    };
  }

  // General greeting / catch-all
  return {
    text:
      'Chào anh/chị! Mình là Aven — chuyên viên tư vấn nước hoa của Aventis. ' +
      'Anh/chị đang tìm mùi hương cho dịp nào — đi làm, hẹn hò hay dùng hằng ngày?',
    products: [],
  };
};

// ========== MAIN EXPORT ==========

export const generateAIResponse = async (messages) => {
  const startTime = Date.now();
  const chatConfig = loadConfig();
  const systemPrompt = loadSystemPrompt();

  if (!chatConfig?.api_key) {
    throw new Error('AI chat config or API key not found');
  }

  const lastUserMessage =
    [...(messages || [])].reverse().find((m) => m.role === 'user')?.content || '';

  const intent = detectIntent(lastUserMessage);

  if (isCircuitOpen()) {
    const remainingSec = Math.ceil((circuitOpenUntil - Date.now()) / 1000);
    console.log(`Circuit breaker active (${remainingSec}s left) — instant fallback, no API call`);
    const products =
      intent === 'product' ? await retrieveProducts(lastUserMessage) : [];
    return buildFallbackResult(intent, products, lastUserMessage, startTime);
  }

  let products = [];
  let productContext = '';

  // Bước 1: CHỈ lấy sản phẩm khi intent = 'product'
  // general/order → products = [], AI chat tự nhiên không ép bán hàng
  if (intent === 'product') {
    products = await retrieveProducts(lastUserMessage);
  }
  // intent === 'general' hoặc 'order' → products giữ nguyên []
  productContext = buildProductContext(products);

  const finalSystemPrompt =
    systemPrompt +
    (chatConfig.language ? `\n\nNgôn ngữ trả lời bắt buộc: ${chatConfig.language}` : '') +
    productContext;

  const trimmedMessages = trimHistory(messages, 12);

  const client = new OpenAI({
    apiKey: chatConfig.api_key,
    baseURL: chatConfig.base_url,
    timeout: chatConfig.ai_timeout_ms || 30000,
  });

  const requestPayload = {
    messages: [{ role: 'system', content: finalSystemPrompt }, ...trimmedMessages],
    max_tokens: 600,
    temperature: 0.5,
    top_p: 0.9,
    presence_penalty: 0.4,
    frequency_penalty: 0.6,
  };

  try {
    const model = await resolveAvailableModel(client, chatConfig.model);
    const response = await callChatCompletionWithRetry(
      client,
      requestPayload,
      model,
      chatConfig.max_retries ?? 0
    );

    const text =
      response.choices?.[0]?.message?.content ||
      'Xin lỗi anh/chị, mình chưa phản hồi được. Anh/chị thử lại hoặc nhắn fanpage giúp mình nhé.';

    return {
      text,
      products: formatProductsForClient(products),
      intent,
      latency: Date.now() - startTime,
      source: 'ai',
    };
  } catch (error) {
    console.error('AI API failed, using local fallback:', {
      message: error.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
    });
    return buildFallbackResult(intent, products, lastUserMessage, startTime);
  }
};